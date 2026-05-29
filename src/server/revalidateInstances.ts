import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

type FetchLike = typeof fetch

export type InstanceRevalidateResult =
	| {
			instance: string
			status: 'revalidated'
			revalidated: string[]
			revalidateErrors: { path: string; reason: string }[]
	  }
	| { instance: string; status: 'failed'; reason: string }

export type RevalidateFanoutResult = {
	status: 'disabled' | 'fanned-out'
	instances: InstanceRevalidateResult[]
}

type AssertFanoutOptions = {
	env?: NodeJS.ProcessEnv
	requireConfigured?: boolean
}

type FanoutOptions = {
	env?: NodeJS.ProcessEnv
	fetchImpl?: FetchLike
	logger?: Pick<Console, 'log'>
	timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 4000
const WORKER_PATH = '/api/private/revalidate-instances'

export function normalizeCachePath(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) return null
	const path = trimmed.split('#')[0]?.split('?')[0] ?? ''
	return path.startsWith('/') ? path : null
}

export function normalizeCachePaths(values: unknown): string[] {
	const input = Array.isArray(values) ? values : []
	const paths = new Set<string>()
	for (const value of input) {
		const path = normalizeCachePath(value)
		if (path) paths.add(path)
	}
	return Array.from(paths).slice(0, 50)
}

export function revalidateInstancesFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
	const raw = env.REVALIDATE_INSTANCES ?? ''
	const instances = new Set<string>()
	for (const entry of raw.split(',')) {
		const base = entry.trim().replace(/\/$/, '')
		if (base) instances.add(base)
	}
	return Array.from(instances)
}

function revalidateHostHeaderFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
	const raw = env.REVALIDATE_HOST_HEADER?.trim()
	return raw || null
}

export function assertRevalidateFanoutSucceeded(
	result: RevalidateFanoutResult,
	paths: string[],
	{ env = process.env, requireConfigured = env.NODE_ENV === 'production' }: AssertFanoutOptions = {}
): void {
	if (normalizeCachePaths(paths).length === 0) return

	if (result.status === 'disabled') {
		if (requireConfigured) {
			throw new Error('Cross-instance revalidation is not configured')
		}
		return
	}

	const failures: InstanceRevalidateResult[] = []
	for (const instance of result.instances) {
		if (instance.status === 'failed' || instance.revalidateErrors.length > 0) {
			failures.push(instance)
		}
	}

	if (failures.length > 0) {
		throw new Error(`Cross-instance revalidation failed: ${JSON.stringify(failures)}`)
	}
}

async function revalidateWithFetch(url: string, body: string, secret: string, fetchImpl: FetchLike, timeoutMs: number) {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	try {
		return await fetchImpl(url, {
			body,
			headers: {
				'Content-Type': 'application/json',
				'x-revalidate-secret': secret
			},
			method: 'POST',
			signal: controller.signal
		})
	} finally {
		clearTimeout(timer)
	}
}

async function revalidateWithHostHeader(
	url: string,
	body: string,
	secret: string,
	hostHeader: string,
	timeoutMs: number
) {
	return new Promise<Response>((resolve, reject) => {
		const parsed = new URL(url)
		const request = parsed.protocol === 'https:' ? httpsRequest : httpRequest
		const req = request(
			parsed,
			{
				headers: {
					'Content-Length': Buffer.byteLength(body),
					'Content-Type': 'application/json',
					Host: hostHeader,
					'x-revalidate-secret': secret
				},
				method: 'POST',
				timeout: timeoutMs
			},
			(res) => {
				const chunks: Buffer[] = []
				res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
				res.on('end', () => {
					resolve(
						new Response(Buffer.concat(chunks), {
							status: res.statusCode ?? 500,
							statusText: res.statusMessage
						})
					)
				})
			}
		)
		req.on('timeout', () => req.destroy(new Error('aborted')))
		req.on('error', reject)
		req.end(body)
	})
}

async function revalidateOneInstance(
	instance: string,
	paths: string[],
	secret: string,
	{
		fetchImpl,
		hostHeader,
		logger,
		timeoutMs
	}: Required<Pick<FanoutOptions, 'fetchImpl' | 'logger' | 'timeoutMs'>> & { hostHeader: string | null }
): Promise<InstanceRevalidateResult> {
	const url = `${instance}${WORKER_PATH}`
	const body = JSON.stringify({ paths })
	try {
		const response = hostHeader
			? await revalidateWithHostHeader(url, body, secret, hostHeader, timeoutMs)
			: await revalidateWithFetch(url, body, secret, fetchImpl, timeoutMs)

		if (!response.ok) {
			const responseBody = await response.text().catch(() => '')
			const reason = responseBody || response.statusText || `HTTP ${response.status}`
			logger.log(`Revalidate fanout to ${instance} failed: ${reason}`)
			return { instance, reason, status: 'failed' }
		}

		const data = (await response.json().catch(() => null)) as {
			revalidated?: string[]
			revalidateErrors?: { path: string; reason: string }[]
		} | null

		return {
			instance,
			revalidateErrors: data?.revalidateErrors ?? [],
			revalidated: data?.revalidated ?? [],
			status: 'revalidated'
		}
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error)
		logger.log(`Revalidate fanout to ${instance} failed: ${reason}`)
		return { instance, reason, status: 'failed' }
	}
}

export async function fanoutRevalidate(
	paths: string[],
	{ env = process.env, fetchImpl = fetch, logger = console, timeoutMs = DEFAULT_TIMEOUT_MS }: FanoutOptions = {}
): Promise<RevalidateFanoutResult> {
	const secret = env.REVALIDATE_SECRET
	const instances = revalidateInstancesFromEnv(env)
	const hostHeader = revalidateHostHeaderFromEnv(env)
	const normalized = normalizeCachePaths(paths)

	if (!secret || instances.length === 0 || normalized.length === 0) {
		return { instances: [], status: 'disabled' }
	}

	const results = await Promise.all(
		instances.map((instance) =>
			revalidateOneInstance(instance, normalized, secret, { fetchImpl, hostHeader, logger, timeoutMs })
		)
	)

	return { instances: results, status: 'fanned-out' }
}
