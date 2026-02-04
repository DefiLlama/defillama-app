import { Agent } from 'http'
import { Agent as HttpsAgent } from 'https'

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
export type FetchWithPoolingOnServerOptions = RequestInit & { timeout?: number }

export const fetchWithPoolingOnServer = async (
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions
): Promise<Response> => {
	const isServer = typeof window === 'undefined'
	const controller = new AbortController()
	const timeout = options?.timeout ?? 60_000
	const id = setTimeout(() => controller.abort(), timeout)

	try {
		const response =
			isServer && typeof url === 'string'
				? await fetchWithConnectionPooling(url, { ...options, signal: controller.signal })
				: await fetch(url, { ...options, signal: controller.signal })
		return response
	} finally {
		clearTimeout(id)
	}
}
