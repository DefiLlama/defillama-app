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

async function revalidateOneInstance(
	instance: string,
	paths: string[],
	secret: string,
	{ fetchImpl, logger, timeoutMs }: Required<Pick<FanoutOptions, 'fetchImpl' | 'logger' | 'timeoutMs'>>
): Promise<InstanceRevalidateResult> {
	const url = `${instance}${WORKER_PATH}`
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	try {
		const response = await fetchImpl(url, {
			body: JSON.stringify({ paths }),
			headers: {
				'Content-Type': 'application/json',
				'x-revalidate-secret': secret
			},
			method: 'POST',
			signal: controller.signal
		})

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			const reason = body || response.statusText || `HTTP ${response.status}`
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
	} finally {
		clearTimeout(timer)
	}
}

export async function fanoutRevalidate(
	paths: string[],
	{ env = process.env, fetchImpl = fetch, logger = console, timeoutMs = DEFAULT_TIMEOUT_MS }: FanoutOptions = {}
): Promise<RevalidateFanoutResult> {
	const secret = env.REVALIDATE_SECRET
	const instances = revalidateInstancesFromEnv(env)
	const normalized = normalizeCachePaths(paths)

	if (!secret || instances.length === 0 || normalized.length === 0) {
		return { instances: [], status: 'disabled' }
	}

	const results = await Promise.all(
		instances.map((instance) => revalidateOneInstance(instance, normalized, secret, { fetchImpl, logger, timeoutMs }))
	)

	return { instances: results, status: 'fanned-out' }
}
