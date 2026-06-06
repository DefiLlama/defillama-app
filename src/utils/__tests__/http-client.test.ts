import { afterEach, describe, expect, it, vi } from 'vitest'
import { DIRECT_AUTH_SECRET_ENV_NAMES, DIRECT_URL_ENV_NAMES } from '../directApi'

async function importHttpClientWithEnv(env: Record<string, string | undefined>) {
	vi.resetModules()
	vi.unstubAllEnvs()
	vi.unstubAllGlobals()

	for (const key of DIRECT_URL_ENV_NAMES) {
		vi.stubEnv(key, '')
	}
	for (const key of DIRECT_AUTH_SECRET_ENV_NAMES) {
		vi.stubEnv(key, '')
	}

	for (const [key, value] of Object.entries(env)) {
		if (value == null) {
			vi.stubEnv(key, '')
		} else {
			vi.stubEnv(key, value)
		}
	}

	const fetchMock = vi.fn(async () => new Response('{}'))
	vi.stubGlobal('fetch', fetchMock)
	const { fetchWithPoolingOnServer } = await import('../http-client')
	return { fetchMock, fetchWithPoolingOnServer }
}

function fetchedUrl(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0): URL {
	const call = fetchMock.mock.calls[callIndex]
	if (!call) throw new Error(`missing fetch call ${callIndex}`)
	return new URL(String(call[0]))
}

describe('fetchWithPoolingOnServer direct API auth', () => {
	afterEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('appends the core backend secret to configured direct core API requests', async () => {
		const { fetchMock, fetchWithPoolingOnServer } = await importHttpClientWithEnv({
			API2_SECRET_KEY: 'core-secret',
			SERVER_URL: 'https://core.example.com/api/'
		})

		await fetchWithPoolingOnServer('https://core.example.com/api/config?zz=16')
		await fetchWithPoolingOnServer('https://core.example.com/api/v2/chains')

		const configUrl = fetchedUrl(fetchMock, 0)
		expect(configUrl.searchParams.get('zz')).toBe('16')
		expect(configUrl.searchParams.get('x-llama-pro-key')).toBe('core-secret')

		const v2Url = fetchedUrl(fetchMock, 1)
		expect(v2Url.pathname).toBe('/api/v2/chains')
		expect(v2Url.searchParams.get('x-llama-pro-key')).toBe('core-secret')
	})

	it('appends the core backend secret to URL object direct API requests', async () => {
		const { fetchMock, fetchWithPoolingOnServer } = await importHttpClientWithEnv({
			API2_SECRET_KEY: 'core-secret',
			SERVER_URL: 'https://core.example.com/api'
		})

		await fetchWithPoolingOnServer(new URL('https://core.example.com/api/config?zz=16'))

		const url = fetchedUrl(fetchMock)
		expect(url.searchParams.get('zz')).toBe('16')
		expect(url.searchParams.get('x-llama-pro-key')).toBe('core-secret')
	})

	it('appends direct auth for explicit V2, equities, and liquidations URL overrides', async () => {
		const { fetchMock, fetchWithPoolingOnServer } = await importHttpClientWithEnv({
			API2_SECRET_KEY: 'core-secret',
			EQUITIES_SECRET_KEY: 'equities-secret',
			EQUITIES_SERVER_URL: 'https://equities.example.com/v1/',
			LIQUIDATIONS_SECRET_KEY: 'liquidations-secret',
			LIQUIDATIONS_SERVER_URL_V2: 'https://liquidations.example.com/',
			V2_SERVER_URL: 'https://core-v2.example.com'
		})

		await fetchWithPoolingOnServer('https://core-v2.example.com/chains?chain=ethereum')
		await fetchWithPoolingOnServer('https://equities.example.com/v1/companies?zz=16')
		await fetchWithPoolingOnServer('https://liquidations.example.com/all?zz=16')

		expect(fetchedUrl(fetchMock, 0).searchParams.get('x-llama-pro-key')).toBe('core-secret')
		expect(fetchedUrl(fetchMock, 1).searchParams.get('x-llama-equity-secret')).toBe('equities-secret')
		expect(fetchedUrl(fetchMock, 2).searchParams.get('x-llama-secret')).toBe('liquidations-secret')
	})

	it('uses the most specific direct auth match for same-origin service URLs', async () => {
		const { fetchMock, fetchWithPoolingOnServer } = await importHttpClientWithEnv({
			API2_SECRET_KEY: 'core-secret',
			EQUITIES_SECRET_KEY: 'equities-secret',
			EQUITIES_SERVER_URL: 'https://api.example.com/equities/v1',
			SERVER_URL: 'https://api.example.com'
		})

		await fetchWithPoolingOnServer('https://api.example.com/equities/v1/companies?zz=16')

		const url = fetchedUrl(fetchMock)
		expect(url.searchParams.get('x-llama-equity-secret')).toBe('equities-secret')
		expect(url.searchParams.get('x-llama-pro-key')).toBeNull()
	})

	it('does not append direct auth for pro fallback or unrelated direct server URLs', async () => {
		const { fetchMock, fetchWithPoolingOnServer } = await importHttpClientWithEnv({
			API2_SECRET_KEY: 'core-secret',
			DATASETS_SERVER_URL: 'https://datasets.example.com'
		})

		await fetchWithPoolingOnServer('https://pro-api.llama.fi/pro-key/api/config?zz=16')
		await fetchWithPoolingOnServer('https://datasets.example.com/tokenlist/sorted.json?zz=16')

		expect(fetchedUrl(fetchMock, 0).searchParams.get('x-llama-pro-key')).toBeNull()
		expect(fetchedUrl(fetchMock, 1).searchParams.get('x-llama-pro-key')).toBeNull()
		expect(fetchedUrl(fetchMock, 1).searchParams.get('zz')).toBe('16')
	})

	it('does not append direct auth without a backend secret', async () => {
		const { fetchMock, fetchWithPoolingOnServer } = await importHttpClientWithEnv({
			SERVER_URL: 'https://core.example.com/api'
		})

		await fetchWithPoolingOnServer('https://core.example.com/api/config?zz=16')

		expect(fetchedUrl(fetchMock).searchParams.get('x-llama-pro-key')).toBeNull()
	})
})
