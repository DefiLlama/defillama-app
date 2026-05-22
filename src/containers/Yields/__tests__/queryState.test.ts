import { describe, expect, it } from 'vitest'
import { decodePoolsColumnVisibilityQuery, decodeYieldsQuery } from '../queryState'

describe('decodeYieldsQuery', () => {
	it('applies include, exclude, range, and ALL_EVM semantics consistently', () => {
		const decoded = decodeYieldsQuery(
			{
				project: ['Aave', 'Compound'],
				excludeProject: 'Compound',
				chain: 'ALL_EVM',
				excludeChain: 'Arbitrum',
				attribute: ['single_exposure', 'no_il'],
				token: ['ETH', 'WBTC'],
				excludeToken: 'WBTC',
				exactToken: 'ETH',
				token_pair: 'ETH-USDC',
				minTvl: '1000',
				maxApy: '12'
			},
			{
				projectList: ['Aave', 'Compound', 'Morpho'],
				chainList: ['Ethereum', 'Arbitrum', 'Solana'],
				evmChains: ['Ethereum', 'Arbitrum']
			}
		)

		expect(decoded.selectedProjects).toEqual(['Aave'])
		expect(decoded.selectedChains).toEqual(['Ethereum'])
		expect(decoded.selectedAttributes).toEqual(['single_exposure', 'no_il'])
		expect(decoded.includeTokens).toEqual(['ETH', 'WBTC'])
		expect(decoded.excludeTokens).toEqual(['WBTC'])
		expect(decoded.exactTokens).toEqual(['ETH'])
		expect(decoded.pairTokens).toEqual(['ETH-USDC'])
		expect(decoded.minTvl).toBe(1000)
		expect(decoded.maxApy).toBe(12)
	})
})

describe('decodePoolsColumnVisibilityQuery', () => {
	it('keeps base columns stable and blocks premium-only fields without access', () => {
		const visibility = decodePoolsColumnVisibilityQuery(
			{
				show7dBaseApy: 'true',
				showMedianApy: 'true',
				showStdDev: 'true'
			},
			{
				hasPremiumAccess: false,
				includeLsdApy: false,
				isStablecoinPage: false
			}
		)

		expect(visibility.apy).toBe(true)
		expect(visibility.apyBase).toBe(true)
		expect(visibility.apyBase7d).toBe(true)
		expect(visibility.apyMedian30d).toBe(false)
		expect(visibility.apyStd30d).toBe(false)
		expect(visibility.cv30d).toBe(true)
		expect(visibility.pegDeviation).toBe(false)
	})
})
