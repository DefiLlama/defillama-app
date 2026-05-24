import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchMetadataJsonMock, fetchOracleMetricsMock, fetchDATInstitutionsMock, fetchStablecoinPeggedConfigApiMock } =
	vi.hoisted(() => ({
		fetchMetadataJsonMock: vi.fn(),
		fetchOracleMetricsMock: vi.fn(),
		fetchDATInstitutionsMock: vi.fn(),
		fetchStablecoinPeggedConfigApiMock: vi.fn()
	}))

vi.mock('~/constants', () => ({
	CATEGORY_INFO_API: 'category-info-api'
}))

vi.mock('../http', () => ({
	fetchMetadataJson: fetchMetadataJsonMock
}))

vi.mock('~/containers/Oracles/api', () => ({
	fetchOracleMetrics: fetchOracleMetricsMock
}))

vi.mock('~/containers/DAT/api', () => ({
	fetchDATInstitutions: fetchDATInstitutionsMock
}))

vi.mock('~/containers/Stablecoins/api', () => ({
	fetchStablecoinPeggedConfigApi: fetchStablecoinPeggedConfigApiMock
}))

function createDATResponse() {
	return {
		assetMetadata: {
			Bitcoin: {
				name: 'Bitcoin',
				ticker: 'BTC',
				geckoId: 'bitcoin',
				companies: 1,
				totalAmount: 1,
				totalUsdValue: 1,
				circSupplyPerc: 1
			}
		},
		institutionMetadata: {
			1: {
				institutionId: 1,
				ticker: 'MSTR',
				name: 'Strategy',
				type: 'Public',
				price: 1,
				priceChange24h: null,
				volume24h: 1,
				mcapRealized: null,
				mcapRealistic: null,
				mcapMax: null,
				realized_mNAV: null,
				realistic_mNAV: null,
				max_mNAV: null,
				totalUsdValue: 1,
				totalCost: 1,
				holdings: {}
			}
		},
		institutions: [],
		assets: {},
		totalCompanies: 1,
		flows: {},
		mNAV: {}
	}
}

describe('fetchMetadataRouteIndexes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		fetchMetadataJsonMock.mockResolvedValue([{ id: 'ai', name: 'AI', mcap: 1, volume1D: null, nbCoins: 1 }])
		fetchOracleMetricsMock.mockResolvedValue({
			oraclesTVS: { Chainlink: {} },
			chainsByOracle: { Chainlink: ['Ethereum'] }
		})
		fetchDATInstitutionsMock.mockResolvedValue(createDATResponse())
		fetchStablecoinPeggedConfigApiMock.mockResolvedValue({ Tether: 'pegged-1' })
	})

	it('fetches and builds all optional route indexes when upstreams are available', async () => {
		const { fetchMetadataRouteIndexes } = await import('../routeIndexes')

		await expect(fetchMetadataRouteIndexes()).resolves.toEqual({
			narrativeCategories: { ids: ['ai'], nameById: { ai: 'AI' } },
			oracleRoutes: {
				oracleNameBySlug: { chainlink: 'Chainlink' },
				chainNameBySlug: { ethereum: 'Ethereum' },
				chainSlugsByOracleSlug: { chainlink: ['ethereum'] }
			},
			digitalAssetTreasuryRoutes: { assetSlugs: ['bitcoin'], companySlugs: ['mstr'] },
			stablecoinPeggedAssetSlugs: ['tether']
		})
	})

	it('rejects when route index upstreams fail', async () => {
		fetchMetadataJsonMock.mockRejectedValue(new Error('narrative unavailable'))
		fetchOracleMetricsMock.mockRejectedValue(new Error('oracle unavailable'))
		fetchDATInstitutionsMock.mockRejectedValue(new Error('DAT unavailable'))
		fetchStablecoinPeggedConfigApiMock.mockRejectedValue(new Error('stablecoin unavailable'))
		const { fetchMetadataRouteIndexes } = await import('../routeIndexes')

		await expect(fetchMetadataRouteIndexes()).rejects.toThrow('narrative unavailable')
	})
})
