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

// Custom fetch function with connection pooling
export const fetchWithConnectionPooling = async (url: string | URL, options: RequestInit = {}): Promise<Response> => {
	const urlObj = typeof url === 'string' ? new URL(url) : url
	const agent = urlObj.protocol === 'https:' ? httpsAgent : httpAgent

	return fetch(url, {
		...options,
		// @ts-expect-error - Node.js fetch supports agent
		agent
	})
}

// Cleanup function to close connections when shutting down
export const cleanupHttpAgents = () => {
	httpAgent.destroy()
	httpsAgent.destroy()
}

// Handle process termination to clean up connections
if (typeof process !== 'undefined') {
	process.on('SIGTERM', cleanupHttpAgents)
	process.on('SIGINT', cleanupHttpAgents)
}
