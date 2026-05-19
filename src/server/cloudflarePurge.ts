type FetchLike = typeof fetch

type PurgeCloudflareOptions = {
	env?: NodeJS.ProcessEnv
	fetchImpl?: FetchLike
	logger?: Pick<Console, 'log'>
}

export type CloudflarePurgeResult =
	| { reason: string; status: 'skipped' }
	| { status: 'purged'; urls: string[] }
	| { reason: string; status: 'failed' }

function siteUrlFromEnv(env: NodeJS.ProcessEnv): string {
	return env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || 'https://defillama.com'
}

export function normalizeResearchCachePath(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	if (!trimmed || trimmed.startsWith('//') || trimmed.includes('://')) return null
	const path = trimmed.split('#')[0]?.split('?')[0] ?? ''
	if (path !== '/research' && !path.startsWith('/research/')) return null
	return path
}

export function normalizeResearchCachePaths(values: unknown): string[] {
	const input = Array.isArray(values) ? values : []
	const paths = new Set<string>()
	for (const value of input) {
		const path = normalizeResearchCachePath(value)
		if (path) paths.add(path)
	}
	return Array.from(paths).slice(0, 50)
}

export function researchPathsToUrls(paths: string[], env: NodeJS.ProcessEnv = process.env): string[] {
	const siteUrl = siteUrlFromEnv(env)
	const urls = new Set<string>()
	for (const path of paths) {
		urls.add(new URL(path, siteUrl).toString())
	}
	return Array.from(urls)
}

export async function purgeCloudflareResearchUrls(
	paths: string[],
	{ env = process.env, fetchImpl = fetch, logger = console }: PurgeCloudflareOptions = {}
): Promise<CloudflarePurgeResult> {
	if (!env.CF_ZONE || !env.CF_PURGE_CACHE_AUTH) {
		logger.log('CF_ZONE or CF_PURGE_CACHE_AUTH is not set, skipping research cache purge')
		return { reason: 'missing Cloudflare env', status: 'skipped' }
	}

	const urls = researchPathsToUrls(paths, env)
	if (urls.length === 0) {
		return { reason: 'no urls to purge', status: 'skipped' }
	}

	let response: Response
	try {
		response = await fetchImpl(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE}/purge_cache`, {
			body: JSON.stringify({ files: urls }),
			headers: {
				Authorization: `Bearer ${env.CF_PURGE_CACHE_AUTH}`,
				'Content-Type': 'application/json'
			},
			method: 'POST'
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		logger.log(`Cloudflare research cache purge failed: ${message}`)
		return { reason: message, status: 'failed' }
	}

	if (!response.ok) {
		const body = await response.text()
		logger.log(`Cloudflare research cache purge failed: ${body}`)
		return { reason: body, status: 'failed' }
	}

	return { status: 'purged', urls }
}
