import { getErrorMessage } from '~/utils/error'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { sanitizeDefiLlamaProApiUrl, sanitizeResponseTextForError } from '~/utils/http-error-format'
export { getMetadataFetchTimeoutMs } from './config'
import { getMetadataFetchTimeoutMs } from './config'

export async function fetchMetadataJson<T>(url: string, options?: RequestInit): Promise<T> {
	const res = await fetchWithPoolingOnServer(url, { ...options, timeout: getMetadataFetchTimeoutMs() })
	const body = await res.text()
	const contentType = res.headers.get('content-type') ?? 'unknown'
	const urlToLog = sanitizeDefiLlamaProApiUrl(url)
	if (!res.ok) {
		throw new Error(
			`Metadata request failed for URL: ${urlToLog} (status ${res.status}). Body preview: "${sanitizeResponseTextForError(body)}"`
		)
	}

	try {
		return JSON.parse(body) as T
	} catch (error) {
		throw new Error(
			`Failed to parse JSON for URL: ${urlToLog} (status ${res.status}, content-type ${contentType}). Body preview: "${sanitizeResponseTextForError(
				body
			)}". Original error: ${getErrorMessage(error)}`
		)
	}
}
