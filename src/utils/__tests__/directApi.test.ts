import { afterEach, describe, expect, it, vi } from 'vitest'
import { DIRECT_AUTH_SECRET_ENV_NAMES, DIRECT_URL_ENV_NAMES, getDirectUrlEnv, withDirectApiAuth } from '../directApi'

function stubDirectEnv(env: Record<string, string | undefined>) {
	for (const key of DIRECT_URL_ENV_NAMES) {
		vi.stubEnv(key, '')
	}
	for (const key of DIRECT_AUTH_SECRET_ENV_NAMES) {
		vi.stubEnv(key, '')
	}

	for (const [key, value] of Object.entries(env)) {
		vi.stubEnv(key, value ?? '')
	}
}

function asUrl(input: RequestInfo | URL): URL {
	if (input instanceof URL) return input
	if (typeof input === 'string') return new URL(input)
	if (input instanceof Request) return new URL(input.url)
	throw new Error('unexpected input')
}

describe('direct API helpers', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('normalizes direct URL env values and treats whitespace-only values as missing', () => {
		stubDirectEnv({
			DATASETS_SERVER_URL: '   ',
			SERVER_URL: ' https://core.example.com/api/// '
		})

		expect(getDirectUrlEnv('DATASETS_SERVER_URL')).toBeUndefined()
		expect(getDirectUrlEnv('SERVER_URL')).toBe('https://core.example.com/api')
	})

	it('chooses the most specific same-origin auth base', () => {
		stubDirectEnv({
			API2_SECRET_KEY: 'core-secret',
			EQUITIES_SECRET_KEY: 'equities-secret',
			EQUITIES_SERVER_URL: 'https://api.example.com/equities/v1',
			SERVER_URL: 'https://api.example.com'
		})

		const url = asUrl(withDirectApiAuth('https://api.example.com/equities/v1/companies?zz=16'))

		expect(url.searchParams.get('x-llama-equity-secret')).toBe('equities-secret')
		expect(url.searchParams.get('x-llama-pro-key')).toBeNull()
		expect(url.searchParams.get('zz')).toBe('16')
	})

	it('falls back from the equities secret to the core API secret', () => {
		stubDirectEnv({
			API2_SECRET_KEY: 'core-secret',
			EQUITIES_SERVER_URL: 'https://equities.example.com/v1'
		})

		const url = asUrl(withDirectApiAuth('https://equities.example.com/v1/companies?zz=16'))

		expect(url.searchParams.get('x-llama-equity-secret')).toBe('core-secret')
	})

	it('handles URL inputs and replaces an existing direct auth query param', () => {
		stubDirectEnv({
			API2_SECRET_KEY: 'fresh-secret',
			SERVER_URL: 'https://core.example.com/api'
		})

		const input = new URL('https://core.example.com/api/config?x-llama-pro-key=old-secret&zz=16')
		const output = withDirectApiAuth(input)

		expect(output).toBeInstanceOf(URL)
		expect(asUrl(output).searchParams.get('x-llama-pro-key')).toBe('fresh-secret')
		expect(asUrl(output).searchParams.get('zz')).toBe('16')
	})

	it('handles Request inputs without dropping request metadata', async () => {
		stubDirectEnv({
			LIQUIDATIONS_SECRET_KEY: 'liquidations-secret',
			LIQUIDATIONS_SERVER_URL_V2: 'https://liquidations.example.com'
		})

		const input = new Request('https://liquidations.example.com/all?zz=16', {
			headers: { 'x-test': '1' },
			method: 'POST',
			body: 'body'
		})
		const output = withDirectApiAuth(input)

		expect(output).toBeInstanceOf(Request)
		expect((output as Request).method).toBe('POST')
		expect((output as Request).headers.get('x-test')).toBe('1')
		expect(asUrl(output).searchParams.get('x-llama-secret')).toBe('liquidations-secret')
		await expect((output as Request).text()).resolves.toBe('body')
	})

	it('leaves invalid, relative, and unconfigured URLs unchanged', () => {
		stubDirectEnv({
			API2_SECRET_KEY: 'core-secret',
			SERVER_URL: 'https://core.example.com/api'
		})

		expect(withDirectApiAuth('/api/local')).toBe('/api/local')
		expect(withDirectApiAuth('not a url')).toBe('not a url')
		expect(withDirectApiAuth('https://datasets.example.com/tokenlist/sorted.json?zz=16')).toBe(
			'https://datasets.example.com/tokenlist/sorted.json?zz=16'
		)
	})

	it('leaves configured direct URLs unchanged when the matching backend secret is missing', () => {
		stubDirectEnv({
			SERVER_URL: 'https://core.example.com/api'
		})

		expect(withDirectApiAuth('https://core.example.com/api/config?zz=16')).toBe(
			'https://core.example.com/api/config?zz=16'
		)
	})
})
