import { describe, expect, it } from 'vitest'
import type { ICategoriesAndTags, IChainMetadata } from '~/utils/metadata/types'
import { createRoutePhaseTimer } from '~/utils/perf'
import {
	getChainOverviewData,
	getChainOverviewMetricFilterOptions,
	getRwaActiveMcapForChain,
	hasRwaActiveMcapChain,
	shouldFetchChainDexs,
	shouldFetchChainPerps
} from '../queries.server'
import type { ILiteChart } from '../types'

const categoriesAndTagsMetadata = {
	categories: ['Dexs', 'Derivatives', 'OTC Marketplace'],
	tags: [],
	tagCategoryMap: {},
	configs: {
		Dexs: {
			category: 'Dexs',
			chains: ['ethereum'],
			slug: 'dexs',
			dexs: true
		},
		'OTC Marketplace': {
			category: 'OTC Marketplace',
			chains: ['provenance'],
			slug: 'otc-marketplace',
			dexs: true
		},
		Derivatives: {
			category: 'Derivatives',
			chains: ['ethereum'],
			slug: 'derivatives',
			perps: true
		}
	}
} satisfies ICategoriesAndTags

describe('shouldFetchChainDexs', () => {
	it('accepts an optional phase timer without changing missing-chain results', async () => {
		const phaseTimer = createRoutePhaseTimer()

		await expect(
			getChainOverviewData({
				chain: 'missing',
				chainMetadata: {},
				protocolMetadata: {},
				categoriesAndTagsMetadata,
				phaseTimer
			})
		).resolves.toBeNull()
		expect(phaseTimer.timings()).toEqual({})
	})

	it('skips dexs when the chain has the metadata flag but is not in the default Dexs category', () => {
		const provenance = {
			name: 'Provenance',
			id: 'provenance',
			dexs: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainDexs({
				chain: 'provenance',
				currentChainMetadata: provenance,
				categoriesAndTagsMetadata
			})
		).toBe(false)
	})

	it('fetches dexs when the chain id is in the default Dexs category', () => {
		const ethereum = {
			name: 'Ethereum',
			id: 'ethereum',
			dexs: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainDexs({
				chain: 'ethereum',
				currentChainMetadata: ethereum,
				categoriesAndTagsMetadata
			})
		).toBe(true)
	})

	it('keeps All chains dexs enabled', () => {
		const allChains = {
			name: 'All',
			id: 'all',
			dexs: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainDexs({
				chain: 'All',
				currentChainMetadata: allChains,
				categoriesAndTagsMetadata
			})
		).toBe(true)
	})
})

describe('shouldFetchChainPerps', () => {
	it('skips perps when the chain has the metadata flag but is not in the Derivatives category', () => {
		const xdc = {
			name: 'XDC',
			id: 'xdc',
			perps: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainPerps({
				chain: 'xdc',
				currentChainMetadata: xdc,
				categoriesAndTagsMetadata
			})
		).toBe(false)
	})

	it('fetches perps when the chain id is in the Derivatives category', () => {
		const ethereum = {
			name: 'Ethereum',
			id: 'ethereum',
			perps: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainPerps({
				chain: 'ethereum',
				currentChainMetadata: ethereum,
				categoriesAndTagsMetadata
			})
		).toBe(true)
	})

	it('keeps All chains perps enabled', () => {
		const allChains = {
			name: 'All',
			id: 'all',
			perps: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainPerps({
				chain: 'All',
				currentChainMetadata: allChains,
				categoriesAndTagsMetadata
			})
		).toBe(true)
	})
})

describe('getChainOverviewMetricFilterOptions', () => {
	const emptyFeeExtras = {
		chainNative: { bribes: null, tokenTax: null },
		app: { bribes: null, tokenTax: null }
	}
	const makeChartData = (staking: ILiteChart['staking']): ILiteChart => ({
		tvl: [],
		staking,
		borrowed: [],
		pool2: [],
		vesting: [],
		offers: [],
		doublecounted: [],
		liquidstaking: [],
		dcAndLsOverlap: []
	})

	it('exposes fee toggles only when visible fee metrics have matching extras', () => {
		const options = getChainOverviewMetricFilterOptions({
			chartData: makeChartData([['1', 1]]),
			chainFees: { total24h: 100 },
			chainRevenue: { total24h: null },
			appRevenue: { total24h: null },
			appFees: { total24h: null },
			feeExtras: {
				...emptyFeeExtras,
				chainNative: { bribes: { total24h: 20 }, tokenTax: null }
			}
		})

		expect(options.map((option) => option.key)).toEqual(['staking', 'bribes'])
	})

	it('exposes fee toggles when extras are the only visible fee metric value', () => {
		const options = getChainOverviewMetricFilterOptions({
			chartData: makeChartData([]),
			chainFees: { total24h: null },
			chainRevenue: { total24h: null },
			appRevenue: { total24h: null },
			appFees: { total24h: null },
			feeExtras: {
				...emptyFeeExtras,
				app: { bribes: null, tokenTax: { total24h: 30 } }
			}
		})

		expect(options.map((option) => option.key)).toEqual(['tokentax'])
	})

	it('exposes app-only extras even when chain-native base fee metrics are the only base fee values', () => {
		const options = getChainOverviewMetricFilterOptions({
			chartData: makeChartData([]),
			chainFees: { total24h: 100 },
			chainRevenue: { total24h: null },
			appRevenue: { total24h: null },
			appFees: { total24h: null },
			feeExtras: {
				...emptyFeeExtras,
				app: { bribes: { total24h: 30 }, tokenTax: null }
			}
		})

		expect(options.map((option) => option.key)).toEqual(['bribes'])
	})
})

describe('getRwaActiveMcapForChain', () => {
	const stats = {
		totalOnChainMcap: 120,
		totalActiveMcap: 90,
		totalDefiActiveTvl: 10,
		totalAssets: 1,
		totalIssuers: 1,
		byChain: {
			'XDC Network': {
				base: { onChainMcap: 120, activeMcap: 90, defiActiveTvl: 10, assetCount: 1, assetIssuers: ['Issuer A'] },
				stablecoinsOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
				governanceOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
				stablecoinsAndGovernance: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] }
			},
			EmptyChain: {
				base: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
				stablecoinsOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
				governanceOnly: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] },
				stablecoinsAndGovernance: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: [] }
			}
		},
		byCategory: {}
	}

	it('resolves active market cap by RWA chain slug', () => {
		expect(getRwaActiveMcapForChain(stats, 'XDC-Network')).toBe(90)
	})

	it('returns null for zero or missing active market cap', () => {
		expect(getRwaActiveMcapForChain(stats, 'EmptyChain')).toBeNull()
		expect(getRwaActiveMcapForChain(stats, 'Missing')).toBeNull()
	})
})

describe('hasRwaActiveMcapChain', () => {
	it('matches covered RWA chains by slug', () => {
		expect(hasRwaActiveMcapChain(['XDC Network'], 'xdc-network')).toBe(true)
	})

	it('skips missing RWA chains', () => {
		expect(hasRwaActiveMcapChain(['Ethereum'], 'Solana')).toBe(false)
		expect(hasRwaActiveMcapChain(null, 'Ethereum')).toBe(false)
	})
})
