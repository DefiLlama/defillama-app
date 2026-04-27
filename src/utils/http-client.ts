import { Agent } from 'http'
import { Agent as HttpsAgent } from 'https'
import { withOutboundTelemetry } from './telemetry'

// Create reusable HTTP agents for connection pooling
const httpAgent = new Agent({
	keepAlive: true,
	keepAliveMsecs: 1000,
	maxSockets: 50,
	maxFreeSockets: 10,
	timeout: 60000
})

const httpsAgent = new HttpsAgent({
	keepAlive: true,
	keepAliveMsecs: 1000,
	maxSockets: 50,
	maxFreeSockets: 10,
	timeout: 60000
})

// Internal fetch with connection pooling (not exported)
const fetchWithConnectionPooling = async (url: string | URL, options: RequestInit = {}): Promise<Response> => {
	const urlObj = typeof url === 'string' ? new URL(url) : url
	const agent = urlObj.protocol === 'https:' ? httpsAgent : httpAgent

	return fetch(url, {
		...options,
		// @ts-expect-error - Node.js fetch supports agent
		agent
	})
}

// Cleanup function for process termination
const cleanupHttpAgents = () => {
	httpAgent.destroy()
	httpsAgent.destroy()
}

if (typeof process !== 'undefined') {
	process.on('SIGTERM', cleanupHttpAgents)
	process.on('SIGINT', cleanupHttpAgents)
}

// Fetch with connection pooling and timeout support
export type FetchWithPoolingOnServerOptions = RequestInit & {
	timeout?: number
	telemetry?: {
		attempt?: number
		maxAttempts?: number
	}
}

export const fetchWithPoolingOnServer = async (
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions
): Promise<Response> => {
	const isServer = typeof window === 'undefined'
	const { timeout = 60_000, telemetry: _telemetry, ...requestOptions } = options ?? {}
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), timeout)

	try {
		const response = await withOutboundTelemetry(url, options, () =>
			isServer && typeof url === 'string'
				? fetchWithConnectionPooling(url, { ...requestOptions, signal: controller.signal })
				: fetch(url, { ...requestOptions, signal: controller.signal })
		)
		return response
	} finally {
		clearTimeout(id)
	}
}
