import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	fetchChainMock,
	getObjectCacheMock,
	setObjectCacheMock,
	getCategoryInfoMock,
	getCoinPerformanceMock,
	getOracleDetailPageDataMock,
	getOraclesListPageDataMock,
	getDATOverviewDataByAssetMock,
	getDATAssetPathsMock,
	getDATCompanyDataMock,
	getDATCompanyPathsMock,
	fetchStablecoinAssetsApiMock,
	getStablecoinAssetPageDataMock,
	metadataCache
} = vi.hoisted(() => ({
	fetchChainMock: vi.fn(),
	getObjectCacheMock: vi.fn(),
	setObjectCacheMock: vi.fn(),
	getCategoryInfoMock: vi.fn(),
	getCoinPerformanceMock: vi.fn(),
	getOracleDetailPageDataMock: vi.fn(),
	getOraclesListPageDataMock: vi.fn(),
	getDATOverviewDataByAssetMock: vi.fn(),
	getDATAssetPathsMock: vi.fn(),
	getDATCompanyDataMock: vi.fn(),
	getDATCompanyPathsMock: vi.fn(),
	fetchStablecoinAssetsApiMock: vi.fn(),
	getStablecoinAssetPageDataMock: vi.fn(),
	metadataCache: {
		chainMetadata: {},
		categoriesAndTags: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
		protocolMetadata: {},
		narrativeCategories: { ids: [], nameById: {} },
		narrativeCategoryIdsSet: new Set<string>(),
		oracleRoutes: { oracleNameBySlug: {}, chainNameBySlug: {}, chainSlugsByOracleSlug: {} },
		digitalAssetTreasuryRoutes: { assetSlugs: [], companySlugs: [] },
		digitalAssetTreasuryAssetSlugsSet: new Set<string>(),
		digitalAssetTreasuryCompanySlugsSet: new Set<string>(),
		stablecoinPeggedAssetSlugs: [],
		stablecoinPeggedAssetSlugsSet: new Set<string>()
	}
}))

vi.mock('~/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/constants')>()),
	SKIP_BUILD_STATIC_GENERATION: false
}))

vi.mock('~/layout', () => ({
	default: () => null
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: metadataCache
}))

vi.mock('~/containers/CompareChains/chainFetcher', () => ({
	fetchChain: fetchChainMock
}))

vi.mock('~/utils/cache-client', () => ({
	getObjectCache: getObjectCacheMock,
	setObjectCache: setObjectCacheMock
}))

vi.mock('~/containers/NarrativeTracker', () => ({
	CategoryPerformanceContainer: () => null
}))

vi.mock('~/containers/NarrativeTracker/queries', () => ({
	getCategoryInfo: getCategoryInfoMock,
	getCoinPerformance: getCoinPerformanceMock
}))

vi.mock('~/containers/Oracles/OracleOverview', () => ({
	OracleOverview: () => null
}))

vi.mock('~/containers/Oracles/OraclesByChain', () => ({
	OraclesByChain: () => null
}))

vi.mock('~/containers/Oracles/queries', () => ({
	getOracleDetailPageData: getOracleDetailPageDataMock,
	getOraclesListPageData: getOraclesListPageDataMock
}))

vi.mock('~/containers/DAT/ByAsset', () => ({
	DATByAsset: () => null
}))

vi.mock('~/containers/DAT/Company', () => ({
	DATCompany: () => null
}))

vi.mock('~/containers/DAT/queries', () => ({
	getDATOverviewDataByAsset: getDATOverviewDataByAssetMock,
	getDATAssetPaths: getDATAssetPathsMock,
	getDATCompanyData: getDATCompanyDataMock,
	getDATCompanyPaths: getDATCompanyPathsMock
}))

vi.mock('~/containers/Stablecoins/api', () => ({
	fetchStablecoinAssetsApi: fetchStablecoinAssetsApiMock
}))

vi.mock('~/containers/Stablecoins/queries.server', () => ({
	getStablecoinAssetPageData: getStablecoinAssetPageDataMock
}))

vi.mock('~/containers/Stablecoins/StablecoinOverview', () => ({
	default: () => null
}))

import { chainCacheHandler } from '~/pages/api/dynamic/cache/chain/[chain]'
import * as datAssetPage from '~/pages/digital-asset-treasuries/[asset]'
import * as datCompanyPage from '~/pages/digital-asset-treasury/[company]'
import * as narrativePage from '~/pages/narrative-tracker/[category]'
import * as oraclePage from '~/pages/oracles/[oracle]'
import * as oracleChainPage from '~/pages/oracles/[oracle]/[chain]'
import * as oraclesByChainPage from '~/pages/oracles/chain/[chain]'
import * as stablecoinPage from '~/pages/stablecoin/[peggedasset]'

beforeEach(() => {
	vi.clearAllMocks()
	metadataCache.chainMetadata = { ethereum: { name: 'Ethereum', id: 'ethereum' } }
	metadataCache.narrativeCategories = { ids: ['ai'], nameById: { ai: 'AI' } }
	metadataCache.narrativeCategoryIdsSet = new Set(['ai'])
	metadataCache.oracleRoutes = {
		oracleNameBySlug: { chainlink: 'Chainlink' },
		chainNameBySlug: { ethereum: 'Ethereum' },
		chainSlugsByOracleSlug: { chainlink: ['ethereum'] }
	}
	metadataCache.digitalAssetTreasuryRoutes = { assetSlugs: ['bitcoin'], companySlugs: ['mstr'] }
	metadataCache.digitalAssetTreasuryAssetSlugsSet = new Set(['bitcoin'])
	metadataCache.digitalAssetTreasuryCompanySlugsSet = new Set(['mstr'])
	metadataCache.stablecoinPeggedAssetSlugs = ['tether']
	metadataCache.stablecoinPeggedAssetSlugsSet = new Set(['tether'])
	getObjectCacheMock.mockResolvedValue(null)
	setObjectCacheMock.mockResolvedValue(undefined)
	fetchChainMock.mockResolvedValue({ chainOverviewData: null })
	getCoinPerformanceMock.mockResolvedValue({
		pctChanges: [],
		performanceTimeSeries: {},
		areaChartLegend: [],
		isCoinPage: true
	})
	getOracleDetailPageDataMock.mockResolvedValue({ oracle: 'Chainlink', chain: null })
	getOraclesListPageDataMock.mockResolvedValue({ chain: 'Ethereum' })
	getDATOverviewDataByAssetMock.mockResolvedValue({ asset: 'bitcoin', metadata: { name: 'Bitcoin', ticker: 'BTC' } })
	getDATCompanyDataMock.mockResolvedValue({ name: 'Strategy', ticker: 'MSTR' })
	getStablecoinAssetPageDataMock.mockResolvedValue({
		props: {
			peggedAssetData: { name: 'Tether', symbol: 'USDT' }
		}
	})
})

describe('route metadata guards', () => {
	it('chain cache API returns 404 before cache lookup or heavy fetch for invalid chains', async () => {
		const res = createMockNextApiResponse()

		await chainCacheHandler({ query: { chain: 'bad-chain' } } as unknown as NextApiRequest, res)

		expect(res.statusCode).toBe(404)
		expect(getObjectCacheMock).not.toHaveBeenCalled()
		expect(fetchChainMock).not.toHaveBeenCalled()
	})

	it('chain cache API canonicalizes valid chain params for cache and fetch', async () => {
		const res = createMockNextApiResponse()

		await chainCacheHandler({ query: { chain: 'eThEReum' } } as unknown as NextApiRequest, res)

		expect(getObjectCacheMock).toHaveBeenCalledWith('object-chain-ethereum')
		expect(fetchChainMock).toHaveBeenCalledWith(expect.objectContaining({ chain: 'Ethereum' }))
		expect(setObjectCacheMock).toHaveBeenCalledWith('object-chain-ethereum', expect.anything())
	})

	it('chain cache API returns cached canonical responses without fetching', async () => {
		const res = createMockNextApiResponse()
		const cachedData = { chain: { chainOverviewData: { name: 'Ethereum' } } }
		getObjectCacheMock.mockResolvedValueOnce(cachedData)

		await chainCacheHandler({ query: { chain: 'ethereum' } } as unknown as NextApiRequest, res)

		expect(getObjectCacheMock).toHaveBeenCalledWith('object-chain-ethereum')
		expect(res.json).toHaveBeenCalledWith(cachedData)
		expect(fetchChainMock).not.toHaveBeenCalled()
		expect(setObjectCacheMock).not.toHaveBeenCalled()
	})

	it('narrative category route returns notFound before performance fetch for indexed invalid ids', async () => {
		await expect(narrativePage.getStaticProps({ params: { category: 'bad' } } as never)).resolves.toEqual({
			notFound: true
		})
		expect(getCoinPerformanceMock).not.toHaveBeenCalled()
	})

	it('narrative getStaticPaths uses cached category ids when available', async () => {
		await expect(narrativePage.getStaticPaths()).resolves.toEqual({
			paths: [{ params: { category: 'ai' } }],
			fallback: 'blocking'
		})
		expect(getCategoryInfoMock).not.toHaveBeenCalled()
	})

	it('oracle routes return notFound before page-data fetches for invalid params', async () => {
		await expect(oraclePage.getStaticProps({ params: { oracle: 'bad' } } as never)).resolves.toEqual({
			notFound: true
		})
		await expect(
			oracleChainPage.getStaticProps({ params: { oracle: 'chainlink', chain: 'solana' } } as never)
		).resolves.toEqual({ notFound: true })
		await expect(oraclesByChainPage.getStaticProps({ params: { chain: 'solana' } } as never)).resolves.toEqual({
			notFound: true
		})
		expect(getOracleDetailPageDataMock).not.toHaveBeenCalled()
		expect(getOraclesListPageDataMock).not.toHaveBeenCalled()
	})

	it('oracle routes resolve indexed slugs to canonical names', async () => {
		await oraclePage.getStaticProps({ params: { oracle: 'chainlink' } } as never)
		await oracleChainPage.getStaticProps({ params: { oracle: 'chainlink', chain: 'ethereum' } } as never)
		await oraclesByChainPage.getStaticProps({ params: { chain: 'ethereum' } } as never)

		expect(getOracleDetailPageDataMock).toHaveBeenCalledWith({ oracle: 'Chainlink' })
		expect(getOracleDetailPageDataMock).toHaveBeenCalledWith({ oracle: 'Chainlink', chain: 'Ethereum' })
		expect(getOraclesListPageDataMock).toHaveBeenCalledWith({ chain: 'Ethereum' })
	})

	it('DAT routes return notFound before data fetches for indexed invalid slugs', async () => {
		await expect(datAssetPage.getStaticProps({ params: { asset: 'bad' } } as never)).resolves.toEqual({
			notFound: true
		})
		await expect(datCompanyPage.getStaticProps({ params: { company: 'bad' } } as never)).resolves.toEqual({
			notFound: true
		})
		expect(getDATOverviewDataByAssetMock).not.toHaveBeenCalled()
		expect(getDATCompanyDataMock).not.toHaveBeenCalled()
	})

	it('stablecoin route returns notFound before data fetch for indexed invalid slugs', async () => {
		await expect(stablecoinPage.getStaticProps({ params: { peggedasset: 'bad' } } as never)).resolves.toEqual({
			notFound: true
		})
		expect(getStablecoinAssetPageDataMock).not.toHaveBeenCalled()
	})

	it('stablecoin getStaticPaths uses cached slugs while preserving one pre-rendered path', async () => {
		metadataCache.stablecoinPeggedAssetSlugs = ['tether', 'usd-coin']

		await expect(stablecoinPage.getStaticPaths({} as never)).resolves.toEqual({
			paths: [{ params: { peggedasset: 'tether' } }],
			fallback: 'blocking'
		})
		expect(fetchStablecoinAssetsApiMock).not.toHaveBeenCalled()
	})
})
