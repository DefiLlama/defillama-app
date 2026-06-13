import type { ApiResult } from './types'

export function ok(body: unknown, headers?: Record<string, string>): ApiResult {
	return { status: 200, body, ...(headers ? { headers } : null) }
}

export function badRequest(error: string, extra?: Record<string, unknown>): ApiResult {
	return { status: 400, body: { error, ...extra } }
}

export function notFound(error: string): ApiResult {
	return { status: 404, body: { error } }
}

/**
 * Upstream dependency failed or returned garbage. 502 (not 500) so origin
 * failures are distinguishable from handler bugs in telemetry and at the LB,
 * and so CDNs never cache them.
 */
export function upstreamError(error = 'Failed to fetch upstream data'): ApiResult {
	return { status: 502, body: { error } }
}
