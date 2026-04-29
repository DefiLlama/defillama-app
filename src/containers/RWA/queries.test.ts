import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRWAAssetsOverview, getRWACategoriesOverview } from './queries'

const fetchRWAActiveTVLsMock = vi.fn()
const fetchRWAChartDataByAssetMock = vi.fn()
const fetchRWAChainBreakdownChartDataMock = vi.fn()
const fetchRWAStatsMock = vi.fn()
const fetchRWACategoryBreakdownChartDataMock = vi.fn()
const fetchRWAPlatformBreakdownChartDataMock = vi.fn()
const fetchRWAAssetGroupBreakdownChartDataMock = vi.fn()
const fetchRWAAssetDataByIdMock = vi.fn()
const fetchRWAAssetChartDataMock = vi.fn()
const fetchRWAPerpsCurrentMock = vi.fn()
const fetchRWAPerpsContractBreakdownChartDataMock = vi.fn()

vi.mock('./api', () => ({
	fetchRWAActiveTVLs: (...args: unknown[]) => fetchRWAActiveTVLsMock(...args),
	fetchRWAChartDataByAsset: (...args: unknown[]) => fetchRWAChartDataByAssetMock(...args),
	fetchRWAChainBreakdownChartData: (...args: unknown[]) => fetchRWAChainBreakdownChartDataMock(...args),
	fetchRWAStats: (...args: unknown[]) => fetchRWAStatsMock(...args),
	fetchRWACategoryBreakdownChartData: (...args: unknown[]) => fetchRWACategoryBreakdownChartDataMock(...args),
	fetchRWAPlatformBreakdownChartData: (...args: unknown[]) => fetchRWAPlatformBreakdownChartDataMock(...args),
	fetchRWAAssetGroupBreakdownChartData: (...args: unknown[]) => fetchRWAAssetGroupBreakdownChartDataMock(...args),
	fetchRWAAssetDataById: (...args: unknown[]) => fetchRWAAssetDataByIdMock(...args),
	fetchRWAAssetChartData: (...args: unknown[]) => fetchRWAAssetChartDataMock(...args),
	toUnixMsTimestamp: (timestamp: number) => timestamp
}))

vi.mock('./Perps/api', () => ({
	fetchRWAPerpsCurrent: (...args: unknown[]) => fetchRWAPerpsCurrentMock(...args),
	fetchRWAPerpsContractBreakdownChartData: (...args: unknown[]) => fetchRWAPerpsContractBreakdownChartDataMock(...args)
}))

describe('rwa queries', () => {
	beforeEach(() => {
		fetchRWAActiveTVLsMock.mockReset()
		fetchRWAChartDataByAssetMock.mockReset()
		fetchRWAChainBreakdownChartDataMock.mockReset()
		fetchRWAStatsMock.mockReset()
		fetchRWACategoryBreakdownChartDataMock.mockReset()
		fetchRWAPlatformBreakdownChartDataMock.mockReset()
		fetchRWAAssetGroupBreakdownChartDataMock.mockReset()
		fetchRWAAssetDataByIdMock.mockReset()
		fetchRWAAssetChartDataMock.mockReset()
		fetchRWAPerpsCurrentMock.mockReset()
		fetchRWAPerpsContractBreakdownChartDataMock.mockReset()
		fetchRWAChartDataByAssetMock.mockResolvedValue(null)
		fetchRWAChainBreakdownChartDataMock.mockResolvedValue([])
		fetchRWACategoryBreakdownChartDataMock.mockResolvedValue([])
		fetchRWAPlatformBreakdownChartDataMock.mockResolvedValue([])
		fetchRWAAssetGroupBreakdownChartDataMock.mockResolvedValue([])
		fetchRWAAssetDataByIdMock.mockResolvedValue(null)
		fetchRWAAssetChartDataMock.mockResolvedValue(null)
		fetchRWAPerpsCurrentMock.mockResolvedValue([])
		fetchRWAPerpsContractBreakdownChartDataMock.mockResolvedValue([])
	})

	it('excludes assets tagged as RWA Perps from the standard rwa overview', async () => {
		fetchRWAActiveTVLsMock.mockResolvedValue([
			{
				id: 'treasury-1',
				ticker: 'T1',
				assetName: 'Treasury One',
				category: ['Treasuries'],
				onChainMcap: { Ethereum: 100 },
				activeMcap: { Ethereum: 90 },
				defiActiveTvl: { Ethereum: { Aave: 20 } }
			},
			{
				id: 'perps-1',
				ticker: 'P1',
				assetName: 'Perps One',
				category: ['RWA Perps'],
				onChainMcap: { Ethereum: 250 },
				activeMcap: { Ethereum: 200 },
				defiActiveTvl: { Ethereum: { Morpho: 25 } }
			},
			{
				id: 'mixed-1',
				ticker: 'M1',
				assetName: 'Mixed One',
				category: ['Private Credit', 'RWA Perps'],
				onChainMcap: { Ethereum: 300 },
				activeMcap: { Ethereum: 280 },
				defiActiveTvl: { Ethereum: { Spark: 30 } }
			}
		])

		const result = await getRWAAssetsOverview({
			rwaList: {
				chains: ['Ethereum'],
				categories: ['Treasuries', 'Private Credit', 'RWA Perps'],
				platforms: [],
				assetGroups: []
			} as never
		})

		expect(result?.assets.map((asset) => asset.assetName)).toEqual(['Treasury One'])
		expect(result?.categories).toEqual(['Treasuries'])
		expect(result?.categoryValues).toEqual([{ name: 'Treasuries', value: 100 }])
		expect(result?.categoryLinks).toEqual([])
	})

	it('merges perps contracts into the overview rows', async () => {
		fetchRWAActiveTVLsMock.mockResolvedValue([
			{
				id: 'treasury-1',
				canonicalMarketId: 'ondo/usdy',
				ticker: 'USDY',
				assetName: 'Ondo USDY',
				category: ['Treasuries'],
				assetGroup: 'Treasuries',
				parentPlatform: 'Ondo',
				onChainMcap: { Ethereum: 100 },
				activeMcap: { Ethereum: 90 },
				defiActiveTvl: { Ethereum: { Aave: 20 } }
			}
		])
		fetchRWAPerpsCurrentMock.mockResolvedValue([
			{
				id: 'perps-1',
				timestamp: 1,
				contract: 'xyz:usdy',
				venue: 'xyz',
				openInterest: 10,
				volume24h: 20,
				price: 1.01,
				priceChange24h: 0,
				fundingRate: 0,
				premium: 0,
				cumulativeFunding: 0,
				referenceAsset: 'Ondo USDY',
				referenceAssetGroup: 'Treasuries',
				assetClass: ['Bonds'],
				parentPlatform: 'Ondo',
				pair: null,
				marginAsset: null,
				settlementAsset: null,
				category: ['RWA Perps', 'Treasuries'],
				issuer: 'Ondo',
				website: null,
				oracleProvider: null,
				description: null,
				accessModel: 'Permissioned',
				rwaClassification: 'RWA',
				makerFeeRate: 0,
				takerFeeRate: 0,
				deployerFeeShare: 0,
				oraclePx: 0,
				midPx: 0,
				prevDayPx: 0,
				maxLeverage: 0,
				szDecimals: 0,
				volume7d: 0,
				volume30d: 0,
				volumeAllTime: 0,
				estimatedProtocolFees24h: 0,
				estimatedProtocolFees7d: 0,
				estimatedProtocolFees30d: 0,
				estimatedProtocolFeesAllTime: 0
			}
		])
		fetchRWAPerpsContractBreakdownChartDataMock.mockResolvedValue([{ timestamp: 1_000, 'xyz:usdy': 10 }])

		const result = await getRWAAssetsOverview({
			rwaList: {
				chains: ['Ethereum'],
				categories: ['Treasuries', 'RWA Perps'],
				platforms: ['Ondo'],
				assetGroups: ['Treasuries']
			} as never
		})

		expect(result?.assets.map((asset) => asset.kind)).toEqual(['spot', 'perps'])
		expect(result?.assets[0]).toMatchObject({
			kind: 'spot',
			detailHref: '/rwa/asset/ondo%2Fusdy'
		})
		expect(result?.assets[1]).toMatchObject({
			kind: 'perps',
			detailHref: '/rwa/perps/contract/xyz%3Ausdy',
			assetName: 'Ondo USDY',
			category: ['Treasuries'],
			openInterest: 10,
			volume24h: 20,
			volume30d: 0,
			onChainMcap: null,
			activeMcap: null,
			defiActiveTvl: null
		})
		expect(result?.initialOpenInterestChartDataset).toEqual({
			source: [{ timestamp: 1_000_000, 'RWA Perps OI': 10 }],
			dimensions: ['timestamp', 'RWA Perps OI']
		})
		expect(result?.types).toContain('Perp')
		expect(result?.platforms).toContain('Ondo')
		expect(result?.assetGroups).toContain('Treasuries')
	})

	it('falls back to the spot overview when the perps markets request fails', async () => {
		fetchRWAActiveTVLsMock.mockResolvedValue([
			{
				id: 'treasury-1',
				canonicalMarketId: 'ondo/usdy',
				ticker: 'USDY',
				assetName: 'Ondo USDY',
				category: ['Treasuries'],
				assetGroup: 'Treasuries',
				parentPlatform: 'Ondo',
				onChainMcap: { Ethereum: 100 },
				activeMcap: { Ethereum: 90 },
				defiActiveTvl: { Ethereum: { Aave: 20 } }
			}
		])
		fetchRWAPerpsCurrentMock.mockRejectedValue(new Error('temporary outage'))

		const result = await getRWAAssetsOverview({
			rwaList: {
				chains: ['Ethereum'],
				categories: ['Treasuries'],
				platforms: ['Ondo'],
				assetGroups: ['Treasuries']
			} as never
		})

		expect(result?.assets.map((asset) => asset.kind)).toEqual(['spot'])
		expect(result?.platforms).toEqual(['Ondo'])
	})

	it('resolves perps-only platform slugs on platform overview routes', async () => {
		fetchRWAActiveTVLsMock.mockResolvedValue([])
		fetchRWAPerpsCurrentMock.mockResolvedValue([
			{
				id: 'perps-1',
				timestamp: 1,
				contract: 'xyz:gold',
				venue: 'xyz',
				openInterest: 10,
				volume24h: 20,
				price: 1.01,
				priceChange24h: 0,
				fundingRate: 0,
				premium: 0,
				cumulativeFunding: 0,
				referenceAsset: 'Gold',
				referenceAssetGroup: 'Commodities',
				assetClass: ['Commodities'],
				parentPlatform: 'Trade[XYZ]',
				pair: null,
				marginAsset: null,
				settlementAsset: null,
				category: ['Commodities'],
				issuer: 'XYZ',
				website: null,
				oracleProvider: null,
				description: null,
				accessModel: 'Permissionless',
				rwaClassification: 'RWA',
				makerFeeRate: 0,
				takerFeeRate: 0,
				deployerFeeShare: 0,
				oraclePx: 0,
				midPx: 0,
				prevDayPx: 0,
				maxLeverage: 0,
				szDecimals: 0,
				volume7d: 0,
				volume30d: 0,
				volumeAllTime: 0,
				estimatedProtocolFees24h: 0,
				estimatedProtocolFees7d: 0,
				estimatedProtocolFees30d: 0,
				estimatedProtocolFeesAllTime: 0
			}
		])

		const result = await getRWAAssetsOverview({
			platform: 'trade-xyz',
			rwaList: {
				chains: ['Ethereum'],
				categories: ['Commodities'],
				platforms: [],
				assetGroups: ['Commodities']
			} as never
		})

		expect(result?.selectedPlatform).toBe('Trade[XYZ]')
		expect(result?.assets.map((asset) => asset.kind)).toEqual(['perps'])
	})

	it('excludes the RWA Perps bucket from category overview rows', async () => {
		fetchRWAStatsMock.mockResolvedValue({
			byCategory: {
				Treasuries: {
					base: { onChainMcap: 100, activeMcap: 90, defiActiveTvl: 10, assetCount: 1, assetIssuers: ['Issuer A'] },
					stablecoinsOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
					governanceOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
					stablecoinsAndGovernance: {
						onChainMcap: 0,
						activeMcap: 0,
						defiActiveTvl: 0,
						assetCount: 0,
						assetIssuers: []
					}
				},
				'RWA Perps': {
					base: { onChainMcap: 500, activeMcap: 450, defiActiveTvl: 0, assetCount: 2, assetIssuers: ['Issuer P'] },
					stablecoinsOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
					governanceOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
					stablecoinsAndGovernance: {
						onChainMcap: 0,
						activeMcap: 0,
						defiActiveTvl: 0,
						assetCount: 0,
						assetIssuers: []
					}
				}
			}
		})

		const result = await getRWACategoriesOverview()

		expect(result.rows.map((row) => row.category)).toEqual(['Treasuries'])
	})

	it('returns null when issuer is combined with another filter', async () => {
		const result = await getRWAAssetsOverview({
			issuer: 'issuer-a',
			platform: 'a',
			rwaList: {
				chains: [],
				categories: [],
				platforms: [],
				assetGroups: []
			} as never
		})

		expect(result).toBeNull()
	})

	it('does not refetch /rwa/current when prefetched rows are provided', async () => {
		fetchRWAActiveTVLsMock.mockClear()
		const prefetched = [
			{
				id: 'x',
				ticker: 'X',
				assetName: 'X',
				category: ['Treasuries'],
				issuer: 'Issuer A',
				onChainMcap: { Ethereum: 1 },
				activeMcap: { Ethereum: 1 },
				defiActiveTvl: { Ethereum: { Aave: 1 } }
			}
		]

		await getRWAAssetsOverview({
			issuer: 'issuer-a',
			prefetchedRwaProjects: prefetched as never,
			rwaList: {
				chains: [],
				categories: [],
				platforms: [],
				assetGroups: []
			} as never
		})

		expect(fetchRWAActiveTVLsMock).not.toHaveBeenCalled()
	})

	it('reuses the batched per-asset chart endpoint for issuer pages', async () => {
		fetchRWAChartDataByAssetMock.mockClear()
		const prefetched = [
			{
				id: 'x',
				ticker: 'X',
				assetName: 'X',
				canonicalMarketId: 'issuer-a/x',
				category: ['Treasuries'],
				issuer: 'Issuer A',
				onChainMcap: { Ethereum: 1 },
				activeMcap: { Ethereum: 1 },
				defiActiveTvl: { Ethereum: { Aave: 1 } }
			}
		]

		await getRWAAssetsOverview({
			issuer: 'issuer-a',
			prefetchedRwaProjects: prefetched as never,
			rwaList: {
				chains: [],
				categories: [],
				platforms: [],
				assetGroups: []
			} as never
		})

		expect(fetchRWAChartDataByAssetMock).toHaveBeenCalledTimes(1)
		expect(fetchRWAChartDataByAssetMock).toHaveBeenCalledWith(
			expect.objectContaining({
				target: { kind: 'all' },
				includeStablecoins: true,
				includeGovernance: true
			})
		)
	})

	it('returns the resolved issuer slug on the overview response so consumers do not have to merge it in', async () => {
		const prefetched = [
			{
				id: 'x',
				ticker: 'X',
				assetName: 'X',
				canonicalMarketId: 'issuer-a/x',
				category: ['Treasuries'],
				issuer: 'Issuer A',
				onChainMcap: { Ethereum: 1 },
				activeMcap: { Ethereum: 1 },
				defiActiveTvl: { Ethereum: { Aave: 1 } }
			}
		]

		const result = await getRWAAssetsOverview({
			issuer: 'issuer-a',
			prefetchedRwaProjects: prefetched as never,
			rwaList: { chains: [], categories: [], platforms: [], assetGroups: [] } as never
		})

		expect(result?.issuerSlug).toBe('issuer-a')

		const nonIssuerResult = await getRWAAssetsOverview({
			prefetchedRwaProjects: prefetched as never,
			rwaList: { chains: [], categories: [], platforms: [], assetGroups: [] } as never
		})
		expect(nonIssuerResult?.issuerSlug).toBeNull()
	})

	it('projects the batched chart down to just the issuer assets via the aggregation pipeline', async () => {
		// Two assets from Issuer A and one from Issuer B all share the same global chart payload.
		// The issuer page must end up with only Issuer A's series in `initialChartDataset`.
		const prefetched = [
			{
				id: 'a1',
				ticker: 'A1',
				assetName: 'A One',
				canonicalMarketId: 'issuer-a/one',
				category: ['Treasuries'],
				assetGroup: 'Treasuries',
				issuer: 'Issuer A',
				onChainMcap: { Ethereum: 100 },
				activeMcap: { Ethereum: 90 },
				defiActiveTvl: { Ethereum: { Aave: 10 } }
			},
			{
				id: 'a2',
				ticker: 'A2',
				assetName: 'A Two',
				canonicalMarketId: 'issuer-a/two',
				category: ['Treasuries'],
				assetGroup: 'Treasuries',
				issuer: 'Issuer A',
				onChainMcap: { Ethereum: 50 },
				activeMcap: { Ethereum: 45 },
				defiActiveTvl: { Ethereum: { Aave: 5 } }
			},
			{
				id: 'b1',
				ticker: 'B1',
				assetName: 'B One',
				canonicalMarketId: 'issuer-b/one',
				category: ['Treasuries'],
				assetGroup: 'Treasuries',
				issuer: 'Issuer B',
				onChainMcap: { Ethereum: 200 },
				activeMcap: { Ethereum: 180 },
				defiActiveTvl: { Ethereum: { Aave: 20 } }
			}
		]
		fetchRWAChartDataByAssetMock.mockResolvedValue({
			onChainMcap: [
				{ timestamp: 1, 'issuer-a/one': 100, 'issuer-a/two': 50, 'issuer-b/one': 200 },
				{ timestamp: 2, 'issuer-a/one': 110, 'issuer-a/two': 55, 'issuer-b/one': 220 }
			],
			activeMcap: [{ timestamp: 1, 'issuer-a/one': 90, 'issuer-a/two': 45, 'issuer-b/one': 180 }],
			defiActiveTvl: [{ timestamp: 1, 'issuer-a/one': 10, 'issuer-a/two': 5, 'issuer-b/one': 20 }]
		})

		const result = await getRWAAssetsOverview({
			issuer: 'issuer-a',
			prefetchedRwaProjects: prefetched as never,
			rwaList: {
				chains: ['Ethereum'],
				categories: ['Treasuries'],
				platforms: [],
				assetGroups: ['Treasuries']
			} as never
		})

		const onChainDimensions = result?.initialChartDataset?.onChainMcap.dimensions ?? []
		expect(onChainDimensions).toContain('A One')
		expect(onChainDimensions).toContain('A Two')
		expect(onChainDimensions).not.toContain('B One')

		const onChainSourceFirstRow = result?.initialChartDataset?.onChainMcap.source?.[0] ?? {}
		expect(onChainSourceFirstRow).not.toHaveProperty('B One')
	})
})
