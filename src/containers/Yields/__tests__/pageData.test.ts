import { describe, expect, it } from 'vitest'
import { formatYieldsPageData } from '../normalizers/pageData'

describe('Yields page data normalizer', () => {
	it('keeps YieldPool as an explicit whitelist and drops arbitrary raw API fields', () => {
		const result = formatYieldsPageData({
			poolsData: {
				data: [
					{
						pool: 'pool-1',
						chain: 'Ethereum',
						project: 'test-project',
						symbol: 'ETH-USDC',
						tvlUsd: 1_000,
						apy: 5,
						apyBase: 4,
						apyReward: 1,
						rewardTokens: ['0xreward'],
						underlyingTokens: [],
						stablecoin: false,
						exposure: 'multi',
						ilRisk: 'yes',
						outlier: false,
						predictions: {
							predictedClass: 'Stable/Up',
							binnedConfidence: 3
						},
						apyBase7d: 4,
						il7d: -0.01,
						arbitraryRawField: 'drop-me'
					} as any,
					{
						pool: 'pool-2',
						chain: 'Ethereum',
						project: 'test-project',
						symbol: 'WEETH',
						tvlUsd: 2_000,
						apy: 3,
						apyBase: 3,
						apyReward: null,
						rewardTokens: [],
						underlyingTokens: [],
						stablecoin: false,
						exposure: 'single',
						ilRisk: 'no',
						outlier: false,
						predictions: {
							predictedClass: 'Stable/Up',
							binnedConfidence: 3
						},
						apyBase7d: 2.59448,
						il7d: null
					} as any
				]
			},
			configData: {
				protocols: {
					'test-project': {
						name: 'Test Project',
						symbol: 'TEST',
						audits: '1',
						category: 'Dexes'
					}
				}
			},
			urlsData: {
				'pool-1': 'https://example.com'
			},
			chainsData: [{ name: 'Ethereum', tokenSymbol: 'ETH', chainId: 1 }],
			protocolsData: { protocols: [], parentProtocols: [] }
		})

		expect(result.pools).toHaveLength(2)
		expect(result.pools[0]).not.toHaveProperty('arbitraryRawField')
		expect(result.pools[0].apyNet7d).toBeCloseTo(3.48)
		expect(result.pools[1].apyNet7d).toBeNull()
	})
})
