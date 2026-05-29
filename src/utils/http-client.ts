import { withDirectApiAuth } from './directApi'
import { withOutboundTelemetry, type TelemetryAttributes } from './telemetry'

const fetchWithConnectionPooling = async (url: string | URL, options: RequestInit = {}): Promise<Response> => {
	const requestUrl = typeof url === 'string' ? new URL(url) : url
	return fetch(requestUrl.toString(), options)
}

// Fetch with connection pooling and timeout support
export type FetchWithPoolingOnServerOptions = RequestInit & {
	timeout?: number
	telemetry?: {
		attributes?: TelemetryAttributes
		attempt?: number
		maxAttempts?: number
		singleflightRole?: 'leader'
	}
}

export function serverFetchUrl(url: RequestInfo | URL): RequestInfo | URL {
	if (typeof url !== 'string') return url
	if (!url.startsWith('/')) return url

	const base =
		process.env.NEXT_PUBLIC_SITE_URL ||
		process.env.SITE_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
	return new URL(url, base).toString()
}

export const fetchWithPoolingOnServer = async (
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions
): Promise<Response> => {
	const isServer = typeof window === 'undefined'
	const { timeout = 60_000, telemetry: _telemetry, ...requestOptions } = options ?? {}
	const requestUrl = isServer ? serverFetchUrl(url) : url
	const timeoutController = new AbortController()
	const upstreamSignal = requestOptions.signal
	const abortTimeoutController = () => timeoutController.abort()
	const id = setTimeout(abortTimeoutController, timeout)

	if (upstreamSignal?.aborted) {
		timeoutController.abort()
	} else {
		upstreamSignal?.addEventListener('abort', abortTimeoutController)
	}

	try {
		const authenticatedRequestUrl = isServer ? withDirectApiAuth(requestUrl) : requestUrl
		const response = await withOutboundTelemetry(authenticatedRequestUrl, options, () =>
			isServer && typeof authenticatedRequestUrl === 'string'
				? fetchWithConnectionPooling(authenticatedRequestUrl, { ...requestOptions, signal: timeoutController.signal })
				: fetch(authenticatedRequestUrl, { ...requestOptions, signal: timeoutController.signal })
		)
		return response
	} finally {
		clearTimeout(id)
		upstreamSignal?.removeEventListener('abort', abortTimeoutController)
	}
}
