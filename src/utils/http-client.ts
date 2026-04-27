const agentOptions = {
	keepAlive: true,
	keepAliveMsecs: 1000,
	maxSockets: 50,
	maxFreeSockets: 10,
	timeout: 60000
}

type AgentLike = {
	destroy(): void
}

type AgentConstructor = new (options: typeof agentOptions) => AgentLike

let httpAgentState: { httpAgent: AgentLike; httpsAgent: AgentLike } | null = null
let cleanupRegistered = false

type AsyncLocalStorageLike<T> = {
	run<R>(store: T, callback: () => R): R
	getStore(): T | undefined
}

let pageBuildSignalStorage: AsyncLocalStorageLike<AbortSignal> | null = null

async function getPageBuildSignalStorage(): Promise<AsyncLocalStorageLike<AbortSignal>> {
	if (pageBuildSignalStorage) return pageBuildSignalStorage

	const { AsyncLocalStorage } = await import(/* webpackIgnore: true */ 'async_hooks')
	pageBuildSignalStorage = new AsyncLocalStorage<AbortSignal>()
	return pageBuildSignalStorage
}

async function getHttpAgentState(): Promise<{ httpAgent: AgentLike; httpsAgent: AgentLike }> {
	if (httpAgentState) return httpAgentState

	const [httpModule, httpsModule] = await Promise.all([
		import(/* webpackIgnore: true */ 'http'),
		import(/* webpackIgnore: true */ 'https')
	])
	const HttpAgent = httpModule.Agent as AgentConstructor
	const HttpsAgent = httpsModule.Agent as AgentConstructor

	httpAgentState = {
		httpAgent: new HttpAgent(agentOptions),
		httpsAgent: new HttpsAgent(agentOptions)
	}

	if (!cleanupRegistered && typeof process !== 'undefined' && typeof process.on === 'function') {
		cleanupRegistered = true
		process.on('SIGTERM', cleanupHttpAgents)
		process.on('SIGINT', cleanupHttpAgents)
	}

	return httpAgentState
}

export async function withPageBuildSignal<T>(signal: AbortSignal, callback: () => Promise<T>): Promise<T> {
	const storage = await getPageBuildSignalStorage()
	return storage.run(signal, callback)
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
	const { httpAgent, httpsAgent } = await getHttpAgentState()
	const agent = urlObj.protocol === 'https:' ? httpsAgent : httpAgent

	return fetch(url, {
		...options,
		// @ts-expect-error - Node.js fetch supports agent
		agent
	})
}

// Cleanup function for process termination
const cleanupHttpAgents = () => {
	httpAgentState?.httpAgent.destroy()
	httpAgentState?.httpsAgent.destroy()
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
	const activePageBuildSignalStorage = isServer ? await getPageBuildSignalStorage() : null
	const cleanupPageBuildSignal = abortWithSignal(controller, activePageBuildSignalStorage?.getStore())

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
