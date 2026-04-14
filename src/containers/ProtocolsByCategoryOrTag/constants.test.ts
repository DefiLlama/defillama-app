import { describe, expect, it } from 'vitest'
import type { ICategoriesAndTags } from '~/utils/metadata/types'
import {
	getProtocolCategoryCapabilities,
	getProtocolCategoryChartMetricLabel,
	getProtocolCategoryChartMetrics,
	getProtocolCategoryColumns,
	getProtocolCategoryDefaultSort,
	getProtocolCategoryDexVolumeLabel,
	protocolCategoryConfig,
	resolveProtocolCategoryDataConfig
} from './constants'

const categoriesAndTags: ICategoriesAndTags = {
	categories: ['Dexs', 'RWA'],
	tags: ['StableSwap', 'Carbon Credits'],
	tagCategoryMap: {
		StableSwap: 'Dexs',
		'Carbon Credits': 'RWA'
	},
	configs: {
		Dexs: {
			category: 'Dexs',
			chains: ['ethereum'],
			slug: 'dexs',
			fees: true,
			revenue: true,
			dexs: true
		},
		StableSwap: {
			category: 'StableSwap',
			chains: ['ethereum'],
			slug: 'stableswap',
			fees: true,
			revenue: true
		},
		RWA: {
			category: 'RWA',
			chains: ['ethereum'],
			slug: 'rwa',
			fees: true
		},
		Interface: {
			category: 'Interface',
			chains: ['ethereum'],
			slug: 'interface',
			fees: true,
			revenue: true,
			dexs: true,
			dexAggregators: true,
			perps: true,
			perpsAggregators: true,
			bridgeAggregators: true,
			normalizedVolume: true,
			openInterest: true
		},
		Options: {
			category: 'Options',
			chains: ['ethereum'],
			slug: 'options',
			optionsPremiumVolume: true,
			optionsNotionalVolume: true
		},
		'Partially Algorithmic Stablecoin': {
			category: 'Partially Algorithmic Stablecoin',
			chains: ['ethereum'],
			slug: 'partially-algorithmic-stablecoin',
			dimAgg: {
				'aggregator-derivatives': {
					dv: { '24h': 1, '7d': 2, '30d': 3 }
				}
			}
		}
	}
}

describe('ProtocolsByCategoryOrTag constants', () => {
	it('resolves direct tag config before parent category config', () => {
		const dataConfig = resolveProtocolCategoryDataConfig({
			categoriesAndTags,
			tag: 'StableSwap',
			tagCategory: 'Dexs'
		})

		expect(dataConfig?.category).toBe('StableSwap')

		const capabilities = getProtocolCategoryCapabilities({
			dataConfig,
			effectiveCategory: 'Dexs'
		})

		expect(capabilities.dexVolume).toBe(false)
		expect(capabilities.fees).toBe(true)
		expect(capabilities.revenue).toBe(true)
	})

	it('falls back to the parent category config when the tag has no direct config', () => {
		const dataConfig = resolveProtocolCategoryDataConfig({
			categoriesAndTags,
			tag: 'Carbon Credits',
			tagCategory: 'RWA'
		})

		expect(dataConfig?.category).toBe('RWA')
	})

	it('derives columns and chart metrics from resolved capabilities', () => {
		expect(protocolCategoryConfig.Interface?.defaultChart).toBe('perpVolume')

		const capabilities = getProtocolCategoryCapabilities({
			dataConfig: categoriesAndTags.configs.Interface,
			effectiveCategory: 'Interface'
		})

		expect(getProtocolCategoryChartMetrics(capabilities)).toEqual([
			'tvl',
			'dexVolume',
			'dexAggregatorsVolume',
			'perpVolume',
			'perpsAggregatorsVolume',
			'bridgeAggregatorsVolume',
			'normalizedVolume',
			'openInterest'
		])
		expect(
			getProtocolCategoryColumns({
				effectiveCategory: 'Interface',
				metrics: capabilities
			})
		).toEqual([
			'name',
			'tvl',
			'perp_volume_30d',
			'perp_aggregator_volume_30d',
			'bridge_aggregator_volume_30d',
			'normalized_volume_30d',
			'dex_aggregator_volume_30d',
			'spot_volume_30d',
			'fees_30d',
			'revenue_30d',
			'openInterest',
			'perp_volume_7d',
			'perp_aggregator_volume_7d',
			'bridge_aggregator_volume_7d',
			'normalized_volume_7d',
			'dex_aggregator_volume_7d',
			'spot_volume_7d',
			'fees_7d',
			'revenue_7d',
			'perp_volume_24h',
			'perp_aggregator_volume_24h',
			'bridge_aggregator_volume_24h',
			'normalized_volume_24h',
			'dex_aggregator_volume_24h',
			'spot_volume_24h',
			'fees_24h',
			'revenue_24h',
			'mcap/tvl'
		])
		expect(
			getProtocolCategoryDefaultSort({
				effectiveCategory: 'Interface',
				metrics: capabilities
			})
		).toBe('perp_volume_24h')
	})

	it('falls back to the first visible derived metric column when no sort override exists', () => {
		const capabilities = getProtocolCategoryCapabilities({
			dataConfig: categoriesAndTags.configs.Dexs,
			effectiveCategory: 'Dexs'
		})

		expect(
			getProtocolCategoryDefaultSort({
				effectiveCategory: 'Dexs',
				metrics: capabilities
			})
		).toBe('dex_volume_7d')
	})

	it('prefers cache-driven options capabilities before legacy category fallback', () => {
		const capabilities = getProtocolCategoryCapabilities({
			dataConfig: categoriesAndTags.configs.Options,
			effectiveCategory: 'Options'
		})

		expect(capabilities.optionsPremiumVolume).toBe(true)
		expect(capabilities.optionsNotionalVolume).toBe(true)
	})

	it('detects perp aggregators from dimAgg when the top-level flag is absent', () => {
		const capabilities = getProtocolCategoryCapabilities({
			dataConfig: categoriesAndTags.configs['Partially Algorithmic Stablecoin'],
			effectiveCategory: 'Partially Algorithmic Stablecoin'
		})

		expect(capabilities.perpsAggregatorsVolume).toBe(true)
	})

	it('keeps legacy-only options capabilities without reading config dimAgg', () => {
		const capabilities = getProtocolCategoryCapabilities({
			dataConfig: null,
			effectiveCategory: 'Options'
		})

		expect(capabilities.optionsPremiumVolume).toBe(true)
		expect(capabilities.optionsNotionalVolume).toBe(true)
	})

	it('resolves category-aware dex volume labels for chart and table surfaces', () => {
		expect(getProtocolCategoryDexVolumeLabel('Dexs')).toBe('DEX Volume')
		expect(getProtocolCategoryDexVolumeLabel('DEX Aggregator')).toBe('DEX Aggregator Volume')
		expect(getProtocolCategoryDexVolumeLabel('Prediction Market')).toBe('Prediction Volume')
		expect(getProtocolCategoryDexVolumeLabel('Crypto Card Issuer')).toBe('Payment Volume')
		expect(getProtocolCategoryDexVolumeLabel('Interface')).toBe('Spot Volume')
		expect(getProtocolCategoryChartMetricLabel('dexVolume', 'Interface')).toBe('Spot Volume')
		expect(getProtocolCategoryChartMetricLabel('perpsAggregatorsVolume', 'Interface')).toBe('Perp Aggregator Volume')
		expect(getProtocolCategoryChartMetricLabel('bridgeAggregatorsVolume', 'Interface')).toBe('Bridge Aggregator Volume')
		expect(getProtocolCategoryChartMetricLabel('normalizedVolume', 'Interface')).toBe('Normalized Volume')
	})
})
