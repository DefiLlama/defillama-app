import { AsyncLocalStorage } from 'async_hooks'
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

const pageBuildSignalStorage = new AsyncLocalStorage<AbortSignal>()

export function withPageBuildSignal<T>(signal: AbortSignal, callback: () => Promise<T>): Promise<T> {
	return pageBuildSignalStorage.run(signal, callback)
}

function abortWithSignal(controller: AbortController, signal: AbortSignal | undefined): (() => void) | null {
	if (!signal) return null
	if (signal.aborted) {
		controller.abort()
		return null
	}

	const abort = () => controller.abort()
	signal.addEventListener('abort', abort, { once: true })
	return () => signal.removeEventListener('abort', abort)
}

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
	const cleanupOptionSignal = abortWithSignal(controller, options?.signal)
	const cleanupPageBuildSignal = abortWithSignal(controller, pageBuildSignalStorage.getStore())

	try {
		const response =
			isServer && typeof url === 'string'
				? await fetchWithConnectionPooling(url, { ...options, signal: controller.signal })
				: await fetch(url, { ...options, signal: controller.signal })
		return response
	} finally {
		clearTimeout(id)
		cleanupOptionSignal?.()
		cleanupPageBuildSignal?.()
	}
}
