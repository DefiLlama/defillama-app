import { describe, expect, it } from 'vitest'
import type { TokenRiskBorrowCapacityResponse } from '../api.types'
import {
	buildExposuresSection,
	filterTokenRiskCandidatesWithData,
	indexBorrowCapacityByAssetKey,
	inferTokenRiskCandidatesFromBorrowCapacity,
	mergeIndexedBorrowCapacity,
	mergeTokenRiskCandidates,
	resolveTokenRiskCandidates
} from '../tokenRisk.utils'

const methodologies: TokenRiskBorrowCapacityResponse['methodologies'] = {
	asset: 'Asset',
	chain: 'Chain',
	protocol: 'Protocol',
	collateralMaxBorrowUsdGovernance: 'Governance max borrow',
	collateralMaxBorrowUsdLiquidity: 'Liquidity max borrow',
	collateralBorrowedDebtUsd: 'Borrowed debt',
	minBadDebtAtPriceZeroUsd: 'Min bad debt at zero'
}

function createTokenEntry(
	overrides: Partial<TokenRiskBorrowCapacityResponse['tokens'][number]>
): TokenRiskBorrowCapacityResponse['tokens'][number] {
	return {
		asset: {
			symbol: 'USDC',
			address: '0xAsset',
			priceUsd: 1
		},
		chain: 'ethereum',
		totals: {
			collateralMaxBorrowUsdGovernance: 1100,
			collateralMaxBorrowUsdLiquidity: 1000,
			collateralBorrowedDebtUsd: 400,
			minBadDebtAtPriceZeroUsd: 400
		},
		byProtocol: [
			{
				protocol: 'aave-v3',
				collateralMaxBorrowUsdGovernance: 1100,
				collateralMaxBorrowUsdLiquidity: 1000,
				collateralBorrowedDebtUsd: 400,
				minBadDebtAtPriceZeroUsd: 400
			}
		],
		...overrides
	}
}

describe('tokenRisk utils', () => {
	it('resolves token risk candidates from llamaswap metadata and dedupes by chain/address', () => {
		const candidates = resolveTokenRiskCandidates('usdc', 'USDC', {
			usdc: [
				{ chain: 'Ethereum', address: '0xA0b8', displayName: 'Ethereum' },
				{ chain: 'ethereum', address: '0xa0b8', displayName: 'Ethereum duplicate' },
				{ chain: 'base', address: '0x8335', displayName: 'Base' }
			]
		})

		expect(candidates).toEqual([
			{
				key: 'ethereum:0xa0b8',
				chain: 'Ethereum',
				address: '0xa0b8',
				displayName: 'Ethereum'
			},
			{
				key: 'base:0x8335',
				chain: 'base',
				address: '0x8335',
				displayName: 'Base'
			}
		])
	})

	it('indexes borrow capacity by chain-address key and merges rows across candidates', () => {
		const tokens = [
			createTokenEntry({
				asset: { symbol: 'USDC', address: '0xAsset1', priceUsd: 1 }
			}),
			createTokenEntry({
				chain: 'base',
				asset: { symbol: 'USDC', address: '0xAsset2', priceUsd: 1 }
			})
		]

		const indexedTokens = indexBorrowCapacityByAssetKey(tokens)
		const merged = mergeIndexedBorrowCapacity(indexedTokens, ['ethereum:0xasset1', 'base:0xasset2'])

		expect(merged).toHaveLength(2)
	})

	it('canonicalizes native token sentinel addresses when indexing borrow capacity', () => {
		const tokens = [
			createTokenEntry({
				asset: { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', priceUsd: 3000 }
			}),
			createTokenEntry({
				asset: { symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', priceUsd: 3000 }
			})
		]

		const indexedTokens = indexBorrowCapacityByAssetKey(tokens)
		const merged = mergeIndexedBorrowCapacity(indexedTokens, ['ethereum:native:eth'])

		expect(indexedTokens.get('ethereum:native:eth')).toHaveLength(2)
		expect(merged).toHaveLength(2)
	})

	it('infers token risk candidates from borrow capacity symbols and native wrapped aliases', () => {
		const candidates = inferTokenRiskCandidatesFromBorrowCapacity({
			tokenSymbol: 'ETH',
			tokens: [
				createTokenEntry({
					asset: { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', priceUsd: 100 }
				}),
				createTokenEntry({
					chain: 'base',
					asset: { symbol: 'WETH', address: '0xAsset2', priceUsd: 100 }
				}),
				createTokenEntry({
					chain: 'ethereum',
					asset: { symbol: 'WBTC', address: '0xBtc', priceUsd: 100 }
				})
			],
			chainDisplayNames: new Map([
				['ethereum', 'Ethereum'],
				['base', 'Base']
			])
		})

		expect(candidates).toEqual([
			{
				key: 'ethereum:native:eth',
				chain: 'ethereum',
				address: '0x0000000000000000000000000000000000000000',
				displayName: 'Ethereum'
			},
			{
				key: 'base:0xasset2',
				chain: 'base',
				address: '0xasset2',
				displayName: 'Base'
			}
		])
	})

	it('dedupes merged token risk candidates by key while preserving primary metadata order', () => {
		const candidates = mergeTokenRiskCandidates(
			[
				{
					key: 'ethereum:native:eth',
					chain: 'ethereum',
					address: '0x0000000000000000000000000000000000000000',
					displayName: 'Ethereum'
				}
			],
			[
				{
					key: 'ethereum:native:eth',
					chain: 'ethereum',
					address: '0x0000000000000000000000000000000000000000',
					displayName: 'Ethereum duplicate'
				},
				{
					key: 'optimism:native:eth',
					chain: 'optimism',
					address: '0x0000000000000000000000000000000000000000',
					displayName: 'Optimism'
				}
			]
		)

		expect(candidates).toEqual([
			{
				key: 'ethereum:native:eth',
				chain: 'ethereum',
				address: '0x0000000000000000000000000000000000000000',
				displayName: 'Ethereum'
			},
			{
				key: 'optimism:native:eth',
				chain: 'optimism',
				address: '0x0000000000000000000000000000000000000000',
				displayName: 'Optimism'
			}
		])
	})

	it('filters scope candidates down to assets that have borrow capacity data', () => {
		const indexedTokens = indexBorrowCapacityByAssetKey([
			createTokenEntry({
				chain: 'ethereum',
				asset: { symbol: 'USDC', address: '0xAsset', priceUsd: 1 }
			})
		])
		const candidates = [
			{ key: 'ethereum:0xasset', chain: 'ethereum', address: '0xasset', displayName: 'Ethereum' },
			{ key: 'base:0x8335', chain: 'base', address: '0x8335', displayName: 'Base' }
		]

		expect(filterTokenRiskCandidatesWithData(candidates, indexedTokens)).toEqual([candidates[0]])
	})

	it('builds rows from protocol-level liquidity borrow capacity and keeps current exposure partial when needed', () => {
		const section = buildExposuresSection(
			[
				createTokenEntry({
					totals: {
						collateralMaxBorrowUsdGovernance: 1800,
						collateralMaxBorrowUsdLiquidity: 1500,
						collateralBorrowedDebtUsd: null,
						minBadDebtAtPriceZeroUsd: 400
					},
					byProtocol: [
						{
							protocol: 'aave-v3',
							collateralMaxBorrowUsdGovernance: 1200,
							collateralMaxBorrowUsdLiquidity: 1000,
							collateralBorrowedDebtUsd: 400,
							minBadDebtAtPriceZeroUsd: 400
						},
						{
							protocol: 'morpho-blue',
							collateralMaxBorrowUsdGovernance: null,
							collateralMaxBorrowUsdLiquidity: 500,
							collateralBorrowedDebtUsd: null,
							minBadDebtAtPriceZeroUsd: null
						}
					]
				})
			],
			methodologies
		)

		expect(section.rows).toHaveLength(2)
		expect(section.summary.totalCurrentMaxBorrowUsd).toBe(1500)
		expect(section.summary.totalMinBadDebtAtPriceZeroUsd).toBe(400)
		expect(section.summary.minBadDebtKnownCount).toBe(1)
		expect(section.summary.minBadDebtUnknownCount).toBe(1)
		expect(section.rows[0].currentMaxBorrowUsd).toBe(1000)
		expect(section.rows[0]).not.toHaveProperty('collateralBorrowedDebtUsd')
		expect(section.rows[0].minBadDebtAtPriceZeroCoverage).toBe('known')
		expect(section.rows[1].minBadDebtAtPriceZeroCoverage).toBe('unavailable')
	})

	it('dedupes identical protocol-chain-asset rows and sums liquidity-based max borrow', () => {
		const section = buildExposuresSection(
			[
				createTokenEntry({
					totals: {
						collateralMaxBorrowUsdGovernance: 100,
						collateralMaxBorrowUsdLiquidity: 100,
						collateralBorrowedDebtUsd: 10,
						minBadDebtAtPriceZeroUsd: 10
					},
					byProtocol: [
						{
							protocol: 'aave-v3',
							collateralMaxBorrowUsdGovernance: 100,
							collateralMaxBorrowUsdLiquidity: 100,
							collateralBorrowedDebtUsd: 10,
							minBadDebtAtPriceZeroUsd: 10
						}
					]
				}),
				createTokenEntry({
					totals: {
						collateralMaxBorrowUsdGovernance: 25,
						collateralMaxBorrowUsdLiquidity: 25,
						collateralBorrowedDebtUsd: 5,
						minBadDebtAtPriceZeroUsd: 5
					},
					byProtocol: [
						{
							protocol: 'aave-v3',
							collateralMaxBorrowUsdGovernance: 25,
							collateralMaxBorrowUsdLiquidity: 25,
							collateralBorrowedDebtUsd: 5,
							minBadDebtAtPriceZeroUsd: 5
						}
					]
				})
			],
			methodologies
		)

		expect(section.rows).toHaveLength(1)
		expect(section.rows[0].currentMaxBorrowUsd).toBe(125)
		expect(section.rows[0].minBadDebtAtPriceZeroUsd).toBe(15)
		expect(section.rows[0].minBadDebtAtPriceZeroCoverage).toBe('known')
		expect(section.summary.totalCurrentMaxBorrowUsd).toBe(125)
		expect(section.summary.totalMinBadDebtAtPriceZeroUsd).toBe(15)
	})

	it('marks zero-price bad debt as partial when grouped rows mix known and null values', () => {
		const section = buildExposuresSection(
			[
				createTokenEntry({
					byProtocol: [
						{
							protocol: 'fluid',
							collateralMaxBorrowUsdGovernance: 200,
							collateralMaxBorrowUsdLiquidity: 200,
							collateralBorrowedDebtUsd: 100,
							minBadDebtAtPriceZeroUsd: 100
						}
					]
				}),
				createTokenEntry({
					byProtocol: [
						{
							protocol: 'fluid',
							collateralMaxBorrowUsdGovernance: 50,
							collateralMaxBorrowUsdLiquidity: 50,
							collateralBorrowedDebtUsd: null,
							minBadDebtAtPriceZeroUsd: null
						}
					]
				})
			],
			methodologies
		)

		expect(section.rows).toHaveLength(1)
		expect(section.rows[0].minBadDebtAtPriceZeroUsd).toBe(100)
		expect(section.rows[0].minBadDebtAtPriceZeroCoverage).toBe('partial')
		expect(section.summary.totalMinBadDebtAtPriceZeroUsd).toBe(100)
		expect(section.summary.minBadDebtKnownCount).toBe(0)
		expect(section.summary.minBadDebtUnknownCount).toBe(1)
	})

	it('keeps zero-price bad debt unavailable when every merged contribution is null', () => {
		const section = buildExposuresSection(
			[
				createTokenEntry({
					byProtocol: [
						{
							protocol: 'morpho-blue',
							collateralMaxBorrowUsdGovernance: null,
							collateralMaxBorrowUsdLiquidity: 100,
							collateralBorrowedDebtUsd: null,
							minBadDebtAtPriceZeroUsd: null
						}
					]
				}),
				createTokenEntry({
					byProtocol: [
						{
							protocol: 'morpho-blue',
							collateralMaxBorrowUsdGovernance: null,
							collateralMaxBorrowUsdLiquidity: 50,
							collateralBorrowedDebtUsd: null,
							minBadDebtAtPriceZeroUsd: null
						}
					]
				})
			],
			methodologies
		)

		expect(section.rows).toHaveLength(1)
		expect(section.rows[0].minBadDebtAtPriceZeroUsd).toBeNull()
		expect(section.rows[0].minBadDebtAtPriceZeroCoverage).toBe('unavailable')
		expect(section.summary.totalMinBadDebtAtPriceZeroUsd).toBeNull()
		expect(section.summary.minBadDebtKnownCount).toBe(0)
		expect(section.summary.minBadDebtUnknownCount).toBe(1)
	})

	it('filters out protocol rows with zero borrowable capacity and no current exposure', () => {
		const section = buildExposuresSection(
			[
				createTokenEntry({
					totals: {
						collateralMaxBorrowUsdGovernance: 125,
						collateralMaxBorrowUsdLiquidity: 125,
						collateralBorrowedDebtUsd: 1.64,
						minBadDebtAtPriceZeroUsd: 1.64
					},
					byProtocol: [
						{
							protocol: 'morpho-v1',
							collateralMaxBorrowUsdGovernance: 125,
							collateralMaxBorrowUsdLiquidity: 125,
							collateralBorrowedDebtUsd: 1.64,
							minBadDebtAtPriceZeroUsd: 1.64
						},
						{
							protocol: 'aave-v3',
							collateralMaxBorrowUsdGovernance: 0,
							collateralMaxBorrowUsdLiquidity: 0,
							collateralBorrowedDebtUsd: null,
							minBadDebtAtPriceZeroUsd: null
						},
						{
							protocol: 'compound-v2',
							collateralMaxBorrowUsdGovernance: 0,
							collateralMaxBorrowUsdLiquidity: 0,
							collateralBorrowedDebtUsd: null,
							minBadDebtAtPriceZeroUsd: 0
						}
					]
				})
			],
			methodologies
		)

		expect(section.rows).toHaveLength(1)
		expect(section.rows[0].protocol).toBe('morpho-v1')
		expect(section.summary.exposureCount).toBe(1)
		expect(section.summary.protocolCount).toBe(1)
	})
})
