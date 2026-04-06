import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCoinGeckoCoinsList } from '~/api/coingecko'
import {
	buildProtocolLlamaswapDataset,
	normalizeChainGeckoIdLlamaswapChains,
	protocolHasOnlyUnsupportedLlamaswapChains,
	sortProtocolLlamaswapChainsByMetadataOrder
} from './buy-on-llamaswap'

vi.mock('~/api/coingecko', () => ({
	fetchCoinGeckoCoinsList: vi.fn()
}))

const mockedFetchCoinGeckoCoinsList = vi.mocked(fetchCoinGeckoCoinsList)
const PROTOCOL_LLAMASWAP_API_URL = 'https://llamaswap.github.io/protocol-liquidity'
const LIQUIDITY_API_URL = 'https://defillama-datasets.llama.fi/liquidity.json'

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			'content-type': 'application/json'
		}
	})
}

function mockMetadataFetch({
	protocolDataset = {},
	liquidityDataset = []
}: {
	protocolDataset?: Record<string, unknown>
	liquidityDataset?: Array<Record<string, unknown>>
} = {}) {
	const fetchMock = vi.fn((input: string | URL | Request) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

		if (url === PROTOCOL_LLAMASWAP_API_URL) {
			return Promise.resolve(jsonResponse(protocolDataset))
		}

		if (url === LIQUIDITY_API_URL) {
			return Promise.resolve(jsonResponse(liquidityDataset))
		}

		return Promise.reject(new Error(`Unexpected fetch: ${url}`))
	})

	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

beforeEach(() => {
	mockedFetchCoinGeckoCoinsList.mockReset()
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.clearAllMocks()
})

describe('protocolHasOnlyUnsupportedLlamaswapChains', () => {
	it('excludes protocols whose metadata chains are entirely unsupported by LlamaSwap', () => {
		expect(
			protocolHasOnlyUnsupportedLlamaswapChains({
				chains: ['Solana']
			})
		).toBe(true)
	})

	it('keeps protocols that have at least one supported chain in metadata', () => {
		expect(
			protocolHasOnlyUnsupportedLlamaswapChains({
				chains: ['Solana', 'Unichain']
			})
		).toBe(false)
	})

	it('does not exclude protocols that are missing chain metadata', () => {
		expect(protocolHasOnlyUnsupportedLlamaswapChains({})).toBe(false)
		expect(protocolHasOnlyUnsupportedLlamaswapChains(null)).toBe(false)
	})
})

describe('normalizeChainGeckoIdLlamaswapChains', () => {
	it('puts the native chain first for chain gecko ids and removes best flags', () => {
		expect(
			normalizeChainGeckoIdLlamaswapChains(
				[
					{
						chain: 'ethereum',
						address: '0xeth',
						displayName: 'Ethereum',
						best: true
					},
					{
						chain: 'polygon',
						address: '0xpoly',
						displayName: 'Polygon POS'
					}
				],
				{
					name: 'Polygon',
					id: 'polygon-pos',
					gecko_id: 'polygon-ecosystem-token'
				}
			)
		).toEqual([
			{
				chain: 'polygon',
				address: '0xpoly',
				displayName: 'Polygon POS'
			},
			{
				chain: 'ethereum',
				address: '0xeth',
				displayName: 'Ethereum'
			}
		])
	})

	it('still removes best flags when the native chain is already first', () => {
		expect(
			normalizeChainGeckoIdLlamaswapChains(
				[
					{
						chain: 'polygon',
						address: '0xpoly',
						displayName: 'Polygon POS',
						best: true
					},
					{
						chain: 'ethereum',
						address: '0xeth',
						displayName: 'Ethereum'
					}
				],
				{
					name: 'Polygon',
					id: 'polygon-pos',
					gecko_id: 'polygon-ecosystem-token'
				}
			)
		).toEqual([
			{
				chain: 'polygon',
				address: '0xpoly',
				displayName: 'Polygon POS'
			},
			{
				chain: 'ethereum',
				address: '0xeth',
				displayName: 'Ethereum'
			}
		])
	})
})

describe('sortProtocolLlamaswapChainsByMetadataOrder', () => {
	it('sorts supported LlamaSwap chains by protocol metadata chain order', () => {
		expect(
			sortProtocolLlamaswapChainsByMetadataOrder(
				[
					{
						chain: 'base',
						address: '0xbase',
						displayName: 'Base'
					},
					{
						chain: 'unichain',
						address: '0xuni',
						displayName: 'Unichain'
					}
				],
				{
					chains: ['Solana', 'Unichain', 'Base']
				}
			)
		).toEqual([
			{
				chain: 'unichain',
				address: '0xuni',
				displayName: 'Unichain'
			},
			{
				chain: 'base',
				address: '0xbase',
				displayName: 'Base'
			}
		])
	})

	it('appends unmatched chains after the metadata-ordered matches', () => {
		expect(
			sortProtocolLlamaswapChainsByMetadataOrder(
				[
					{
						chain: 'base',
						address: '0xbase',
						displayName: 'Base'
					},
					{
						chain: 'sonic',
						address: '0xsonic',
						displayName: 'Sonic'
					},
					{
						chain: 'unichain',
						address: '0xuni',
						displayName: 'Unichain'
					}
				],
				{
					chains: ['Unichain', 'Base']
				}
			)
		).toEqual([
			{
				chain: 'unichain',
				address: '0xuni',
				displayName: 'Unichain'
			},
			{
				chain: 'base',
				address: '0xbase',
				displayName: 'Base'
			},
			{
				chain: 'sonic',
				address: '0xsonic',
				displayName: 'Sonic'
			}
		])
	})
})

describe('buildProtocolLlamaswapDataset', () => {
	it('uses pool-coverage-ranked CoinGecko chains when GitHub has no entry and excludes zero-coverage chains', async () => {
		mockedFetchCoinGeckoCoinsList.mockResolvedValue([
			{
				id: 'token-a',
				symbol: 'TKA',
				name: 'Token A',
				platforms: {
					ethereum: '0x00000000000000000000000000000000000000a1',
					base: '0x00000000000000000000000000000000000000b1',
					'arbitrum-one': '0x00000000000000000000000000000000000000c1'
				}
			}
		] as Awaited<ReturnType<typeof fetchCoinGeckoCoinsList>>)

		mockMetadataFetch({
			liquidityDataset: [
				{
					id: 'foo',
					tokenPools: [
						{
							chain: 'Ethereum',
							tvlUsd: 10,
							underlyingTokens: ['0x00000000000000000000000000000000000000A1']
						},
						{
							chain: 'Base',
							tvlUsd: 50,
							underlyingTokens: [
								'0x00000000000000000000000000000000000000f1',
								'0x00000000000000000000000000000000000000f2',
								'0x00000000000000000000000000000000000000B1'
							]
						},
						{
							chain: 'Arbitrum',
							tvlUsd: 0,
							underlyingTokens: ['0x00000000000000000000000000000000000000C1']
						},
						{
							chain: 'Solana',
							tvlUsd: 999,
							underlyingTokens: ['0x00000000000000000000000000000000000000A1']
						}
					]
				}
			]
		})

		const dataset = await buildProtocolLlamaswapDataset({
			chains: {},
			protocols: {
				tokenA: {
					gecko_id: 'token-a',
					chains: ['Ethereum', 'Base', 'Arbitrum']
				}
			}
		})

		expect(dataset['token-a']).toEqual([
			{
				chain: 'base',
				address: '0x00000000000000000000000000000000000000b1',
				displayName: 'Base'
			},
			{
				chain: 'ethereum',
				address: '0x00000000000000000000000000000000000000a1',
				displayName: 'Ethereum'
			}
		])
	})

	it('preserves GitHub ordering and only appends missing pool-coverage-ranked fallback chains', async () => {
		mockedFetchCoinGeckoCoinsList.mockResolvedValue([
			{
				id: 'token-b',
				symbol: 'TKB',
				name: 'Token B',
				platforms: {
					ethereum: '0x00000000000000000000000000000000000000d1',
					base: '0x00000000000000000000000000000000000000d2',
					'arbitrum-one': '0x00000000000000000000000000000000000000d3'
				}
			}
		] as Awaited<ReturnType<typeof fetchCoinGeckoCoinsList>>)

		mockMetadataFetch({
			protocolDataset: {
				'token-b': {
					name: 'Token B',
					slug: 'token-b',
					symbol: 'TB',
					geckoId: 'token-b',
					chains: [
						{
							chain: 'ethereum',
							chainId: 1,
							address: '0xgithub-eth',
							priceImpact: 0,
							liquidity: 50
						},
						{
							chain: 'base',
							chainId: 8453,
							address: '0xgithub-base',
							priceImpact: 0,
							liquidity: 40
						}
					]
				}
			},
			liquidityDataset: [
				{
					id: 'foo',
					tokenPools: [
						{
							chain: 'Arbitrum',
							tvlUsd: 300,
							underlyingTokens: ['0x00000000000000000000000000000000000000D3']
						},
						{
							chain: 'Ethereum',
							tvlUsd: 200,
							underlyingTokens: ['0x00000000000000000000000000000000000000D1']
						},
						{
							chain: 'Base',
							tvlUsd: 100,
							underlyingTokens: ['0x00000000000000000000000000000000000000D2']
						}
					]
				}
			]
		})

		const dataset = await buildProtocolLlamaswapDataset({
			chains: {},
			protocols: {
				tokenB: {
					gecko_id: 'token-b',
					chains: ['Ethereum', 'Base', 'Arbitrum']
				}
			}
		})

		expect(dataset['token-b']).toEqual([
			{
				chain: 'ethereum',
				address: '0xgithub-eth',
				displayName: 'Ethereum',
				best: true
			},
			{
				chain: 'base',
				address: '0xgithub-base',
				displayName: 'Base'
			},
			{
				chain: 'arbitrum',
				address: '0x00000000000000000000000000000000000000d3',
				displayName: 'Arbitrum'
			}
		])
	})

	it('keeps original CoinGecko platform order for equal or missing pool coverage matches', async () => {
		mockedFetchCoinGeckoCoinsList.mockResolvedValue([
			{
				id: 'token-c',
				symbol: 'TKC',
				name: 'Token C',
				platforms: {
					ethereum: '0x00000000000000000000000000000000000000e1',
					base: '0x00000000000000000000000000000000000000e2',
					'arbitrum-one': '0x00000000000000000000000000000000000000e3'
				}
			}
		] as Awaited<ReturnType<typeof fetchCoinGeckoCoinsList>>)

		mockMetadataFetch({
			liquidityDataset: [
				{
					id: 'foo',
					tokenPools: [
						{
							chain: 'Ethereum',
							tvlUsd: 10,
							underlyingTokens: ['0x00000000000000000000000000000000000000E1']
						},
						{
							chain: 'Base',
							tvlUsd: 10,
							underlyingTokens: ['0x00000000000000000000000000000000000000E2']
						}
					]
				}
			]
		})

		const dataset = await buildProtocolLlamaswapDataset({
			chains: {},
			protocols: {
				tokenC: {
					gecko_id: 'token-c',
					chains: ['Ethereum', 'Base', 'Arbitrum']
				}
			}
		})

		expect(dataset['token-c']).toEqual([
			{
				chain: 'ethereum',
				address: '0x00000000000000000000000000000000000000e1',
				displayName: 'Ethereum'
			},
			{
				chain: 'base',
				address: '0x00000000000000000000000000000000000000e2',
				displayName: 'Base'
			},
			{
				chain: 'arbitrum',
				address: '0x00000000000000000000000000000000000000e3',
				displayName: 'Arbitrum'
			}
		])
	})

	it('moves the native chain first for chain gecko ids after merging GitHub and fallback chains', async () => {
		mockedFetchCoinGeckoCoinsList.mockResolvedValue([
			{
				id: 'polygon-pos',
				symbol: 'MATIC',
				name: 'Polygon',
				platforms: {
					ethereum: '0x00000000000000000000000000000000000000f1',
					'polygon-pos': '0x00000000000000000000000000000000000000f2'
				}
			}
		] as Awaited<ReturnType<typeof fetchCoinGeckoCoinsList>>)

		mockMetadataFetch({
			protocolDataset: {
				'polygon-pos': {
					name: 'Polygon',
					slug: 'polygon',
					symbol: 'POL',
					geckoId: 'polygon-pos',
					chains: [
						{
							chain: 'ethereum',
							chainId: 1,
							address: '0xgithub-eth',
							priceImpact: 0,
							liquidity: 50
						}
					]
				}
			},
			liquidityDataset: [
				{
					id: 'foo',
					tokenPools: [
						{
							chain: 'Polygon',
							tvlUsd: 25,
							underlyingTokens: ['0x00000000000000000000000000000000000000F2']
						}
					]
				}
			]
		})

		const dataset = await buildProtocolLlamaswapDataset({
			chains: {
				Polygon: {
					name: 'Polygon',
					id: 'polygon-pos',
					gecko_id: 'polygon-pos'
				}
			},
			protocols: {}
		})

		expect(dataset['polygon-pos']).toEqual([
			{
				chain: 'polygon',
				address: '0x00000000000000000000000000000000000000f2',
				displayName: 'Polygon POS'
			},
			{
				chain: 'ethereum',
				address: '0xgithub-eth',
				displayName: 'Ethereum'
			}
		])
	})
})
