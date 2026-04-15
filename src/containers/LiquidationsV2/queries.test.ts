import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
	fetchProtocolsList: vi.fn(),
	fetchAllLiquidations: vi.fn(),
	fetchProtocolLiquidations: vi.fn(),
	fetchProtocolChainLiquidations: vi.fn()
}))

import {
	fetchAllLiquidations,
	fetchProtocolChainLiquidations,
	fetchProtocolLiquidations,
	fetchProtocolsList
} from './api'
import {
	getLiquidationsChainPageData,
	getLiquidationsOverviewPageData,
	getLiquidationsProtocolPageData
} from './queries'

const mockedFetchProtocolsList = vi.mocked(fetchProtocolsList)
const mockedFetchAllLiquidations = vi.mocked(fetchAllLiquidations)
const mockedFetchProtocolLiquidations = vi.mocked(fetchProtocolLiquidations)
const mockedFetchProtocolChainLiquidations = vi.mocked(fetchProtocolChainLiquidations)

beforeEach(() => {
	vi.clearAllMocks()
})

describe('LiquidationsV2 queries', () => {
	it('builds the overview page data', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['aave-v3', 'compound-v3'] })
		mockedFetchAllLiquidations.mockResolvedValue({
			timestamp: 100,
			data: {
				'aave-v3': {
					arbitrum: [
						{
							owner: '0x1',
							liqPrice: 1,
							collateral: 'ethereum:eth',
							collateralAmount: '10',
							extra: { url: 'https://example.com/1' }
						}
					],
					ethereum: [
						{
							owner: '0x2',
							liqPrice: 2,
							collateral: 'ethereum:wbtc',
							collateralAmount: '20',
							extra: { url: 'https://example.com/2' }
						}
					]
				},
				'compound-v3': {
					ethereum: [
						{
							owner: '0x3',
							liqPrice: 3,
							collateral: 'ethereum:eth',
							collateralAmount: '30',
							extra: { url: 'https://example.com/3' }
						}
					]
				}
			}
		})

		const data = await getLiquidationsOverviewPageData()

		expect(data.protocolCount).toBe(2)
		expect(data.chainCount).toBe(2)
		expect(data.positionCount).toBe(3)
		expect(data.protocolRows[0]).toEqual({
			protocol: 'aave-v3',
			positionCount: 2,
			chainCount: 2,
			collateralCount: 2
		})
		expect(data.chainRows[0]).toEqual({
			chain: 'ethereum',
			positionCount: 2,
			protocolCount: 2,
			collateralCount: 2
		})
	})

	it('builds the protocol page data', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['aave-v3'] })
		mockedFetchProtocolLiquidations.mockResolvedValue({
			timestamp: 200,
			data: {
				arbitrum: [
					{
						owner: '0x1',
						liqPrice: 1,
						collateral: 'ethereum:eth',
						collateralAmount: '10',
						extra: { displayName: 'alice', url: 'https://example.com/1' }
					}
				],
				ethereum: [
					{
						owner: '0x2',
						liqPrice: 2,
						collateral: 'ethereum:wbtc',
						collateralAmount: '20',
						extra: { url: 'https://example.com/2' }
					}
				]
			}
		})

		const data = await getLiquidationsProtocolPageData('aave-v3')

		expect(data).not.toBeNull()
		expect(data?.chainCount).toBe(2)
		expect(data?.positionCount).toBe(2)
		expect(data?.collateralCount).toBe(2)
		expect(data?.positions[0]).toEqual({
			protocol: 'aave-v3',
			chain: 'arbitrum',
			owner: '0x1',
			ownerName: 'alice',
			ownerUrl: 'https://example.com/1',
			liqPrice: 1,
			collateral: 'ethereum:eth',
			collateralAmount: '10'
		})
	})

	it('returns null for an invalid protocol', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['aave-v3'] })

		await expect(getLiquidationsProtocolPageData('compound-v3')).resolves.toBeNull()
	})

	it('builds the chain page data', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['aave-v3'] })
		mockedFetchProtocolLiquidations.mockResolvedValue({
			timestamp: 200,
			data: {
				arbitrum: [],
				ethereum: []
			}
		})
		mockedFetchProtocolChainLiquidations.mockResolvedValue({
			timestamp: 300,
			data: [
				{
					owner: '0x2',
					liqPrice: 2,
					collateral: 'ethereum:wbtc',
					collateralAmount: '20',
					extra: { url: 'https://example.com/2' }
				}
			]
		})

		const data = await getLiquidationsChainPageData('aave-v3', 'ethereum')

		expect(data).not.toBeNull()
		expect(data?.positionCount).toBe(1)
		expect(data?.collateralCount).toBe(1)
		expect(data?.chainLinks.map((link) => link.label)).toEqual(['All Chains', 'arbitrum', 'ethereum'])
	})

	it('returns null for an invalid chain', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['aave-v3'] })
		mockedFetchProtocolLiquidations.mockResolvedValue({
			timestamp: 200,
			data: {
				ethereum: []
			}
		})

		await expect(getLiquidationsChainPageData('aave-v3', 'arbitrum')).resolves.toBeNull()
	})
})
