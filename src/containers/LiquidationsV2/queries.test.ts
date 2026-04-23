import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/api', () => ({
	fetchBlockExplorers: vi.fn()
}))

vi.mock('./api', () => ({
	fetchProtocolsList: vi.fn(),
	fetchAllLiquidations: vi.fn(),
	fetchProtocolLiquidations: vi.fn()
}))

import { fetchBlockExplorers } from '~/api'
import { fetchAllLiquidations, fetchProtocolLiquidations, fetchProtocolsList } from './api'
import type { RawAllLiquidationsResponse, RawProtocolsResponse } from './api.types'
import {
	buildLiquidationsProtocolPageData,
	buildTokenLiquidationsSectionData,
	getLiquidationsChainPageData,
	getLiquidationsOverviewPageData,
	getLiquidationsProtocolPageData,
	getTokenLiquidationsSectionData,
	resetTokenLiquidationsSnapshotCache
} from './queries'

const mockedFetchProtocolsList = fetchProtocolsList as unknown as ReturnType<typeof vi.fn>
const mockedFetchAllLiquidations = fetchAllLiquidations as unknown as ReturnType<typeof vi.fn>
const mockedFetchProtocolLiquidations = fetchProtocolLiquidations as unknown as ReturnType<typeof vi.fn>
const mockedFetchBlockExplorers = fetchBlockExplorers as unknown as ReturnType<typeof vi.fn>

const metadata = {
	protocolMetadata: {
		'118': { name: 'maker', displayName: 'Sky' },
		'1599': { name: 'aave-v3', displayName: 'Aave V3' },
		'2088': { name: 'compound-v3', displayName: 'Compound V3' }
	},
	chainMetadata: {
		arbitrum: { id: 'arbitrum', name: 'Arbitrum One' },
		ethereum: { id: 'ethereum', name: 'Ethereum' },
		base: { id: 'base', name: 'Base' }
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	resetTokenLiquidationsSnapshotCache()
	mockedFetchBlockExplorers.mockResolvedValue([
		{
			displayName: 'Arbitrum',
			llamaChainId: 'arbitrum',
			evmChainId: 42161,
			blockExplorers: [{ name: 'Arbiscan', url: 'https://arbiscan.io' }]
		},
		{
			displayName: 'Ethereum',
			llamaChainId: 'ethereum',
			evmChainId: 1,
			blockExplorers: [{ name: 'Etherscan', url: 'https://etherscan.io' }]
		},
		{
			displayName: 'Polygon',
			llamaChainId: 'polygon',
			evmChainId: 137,
			blockExplorers: [{ name: 'Polygonscan', url: 'https://polygonscan.com' }]
		}
	])
})

describe('LiquidationsV2 queries', () => {
	it('builds the overview page data', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['aave-v3', 'compound-v3'] })
		mockedFetchAllLiquidations.mockResolvedValue({
			timestamp: 100,
			tokens: {},
			validThresholds: ['all'],
			data: {
				'aave-v3': {
					arbitrum: [
						{
							owner: '0x1',
							liqPrice: 1,
							collateral: 'ethereum:eth',
							collateralAmount: 10,
							collateralAmountUsd: 1000,
							extra: { url: 'https://example.com/1' }
						}
					],
					ethereum: [
						{
							owner: '0x2',
							liqPrice: 2,
							collateral: 'ethereum:wbtc',
							collateralAmount: 20,
							collateralAmountUsd: 2000,
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
							collateralAmount: 30,
							collateralAmountUsd: 3000,
							extra: { url: 'https://example.com/3' }
						}
					]
				}
			}
		})

		const data = await getLiquidationsOverviewPageData(metadata)

		expect(data.protocolCount).toBe(2)
		expect(data.chainCount).toBe(2)
		expect(data.positionCount).toBe(3)
		expect(data.totalCollateralUsd).toBe(6000)
		expect(data.protocolRows[0]).toEqual({
			id: 'aave-v3',
			name: 'Aave V3',
			slug: 'aave-v3',
			positionCount: 2,
			chainCount: 2,
			collateralCount: 2,
			totalCollateralUsd: 3000
		})
		expect(data.chainRows[0]).toEqual({
			id: 'ethereum',
			name: 'Ethereum',
			slug: 'ethereum',
			positionCount: 2,
			protocolCount: 2,
			collateralCount: 2,
			totalCollateralUsd: 5000
		})
	})

	it('builds the protocol page data', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['maker'] })
		mockedFetchProtocolLiquidations.mockResolvedValue({
			timestamp: 200,
			tokens: {},
			validThresholds: ['all'],
			data: {
				arbitrum: [
					{
						owner: '0x1',
						liqPrice: 1,
						collateral: 'ethereum:eth',
						collateralAmount: 10,
						collateralAmountUsd: 1000,
						extra: { displayName: 'alice', url: 'https://example.com/1' }
					}
				],
				ethereum: [
					{
						owner: '0x2',
						liqPrice: 2,
						collateral: 'ethereum:wbtc',
						collateralAmount: 20,
						collateralAmountUsd: 2000,
						extra: { displayName: 'bob' }
					}
				]
			}
		})

		const data = await getLiquidationsProtocolPageData('sky', metadata)

		expect(data).not.toBeNull()
		expect(data?.protocolId).toBe('maker')
		expect(data?.protocolName).toBe('Sky')
		expect(data?.protocolSlug).toBe('sky')
		expect(data?.chainCount).toBe(2)
		expect(data?.positionCount).toBe(2)
		expect(data?.collateralCount).toBe(2)
		expect(data?.totalCollateralUsd).toBe(3000)
		expect(data?.chainLinks.map((link) => link.label)).toEqual(['All Chains', 'Arbitrum One', 'Ethereum'])
		expect(data?.ownerBlockExplorers.map((entry) => entry.llamaChainId)).toEqual(['arbitrum', 'ethereum'])
		expect(data?.positions[0]).toEqual({
			protocolId: 'maker',
			protocolName: 'Sky',
			protocolSlug: 'sky',
			chainId: 'arbitrum',
			chainName: 'Arbitrum One',
			chainSlug: 'arbitrum-one',
			owner: '0x1',
			ownerName: 'alice',
			ownerUrlOverride: 'https://example.com/1',
			liqPrice: 1,
			collateral: 'ethereum:eth',
			collateralAmount: 10,
			collateralAmountUsd: 1000
		})
	})

	it('returns null for an invalid protocol', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['maker'] })

		await expect(getLiquidationsProtocolPageData('compound-v3', metadata)).resolves.toBeNull()
	})

	it('builds the chain page data', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['maker'] })
		mockedFetchProtocolLiquidations.mockResolvedValue({
			timestamp: 200,
			tokens: {},
			validThresholds: ['all'],
			data: {
				arbitrum: [
					{
						owner: '0x1',
						liqPrice: 1,
						collateral: 'ethereum:eth',
						collateralAmount: 10,
						collateralAmountUsd: 1000,
						extra: { displayName: 'alice' }
					},
					{
						owner: '0x2',
						liqPrice: 2,
						collateral: 'ethereum:wbtc',
						collateralAmount: 20,
						collateralAmountUsd: 2000,
						extra: { url: 'https://example.com/2' }
					}
				],
				ethereum: []
			}
		})

		const data = await getLiquidationsChainPageData('sky', 'arbitrum-one', metadata)

		expect(data).not.toBeNull()
		expect(data?.positionCount).toBe(2)
		expect(data?.collateralCount).toBe(2)
		expect(data?.totalCollateralUsd).toBe(3000)
		expect(data?.protocolName).toBe('Sky')
		expect(data?.chainName).toBe('Arbitrum One')
		expect(data?.chainSlug).toBe('arbitrum-one')
		expect(data?.chainLinks.map((link) => link.label)).toEqual(['All Chains', 'Arbitrum One', 'Ethereum'])
		expect(data?.ownerBlockExplorers.map((entry) => entry.llamaChainId)).toEqual(['arbitrum'])
	})

	it('returns null for an invalid chain', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['maker'] })
		mockedFetchProtocolLiquidations.mockResolvedValue({
			timestamp: 200,
			tokens: {},
			validThresholds: ['all'],
			data: {
				ethereum: []
			}
		})

		await expect(getLiquidationsChainPageData('sky', 'base', metadata)).resolves.toBeNull()
	})

	it('builds token-scoped liquidations data by filtering on token symbol', async () => {
		mockedFetchProtocolsList.mockResolvedValue({ protocols: ['aave-v3', 'compound-v3'] })
		mockedFetchAllLiquidations.mockResolvedValue({
			timestamp: 400,
			validThresholds: ['all'],
			tokens: {
				ethereum: {
					'ethereum:wsteth': { symbol: 'wstETH', decimals: 18 },
					'ethereum:eth': { symbol: 'ETH', decimals: 18 }
				},
				base: {
					'base:wsteth': { symbol: 'WSTETH', decimals: 18 }
				}
			},
			data: {
				'aave-v3': {
					ethereum: [
						{
							owner: '0x1',
							liqPrice: 1,
							collateral: 'ethereum:wsteth',
							collateralAmount: 10,
							collateralAmountUsd: 1000
						},
						{
							owner: '0x2',
							liqPrice: 2,
							collateral: 'ethereum:eth',
							collateralAmount: 20,
							collateralAmountUsd: 2000
						}
					]
				},
				'compound-v3': {
					base: [
						{
							owner: '0x3',
							liqPrice: 3,
							collateral: 'base:wsteth',
							collateralAmount: 30,
							collateralAmountUsd: 3000
						}
					]
				}
			}
		})

		const data = await getTokenLiquidationsSectionData('wsteth', metadata)

		expect(data).not.toBeNull()
		expect(data?.tokenSymbol).toBe('WSTETH')
		expect(data?.positionCount).toBe(2)
		expect(data?.protocolCount).toBe(2)
		expect(data?.chainCount).toBe(2)
		expect(data?.totalCollateralUsd).toBe(4000)
		expect(data?.distributionChart.tokens).toHaveLength(1)
		expect(data?.distributionChart.tokens[0]?.key).toBe('WSTETH')
		expect(data?.protocolRows[0]).toEqual({
			id: 'aave-v3',
			name: 'Aave V3',
			slug: 'aave-v3',
			positionCount: 1,
			chainCount: 1,
			collateralCount: 1,
			totalCollateralUsd: 1000
		})
		expect(data?.chainRows[0]).toEqual({
			id: 'base',
			name: 'Base',
			slug: 'base',
			positionCount: 1,
			protocolCount: 1,
			collateralCount: 1,
			totalCollateralUsd: 3000
		})
	})

	it('builds protocol and token liquidations data from a raw snapshot without network fetches', () => {
		const protocolsResponse: RawProtocolsResponse = { protocols: ['maker'] }
		const allResponse: RawAllLiquidationsResponse = {
			timestamp: 200,
			validThresholds: ['all'],
			tokens: {
				arbitrum: {
					'ethereum:wsteth': { symbol: 'wstETH', decimals: 18 }
				}
			},
			data: {
				maker: {
					arbitrum: [
						{
							owner: '0x1',
							liqPrice: 1,
							collateral: 'ethereum:wsteth',
							collateralAmount: 10,
							collateralAmountUsd: 1000
						}
					]
				}
			}
		}

		const protocolData = buildLiquidationsProtocolPageData(
			'maker',
			protocolsResponse.protocols,
			allResponse.data.maker,
			allResponse.timestamp,
			[],
			metadata
		)
		const tokenData = buildTokenLiquidationsSectionData('wsteth', protocolsResponse, allResponse, metadata)

		expect(protocolData.positionCount).toBe(1)
		expect(protocolData.chainRows[0]?.id).toBe('arbitrum')
		expect(tokenData?.positionCount).toBe(1)
		expect(tokenData?.tokenSymbol).toBe('WSTETH')
	})
})
