import { describe, expect, it } from 'vitest'
import {
	getProtocolCategoryChartMetricLabel,
	getProtocolCategoryChartMetrics,
	getProtocolCategoryColumns,
	getProtocolCategoryDefaultSort,
	getProtocolCategoryDexVolumeLabel,
	protocolCategoryConfig
} from './constants'

describe('ProtocolsByCategoryOrTag constants', () => {
	it('keeps Interface perp-first while enabling dex volume columns and metrics', () => {
		expect(protocolCategoryConfig.Interface?.defaultChart).toBe('perpVolume')
		expect(getProtocolCategoryChartMetrics('Interface')).toEqual(['tvl', 'dexVolume', 'perpVolume'])
		expect(getProtocolCategoryColumns('Interface')).toEqual([
			'name',
			'perp_volume_24h',
			'spot_volume_24h',
			'perp_volume_7d',
			'spot_volume_7d',
			'perp_volume_30d',
			'spot_volume_30d',
			'tvl',
			'fees_7d',
			'revenue_7d',
			'mcap/tvl',
			'fees_30d',
			'revenue_30d',
			'fees_24h',
			'revenue_24h'
		])
		expect(getProtocolCategoryDefaultSort('Interface')).toBe('perp_volume_24h')
	})

	it('resolves category-aware dex volume labels for chart and table surfaces', () => {
		expect(getProtocolCategoryDexVolumeLabel('Dexs')).toBe('DEX Volume')
		expect(getProtocolCategoryDexVolumeLabel('DEX Aggregator')).toBe('DEX Aggregator Volume')
		expect(getProtocolCategoryDexVolumeLabel('Prediction Market')).toBe('Prediction Volume')
		expect(getProtocolCategoryDexVolumeLabel('Crypto Card Issuer')).toBe('Payment Volume')
		expect(getProtocolCategoryDexVolumeLabel('Interface')).toBe('Spot Volume')
		expect(getProtocolCategoryChartMetricLabel('dexVolume', 'Interface')).toBe('Spot Volume')
	})
})
