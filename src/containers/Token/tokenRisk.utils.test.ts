import { describe, expect, it } from 'vitest'
import type { TokenRiskLendingExposuresResponse } from './api.types'
import {
	buildExposuresSection,
	filterTokenRiskCandidatesWithData,
	indexExposuresByAssetKey,
	inferTokenRiskCandidatesFromExposures,
	mergeIndexedExposures,
	resolveTokenRiskCandidates
} from './tokenRisk.utils'

const methodologies: TokenRiskLendingExposuresResponse['methodologies'] = {
	asset: 'Asset',
	chain: 'Chain',
	protocol: 'Protocol',
	collateralMaxBorrowUsd: 'Max borrow',
	collateralBorrowedDebtUsd: 'Borrowed debt'
}

function createExposure(
	overrides: Partial<TokenRiskLendingExposuresResponse['exposures'][number]>
): TokenRiskLendingExposuresResponse['exposures'][number] {
	return {
		asset: {
			symbol: 'USDC',
			address: '0xAsset',
			priceUsd: 1
		},
		chain: 'ethereum',
		protocol: 'aave-v3',
		collateralMaxBorrowUsd: 1000,
		collateralBorrowedDebtUsd: 400,
		...overrides
	}
}

describe('tokenRisk utils', () => {
	it('resolves token risk candidates from llamaswap metadata and dedupes by chain/address', () => {
		const candidates = resolveTokenRiskCandidates('usdc', {
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

	it('indexes exposures by chain-address key and merges rows across candidates', () => {
		const exposures = [
			createExposure({
				asset: { symbol: 'USDC', address: '0xAsset1', priceUsd: 1 }
			}),
			createExposure({
				chain: 'base',
				asset: { symbol: 'USDC', address: '0xAsset2', priceUsd: 1 }
			})
		]

		const indexedExposures = indexExposuresByAssetKey(exposures)
		const merged = mergeIndexedExposures(indexedExposures, ['ethereum:0xasset1', 'base:0xasset2'])

		expect(merged).toHaveLength(2)
	})

	it('infers token risk candidates from exposure symbols', () => {
		const candidates = inferTokenRiskCandidatesFromExposures({
			tokenSymbol: 'WSTETH',
			exposures: [
				createExposure({
					asset: { symbol: 'wstETH', address: '0xAsset1', priceUsd: 100 }
				}),
				createExposure({
					chain: 'base',
					asset: { symbol: 'WSTETH', address: '0xAsset2', priceUsd: 100 }
				})
			],
			chainDisplayNames: new Map([
				['ethereum', 'Ethereum'],
				['base', 'Base']
			])
		})

		expect(candidates).toEqual([
			{
				key: 'ethereum:0xasset1',
				chain: 'ethereum',
				address: '0xasset1',
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

	it('filters scope candidates down to assets that have exposure data', () => {
		const indexedExposures = indexExposuresByAssetKey([
			createExposure({
				chain: 'ethereum',
				asset: { symbol: 'USDC', address: '0xAsset', priceUsd: 1 }
			})
		])
		const candidates = [
			{ key: 'ethereum:0xasset', chain: 'ethereum', address: '0xasset', displayName: 'Ethereum' },
			{ key: 'base:0x8335', chain: 'base', address: '0x8335', displayName: 'Base' }
		]

		expect(filterTokenRiskCandidatesWithData(candidates, indexedExposures)).toEqual([candidates[0]])
	})

	it('builds exposure rows and null-propagates borrowed-debt totals', () => {
		const section = buildExposuresSection(
			[
				createExposure({
					protocol: 'aave-v3',
					collateralMaxBorrowUsd: 1000,
					collateralBorrowedDebtUsd: 400
				}),
				createExposure({
					protocol: 'morpho-blue',
					collateralMaxBorrowUsd: 500,
					collateralBorrowedDebtUsd: null
				})
			],
			methodologies
		)

		expect(section.rows).toHaveLength(2)
		expect(section.summary.totalCollateralMaxBorrowUsd).toBe(1500)
		expect(section.summary.totalCollateralBorrowedDebtUsd).toBeNull()
		expect(section.summary.borrowedDebtKnownCount).toBe(1)
		expect(section.summary.borrowedDebtUnknownCount).toBe(1)
	})

	it('dedupes identical protocol-chain-asset rows and sums known borrowed debt', () => {
		const section = buildExposuresSection(
			[
				createExposure({
					protocol: 'aave-v3',
					collateralMaxBorrowUsd: 100,
					collateralBorrowedDebtUsd: 10
				}),
				createExposure({
					protocol: 'aave-v3',
					collateralMaxBorrowUsd: 25,
					collateralBorrowedDebtUsd: 5
				})
			],
			methodologies
		)

		expect(section.rows).toHaveLength(1)
		expect(section.rows[0].collateralMaxBorrowUsd).toBe(125)
		expect(section.rows[0].collateralBorrowedDebtUsd).toBe(15)
		expect(section.summary.totalCollateralBorrowedDebtUsd).toBe(15)
	})
})
