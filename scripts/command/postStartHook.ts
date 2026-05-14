import { setTimeout as delay } from 'node:timers/promises'
import type { LogLike } from './logger'

type Fetch = typeof fetch

type PostStartHookOptions = {
	env?: NodeJS.ProcessEnv
	fetchImpl?: Fetch
	logger?: LogLike
	now?: () => number
	sleep?: (ms: number) => Promise<void>
}

type PostStartHookResult =
	| { reason: string; status: 'skipped' }
	| { attempts: number; status: 'purged' }
	| { reason: string; status: 'failed' }

function parsePositiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number.parseInt(value ?? '', 10)
	return parsed > 0 ? parsed : fallback
}

function getHealthUrl(env: NodeJS.ProcessEnv): string {
	return env.POST_START_HEALTH_URL || `http://127.0.0.1:${env.PORT || '3000'}/`
}

async function waitForHealth({
	env,
	fetchImpl,
	logger,
	now = Date.now,
	sleep = delay
}: Required<Pick<PostStartHookOptions, 'env' | 'fetchImpl' | 'logger'>> &
	Pick<PostStartHookOptions, 'now' | 'sleep'>): Promise<number> {
	const healthUrl = getHealthUrl(env)
	const timeoutMs = parsePositiveInt(env.POST_START_HEALTH_TIMEOUT_MS, 30_000)
	const intervalMs = parsePositiveInt(env.POST_START_HEALTH_INTERVAL_MS, 1_000)
	const startedAt = now()
	let attempts = 0

	while (now() - startedAt <= timeoutMs) {
		attempts += 1
		try {
			const response = await fetchImpl(healthUrl, { method: 'GET' })
			if (response.ok) {
				return attempts
			}
			logger.log(`Post-start health check returned ${response.status}; retrying`)
		} catch (error) {
			logger.log(`Post-start health check failed; retrying: ${error instanceof Error ? error.message : String(error)}`)
		}
		await sleep(intervalMs)
	}

	return 0
}

export async function runPostStartHook({
	env = process.env,
	fetchImpl = fetch,
	logger = console,
	now,
	sleep
}: PostStartHookOptions = {}): Promise<PostStartHookResult> {
	if (!env.CF_ZONE || !env.CF_PURGE_CACHE_AUTH) {
		logger.log('CF_ZONE or CF_PURGE_CACHE_AUTH is not set, skipping purge cache')
		return { reason: 'missing Cloudflare env', status: 'skipped' }
	}

	const attempts = await waitForHealth({ env, fetchImpl, logger, now, sleep })
	if (attempts === 0) {
		logger.log('Post-start health check timed out, skipping purge cache')
		return { reason: 'health check timed out', status: 'skipped' }
	}

	logger.log(`Purging cache for zone ${env.CF_ZONE}`)
	const response = await fetchImpl(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE}/purge_cache`, {
		body: JSON.stringify({ purge_everything: true }),
		headers: {
			Authorization: `Bearer ${env.CF_PURGE_CACHE_AUTH}`,
			'Content-Type': 'application/json'
		},
		method: 'POST'
	})

	if (!response.ok) {
		const body = await response.text()
		logger.log(`Cloudflare purge failed: ${body}`)
		return { reason: body, status: 'failed' }
	}

	return { attempts, status: 'purged' }
}
