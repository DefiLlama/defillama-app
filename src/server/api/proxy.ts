import { fetchJson } from '~/utils/async'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { cachedResult } from './resultCache'
import { badRequest, ok, upstreamError } from './respond'
import type { ApiRequest, ApiResult, ApiRouteDefinition } from './types'

const DEFAULT_UPSTREAM_TIMEOUT_MS = 30_000

export type ProxyJsonRouteOptions = {
	route: string
	cacheControl: string
	/**
	 * Returns the upstream URL for this request, or an ApiResult to short-
	 * circuit (e.g. a 400 for invalid params). Return null when a required
	 * upstream base env var is missing.
	 */
	upstreamUrl: (req: ApiRequest) => string | null | ApiResult
	timeoutMs?: number
	/**
	 * Memoize upstream responses in-process, keyed by upstream URL, so
	 * concurrent and repeated identical requests reuse one fetch+parse.
	 */
	resultTtlMs?: number
	/** Reshape the upstream payload before responding. Runs inside the result cache. */
	transform?: (payload: unknown, req: ApiRequest) => unknown
}

function isApiResult(value: unknown): value is ApiResult {
	return typeof value === 'object' && value !== null && 'status' in value && 'body' in value
}

/**
 * Standard JSON passthrough route: validate → fetch upstream → respond.
 * Covers the common proxy shape so individual routes only describe their
 * upstream URL and cache policy.
 */
export function proxyJsonRoute(options: ProxyJsonRouteOptions): ApiRouteDefinition {
	return {
		route: options.route,
		cacheControl: options.cacheControl,
		handle: async (req) => {
			const upstream = options.upstreamUrl(req)
			if (upstream === null) return upstreamError('Upstream is not configured')
			if (isApiResult(upstream)) return upstream

			const fetchAndTransform = async () => {
				const payload = await fetchJson(upstream, { timeout: options.timeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS })
				return options.transform ? options.transform(payload, req) : payload
			}

			try {
				const body = options.resultTtlMs
					? await cachedResult(options.route, upstream, { ttlMs: options.resultTtlMs, ttlJitter: 0.2 }, fetchAndTransform)
					: await fetchAndTransform()
				return ok(body)
			} catch (error) {
				recordRouteRuntimeError(error, 'apiRoute')
				return upstreamError()
			}
		}
	}
}

export { badRequest, ok, upstreamError }
