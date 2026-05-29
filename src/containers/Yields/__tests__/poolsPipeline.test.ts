import { describe, expect, expectTypeOf, it } from 'vitest'
import { buildPoolsTableRows, buildPoolsTrackingStats, mapPoolToYieldTableRow } from '../poolsPipeline'
import type { YieldView } from '../types'

const basePool = {
	pool: 'pool-1',
	symbol: 'ETH-USDC',
	project: 'aave-v3',
	projectName: 'Aave V3',
	airdrop: false,
	raiseValuation: null,
	chain: 'Ethereum',
	tvlUsd: 1000,
	apy: 5,
	apyBase: 3,
	apyReward: 2,
	rewardTokensSymbols: ['AAVE'],
	rewardTokensNames: ['Aave'],
	apyPct1D: 1,
	apyPct7D: 2,
	predictions: { predictedClass: 'Stable', binnedConfidence: 0.9 },
	url: '/pool',
	category: 'Lending',
	il7d: null,
	apyBase7d: 4,
	apyNet7d: 4.2,
	apyMean30d: 4.5,
	volumeUsd1d: 100,
	volumeUsd7d: 500,
	apyBaseInception: 6,
	apyIncludingLsdApy: 5,
	apyBaseIncludingLsdApy: 3,
	apyBaseBorrow: -1,
	apyRewardBorrow: 0.5,
	apyBorrow: -0.5,
	totalSupplyUsd: 10000,
	totalBorrowUsd: 4000,
	totalAvailableUsd: 6000,
	ltv: 0.75,
	lsdTokenOnly: false,
	poolMeta: 'v3',
	rewardMeta: 'reward info'
} as any

describe('mapPoolToYieldTableRow', () => {
	it('builds the canonical pools row shape from a normalized pool', () => {
		const row = mapPoolToYieldTableRow(basePool, {
			volatility: { 'pool-1': [null, 4.4, 0.9, 0.2] },
			holderStats: {
				'pool-1': {
					holderCount: 10,
					avgPositionUsd: 100,
					top10Pct: 80,
					top10Holders: null,
					tokenDecimals: null,
					holderChange7d: 2,
					holderChange30d: 3
				}
			},
			stablecoinInfoBySymbol: {
				usdc: { price: 1.001, pegDeviation: 0.1 }
			}
		})

		expect(row).toMatchObject({
			id: 'pool-1',
			rewardMeta: 'reward info',
			pool: 'ETH-USDC',
			configID: 'pool-1',
			projectslug: 'aave-v3',
			project: 'Aave V3',
			chains: ['Ethereum'],
			tvl: 1000,
			apyNet7d: 4.2,
			apyMedian30d: 4.4,
			apyStd30d: 0.9,
			cv30d: 0.2,
			holderCount: 10,
			top10Pct: 80,
			pegDeviation: 0.1
		})
	})
})

describe('buildPoolsTrackingStats', () => {
	it('ignores zero and nullish APYs when averaging', () => {
		const stats = buildPoolsTrackingStats([
			{ apy: 10 } as any,
			{ apy: 0 } as any,
			{ apy: null } as any,
			{ apy: 20 } as any
		])

		expect(stats.noOfPoolsTracked).toBe(4)
		expect(stats.averageAPY).toBe(15)
	})
})

describe('buildPoolsTableRows view defaults', () => {
	const defaultFilters = {
		selectedProjects: ['Aave V3'],
		selectedChains: ['Ethereum'],
		selectedAttributes: [],
		includeTokens: [],
		excludeTokens: [],
		exactTokens: [],
		selectedCategories: ['Lending'],
		pairTokens: [],
		minTvl: null,
		maxTvl: null,
		minApy: null,
		maxApy: null
	}

	const pools = [
		{ ...basePool, pool: 'active', symbol: 'ETH-USDC', apy: 5, stablecoin: false, ilRisk: 'yes' },
		{ ...basePool, pool: 'zero', symbol: 'ZERO-USDC', apy: 0, stablecoin: false, ilRisk: 'yes' },
		{ ...basePool, pool: 'stable', symbol: 'USDC-USDT', apy: 2, stablecoin: true, ilRisk: 'no' },
		{ ...basePool, pool: 'stable-il', symbol: 'USDC-DAI', apy: 3, stablecoin: true, ilRisk: 'yes' }
	] as any[]

	function rowIdsForView(view: Parameters<typeof buildPoolsTableRows>[0]['view']) {
		return buildPoolsTableRows({
			pools,
			view,
			filters: defaultFilters,
			usdPeggedSymbols: ['usdc', 'usdt', 'dai'],
			tokenCategories: {}
		}).map((row) => row.configID)
	}

	it('requires callers to pass an explicit view', () => {
		expectTypeOf<Parameters<typeof buildPoolsTableRows>[0]>().toMatchTypeOf<{ view: YieldView }>()
	})

	it('keeps main zero-APY and stablecoins route defaults explicit', () => {
		expect(rowIdsForView('main')).toEqual(['active', 'stable', 'stable-il'])
		expect(rowIdsForView('stablecoins')).toEqual(['stable'])
	})

	it('applies no route defaults to overview, borrow, loop, and unknown views', () => {
		expect(rowIdsForView('overview')).toEqual(['active', 'zero', 'stable', 'stable-il'])
		expect(rowIdsForView('borrow')).toEqual(['active', 'zero', 'stable', 'stable-il'])
		expect(rowIdsForView('loop')).toEqual(['active', 'zero', 'stable', 'stable-il'])
		expect(rowIdsForView('unknown')).toEqual(['active', 'zero', 'stable', 'stable-il'])
	})
})
