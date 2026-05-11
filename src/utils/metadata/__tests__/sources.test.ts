import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchEmissionsProtocolsListMock, fetchWithPoolingOnServerMock } = vi.hoisted(() => ({
	fetchEmissionsProtocolsListMock: vi.fn(),
	fetchWithPoolingOnServerMock: vi.fn()
}))

vi.mock('~/utils/http-client', () => ({
	fetchWithPoolingOnServer: fetchWithPoolingOnServerMock
}))

vi.mock('~/containers/Unlocks/api', () => ({
	fetchEmissionsProtocolsList: fetchEmissionsProtocolsListMock
}))

function jsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), {
		headers: {
			'content-type': 'application/json'
		}
	})
}

function responseForUrl(url: string): unknown {
	if (url.includes('appMetadata-protocols.json')) return { 'parent#aave': { name: 'aave', tvl: true } }
	if (url.includes('appMetadata-chains.json')) return { Ethereum: { name: 'Ethereum', id: 'ethereum' } }
	if (url.includes('appMetadata-categoriesAndTags.json')) {
		return { categories: [], tags: [], tagCategoryMap: {}, configs: {} }
	}
	if (url.endsWith('/cexs?zz=14')) return { cexs: [], cg_volume_cexs: ['binance'] }
	if (url.includes('/rwa/list?zz=14')) {
		return { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} }
	}
	if (url.includes('/rwa-perps/list?zz=14')) {
		return { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 }
	}
	if (url.includes('/tokenlist/sorted.json?zz=14')) return []
	if (url.includes('/config/smol/token.json')) return {}
	if (url.includes('/liquidations/all?zz=14')) return { data: {}, tokens: {}, validThresholds: [], timestamp: 0 }
	if (url.includes('/bridges?includeChains=true')) return { bridges: [], chains: [] }
	throw new Error(`unexpected URL: ${url}`)
}

describe('metadata source adapters', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
		fetchEmissionsProtocolsListMock.mockReset()
		fetchWithPoolingOnServerMock.mockReset()
		fetchWithPoolingOnServerMock.mockImplementation((url: string) => Promise.resolve(jsonResponse(responseForUrl(url))))
		fetchEmissionsProtocolsListMock.mockResolvedValue(['aave'])
	})

	it('fetches metadata sources from expected public URLs with the metadata timeout', async () => {
		vi.stubEnv('API_KEY', '')
		vi.stubEnv('METADATA_FETCH_TIMEOUT_MS', '1234')
		const { fetchCoreMetadataSources } = await import('../sources')

		const sources = await fetchCoreMetadataSources()

		expect(sources.protocols).toEqual({ 'parent#aave': { name: 'aave', tvl: true } })
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith(
			'https://api.llama.fi/config/smol/appMetadata-protocols.json?zz=14',
			{ timeout: 1234 }
		)
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://api.llama.fi/rwa/list?zz=14', { timeout: 1234 })
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith(
			'https://defillama-datasets.llama.fi/tokenlist/sorted.json?zz=14',
			{ timeout: 1234 }
		)
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://api.llama.fi/config/smol/token.json', {
			timeout: 1234
		})
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://bridges.llama.fi/bridges?includeChains=true', {
			timeout: 1234
		})
		expect(fetchEmissionsProtocolsListMock).toHaveBeenCalledWith({ timeout: 1234 })
	})

	it('keeps token directory on the public API when other metadata sources use pro API', async () => {
		vi.stubEnv('API_KEY', 'secret-key')
		const { fetchCoreMetadataSources } = await import('../sources')

		await fetchCoreMetadataSources()

		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith(
			'https://pro-api.llama.fi/secret-key/api/config/smol/appMetadata-protocols.json?zz=14',
			{ timeout: 180_000 }
		)
		expect(fetchWithPoolingOnServerMock).toHaveBeenCalledWith('https://api.llama.fi/config/smol/token.json', {
			timeout: 180_000
		})
		expect(fetchWithPoolingOnServerMock).not.toHaveBeenCalledWith(
			'https://pro-api.llama.fi/secret-key/api/config/smol/token.json',
			expect.anything()
		)
	})

	it('logs the named metadata source when an upstream request fails', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		fetchWithPoolingOnServerMock.mockImplementation((url: string) => {
			if (url.endsWith('/cexs?zz=14')) {
				return Promise.resolve(new Response('upstream failed', { status: 503 }))
			}
			return Promise.resolve(jsonResponse(responseForUrl(url)))
		})
		const { fetchCoreMetadataSources } = await import('../sources')

		await expect(fetchCoreMetadataSources()).rejects.toThrow('Metadata request failed')
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('[dev:prepare] Metadata cache: CEX metadata API failed:'))

		warn.mockRestore()
	})
})
