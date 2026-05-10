import { getErrorMessage } from '~/utils/error'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { sanitizeDefiLlamaProApiUrl, sanitizeResponseTextForError } from '~/utils/http-error-format'

const DEFAULT_METADATA_FETCH_TIMEOUT_MS = 180_000

export function getMetadataFetchTimeoutMs(): number {
	const raw = process.env.METADATA_FETCH_TIMEOUT_MS
	if (raw == null) return DEFAULT_METADATA_FETCH_TIMEOUT_MS

	const parsed = Number(raw)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_METADATA_FETCH_TIMEOUT_MS
}

export async function fetchMetadataJson<T>(url: string): Promise<T> {
	const res = await fetchWithPoolingOnServer(url, { timeout: getMetadataFetchTimeoutMs() })
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
