/**
 * Framework-neutral request/response model for API route handlers.
 *
 * Handlers written against these types contain no Next.js imports, so the
 * whole `src/server/api` tree can be lifted into another host (standalone
 * service, TanStack Start, etc.) by writing a new ~50-line adapter next to
 * `nextAdapter.ts`. Only routes that stream (SSE, binary proxies) bypass this
 * model and stay framework-native.
 */

export type ApiQuery = Record<string, string | string[] | undefined>

export type ApiRequest = {
	method: string
	/** Path + query string as received, e.g. `/api/public/charts/chain?chain=base` */
	url: string
	query: ApiQuery
	headers: Record<string, string | string[] | undefined>
	/** Parsed JSON body for POST handlers; undefined for GET. */
	body?: unknown
}

export type ApiResult = {
	status: number
	body: unknown
	headers?: Record<string, string>
}

export type ApiHandler = (req: ApiRequest) => Promise<ApiResult>

export type ApiRouteDefinition = {
	/** Telemetry route name, e.g. `/api/public/charts/chain`. */
	route: string
	/** Allowed methods; requests with other methods get a 405. Default ['GET']. */
	methods?: string[]
	/**
	 * Cache-Control applied to 2xx responses that did not set their own.
	 * Jittered per-URL via jitterCacheControlHeader. Non-2xx responses are
	 * always sent no-store unless the handler set an explicit header.
	 */
	cacheControl?: string
	handle: ApiHandler
}

export function defineApiRoute(definition: ApiRouteDefinition): ApiRouteDefinition {
	return definition
}
