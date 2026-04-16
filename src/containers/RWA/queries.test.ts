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
		fetchRWAChartDataByAssetMock.mockResolvedValue(null)
		fetchRWAChainBreakdownChartDataMock.mockResolvedValue([])
		fetchRWACategoryBreakdownChartDataMock.mockResolvedValue([])
		fetchRWAPlatformBreakdownChartDataMock.mockResolvedValue([])
		fetchRWAAssetGroupBreakdownChartDataMock.mockResolvedValue([])
		fetchRWAAssetDataByIdMock.mockResolvedValue(null)
		fetchRWAAssetChartDataMock.mockResolvedValue(null)
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
})
