import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	looksLikeHtmlDocument,
	previewResponseBody,
	redactApiKeyFromUrl,
	sanitizeDefiLlamaProApiUrl,
	sanitizeResponseTextForError
} from '../http-error-format'

describe('HTTP error formatting', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('detects HTML error pages and hides their body', () => {
		expect(looksLikeHtmlDocument('<!doctype html><html><head></head></html>')).toBe(true)
		expect(sanitizeResponseTextForError('<html><head></head><body>Cloudflare</body></html>')).toBe('[html error page]')
	})

	it('previews and truncates response text for logs', () => {
		expect(previewResponseBody('  hello\n\nworld  ')).toBe('hello world')
		expect(sanitizeResponseTextForError('x'.repeat(510))).toBe(`${'x'.repeat(500)}…`)
	})

	it('redacts configured API keys from URLs', () => {
		vi.stubEnv('API_KEY', 'secret-key')

		expect(redactApiKeyFromUrl('https://pro-api.llama.fi/secret-key/api/test')).toBe(
			'https://pro-api.llama.fi/[REDACTED]/api/test'
		)
	})

	it('normalizes DefiLlama pro API paths without exposing key segments', () => {
		expect(sanitizeDefiLlamaProApiUrl('https://pro-api.llama.fi/secret/api/config?x=1')).toBe('/config?x=1')
		expect(sanitizeDefiLlamaProApiUrl('https://pro-api.llama.fi/secret/rwa/list')).toBe('/rwa/list')
		expect(sanitizeDefiLlamaProApiUrl('https://api.llama.fi/config/smol')).toBe('/config/smol')
	})
})
