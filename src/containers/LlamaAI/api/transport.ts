import { AI_SERVER } from '~/constants'

export type AuthorizedFetch = (url: string, options?: RequestInit, onlyToken?: boolean) => Promise<Response | null>

export type LlamaAIRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
	headers?: HeadersInit
	body?: BodyInit | null
	json?: unknown
}

export class LlamaAITransportError extends Error {
	status: number
	body: unknown

	constructor(message: string, status: number, body: unknown) {
		super(message)
		this.name = 'LlamaAITransportError'
		this.status = status
		this.body = body
	}
}

async function parseErrorBody(response: Response) {
	const contentType = response.headers.get('content-type') ?? ''
	if (/(^|[/+])json($|;)/i.test(contentType)) {
		return response.json().catch(() => null)
	}
	return response.text().catch(() => '')
}

function getErrorMessage(body: unknown, fallback: string) {
	if (body && typeof body === 'object') {
		const record = body as { error?: unknown; message?: unknown; content?: unknown }
		if (typeof record.error === 'string') return record.error
		if (typeof record.message === 'string') return record.message
		if (typeof record.content === 'string') return record.content
	}
	if (typeof body === 'string' && body) return body
	return fallback
}

function headersToRecord(headers: Headers) {
	const record: Record<string, string> = {}
	headers.forEach((value, key) => {
		record[key] = value
	})
	return record
}

export async function llamaAIRequest<T>(
	authorizedFetch: AuthorizedFetch,
	path: string,
	options: LlamaAIRequestOptions = {}
): Promise<T> {
	const { json, body: rawBody, headers: rawHeaders, ...init } = options
	const headers = new Headers(rawHeaders)
	let body = rawBody
	if (json !== undefined) {
		headers.set('Content-Type', 'application/json')
		body = JSON.stringify(json)
	}

	const url = path.startsWith('http') ? path : `${AI_SERVER}${path}`
	const response = await authorizedFetch(url, { ...init, headers: headersToRecord(headers), body })
	if (!response) {
		// Auth can fail before the network request is made; expose it as the same
		// typed transport error shape as backend failures.
		throw new LlamaAITransportError('unauthenticated', 401, { error: 'unauthenticated' })
	}
	if (!response.ok) {
		const parsedBody = await parseErrorBody(response)
		throw new LlamaAITransportError(getErrorMessage(parsedBody, response.statusText), response.status, parsedBody)
	}
	const contentLength = response.headers.get('content-length')
	if (response.status === 204 || contentLength === '0') {
		return null as T
	}

	const contentType = response.headers.get('content-type') ?? ''
	const text = await response.text().catch(() => '')
	if (!text) {
		return null as T
	}
	if (!/(^|[/+])json($|;)/i.test(contentType)) {
		// Endpoint wrappers expect parsed DTOs; fail loudly if a proxy/login page
		// or plain-text response reaches this shared JSON transport.
		throw new Error(
			`Unexpected LlamaAI response content type: status=${response.status}, content-type=${contentType || 'missing'}${
				text ? `, body=${text.slice(0, 200)}` : ''
			}`
		)
	}

	return JSON.parse(text) as T
}
