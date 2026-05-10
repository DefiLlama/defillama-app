const HTML_PREVIEW_LENGTH = 2048
const ERROR_TEXT_LIMIT = 500

export function looksLikeHtmlDocument(text: string): boolean {
	// We specifically want to catch "Cloudflare HTML error page" type responses.
	const s = text.trimStart().slice(0, HTML_PREVIEW_LENGTH).toLowerCase()
	return s.startsWith('<!doctype html') || s.startsWith('<html') || (s.includes('<head') && s.includes('</html>'))
}

export function previewResponseBody(body: string, length = 200): string {
	return body.replace(/\s+/g, ' ').trim().slice(0, length)
}

export function sanitizeResponseTextForError(text: string): string {
	if (!text) return ''
	if (looksLikeHtmlDocument(text)) return '[html error page]'

	const trimmed = text.trim()
	if (trimmed.length <= ERROR_TEXT_LIMIT) return trimmed
	return `${trimmed.slice(0, ERROR_TEXT_LIMIT)}…`
}

export function redactApiKeyFromUrl(raw: string): string {
	const apiKey = process.env.API_KEY
	return apiKey && raw.includes(apiKey) ? raw.replaceAll(apiKey, '[REDACTED]') : raw
}

export function sanitizeDefiLlamaProApiUrl(inputUrl: string): string {
	try {
		const parsed = new URL(redactApiKeyFromUrl(inputUrl))
		if (parsed.hostname !== 'pro-api.llama.fi') {
			return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/'
		}

		const pathname = parsed.pathname
			.replace(/^\/[^/]+\/api(\/|$)/, '/')
			.replace(/^\/api(\/|$)/, '/')
			.replace(/^\/[^/]+\/rwa(\/|$)/, '/rwa$1')
			.replace(/^\/[^/]+\/rwa-perps(\/|$)/, '/rwa-perps$1')
			.replace(/^\/[^/]+\/bridges(\/|$)/, '/bridges$1')

		return `${pathname}${parsed.search}${parsed.hash}` || '/'
	} catch {
		return redactApiKeyFromUrl(inputUrl)
	}
}
