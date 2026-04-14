import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { IProtocolByCategoryOrTagPageData } from './types'

vi.mock('~/components/ButtonStyled/ChartExportButtons', () => ({
	ChartExportButtons: () => null
}))

vi.mock('~/components/ECharts/ChartGroupingSelector', () => ({
	ChartGroupingSelector: () => null,
	DWMC_GROUPING_OPTIONS_LOWERCASE: [],
	type: {}
}))

vi.mock('~/components/RowLinksWithDropdown', () => ({
	RowLinksWithDropdown: () => null
}))

vi.mock('~/components/Table/TableWithSearch', () => ({
	TableWithSearch: () => null
}))

vi.mock('~/hooks/useGetChartInstance', () => ({
	useGetChartInstance: () => ({
		chartInstance: null,
		handleChartReady: () => null
	})
}))

vi.mock('~/contexts/LocalStorage', () => ({
	TVL_SETTINGS_KEYS: ['borrowed'],
	useLocalStorageSettingsManager: () => [{ borrowed: false }]
}))

vi.mock('../../../public/definitions', () => ({
	definitions: {
		dexs: {
			protocol: {
				'24h': '24h',
				'7d': '7d',
				'30d': '30d'
			},
			chain: {
				'24h': '24h',
				'7d': '7d',
				'30d': '30d'
			}
		},
		dexAggregators: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' },
			chain: { '24h': '24h', '7d': '7d', '30d': '30d' }
		},
		perps: {
			protocol: {
				'24h': '24h',
				'7d': '7d',
				'30d': '30d'
			}
		},
		perpsAggregators: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' }
		},
		bridgeAggregators: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' },
			chain: { '24h': '24h', '7d': '7d', '30d': '30d' }
		},
		normalizedVolume: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' }
		},
		openInterest: { protocol: 'oi', common: 'oi' },
		optionsPremium: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' }
		},
		optionsNotional: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' }
		},
		fees: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' },
			chain: { '24h': '24h', '7d': '7d', '30d': '30d' }
		},
		revenue: {
			protocol: { '24h': '24h', '7d': '7d', '30d': '30d' },
			chain: { '24h': '24h', '7d': '7d', '30d': '30d' }
		}
	}
}))

import { ProtocolsByCategoryOrTag, getColumnsForCategory } from './index'

describe('ProtocolsByCategoryOrTag', () => {
	it('uses derived spot-volume headers for Interface pages', () => {
		const columns = getColumnsForCategory({
			effectiveCategory: 'Interface',
			metrics: {
				tvl: true,
				fees: true,
				revenue: true,
				dexVolume: true,
				dexAggregatorsVolume: true,
				perpVolume: true,
				perpsAggregatorsVolume: true,
				bridgeAggregatorsVolume: true,
				normalizedVolume: true,
				openInterest: true
			}
		})
		const headers = columns.map((column) => column.header)

		expect(headers).toEqual([
			'Name',
			'TVL',
			'Perp Volume 30d',
			'Perp Aggregator Volume 30d',
			'Bridge Aggregator Volume 30d',
			'Normalized Volume 30d',
			'DEX Aggregator Volume 30d',
			'Spot Volume 30d',
			'Fees 30d',
			'Revenue 30d',
			'Open Interest',
			'Perp Volume 7d',
			'Perp Aggregator Volume 7d',
			'Bridge Aggregator Volume 7d',
			'Normalized Volume 7d',
			'DEX Aggregator Volume 7d',
			'Spot Volume 7d',
			'Fees 7d',
			'Revenue 7d',
			'Perp Volume 24h',
			'Perp Aggregator Volume 24h',
			'Bridge Aggregator Volume 24h',
			'Normalized Volume 24h',
			'DEX Aggregator Volume 24h',
			'Spot Volume 24h',
			'Fees 24h',
			'Revenue 24h',
			'Mcap/TVL'
		])
		expect(columns.find((column) => column.id === 'spot_volume_7d')?.meta?.headerHelperText).toBeUndefined()
		expect(columns.find((column) => column.id === 'dex_aggregator_volume_7d')?.meta?.headerHelperText).toBe('7d')
	})

	it('renders metric sections with nested 24h and 30d rows', () => {
		const props: IProtocolByCategoryOrTagPageData = {
			protocols: [],
			category: 'Dexs',
			tag: null,
			effectiveCategory: 'Dexs',
			capabilities: {
				tvl: true,
				fees: true,
				revenue: true,
				dexVolume: true
			},
			chains: [],
			chain: 'All',
			charts: {
				dataset: {
					source: [{ timestamp: 1710000000000, TVL: 123 }],
					dimensions: ['timestamp', 'TVL']
				},
				charts: []
			},
			summaryMetrics: {
				fees: { total24h: 10, total7d: 70, total30d: 300 },
				dexVolume: { total24h: 20, total7d: 140, total30d: 600 },
				dexAggregatorsVolume: { total24h: 5, total7d: 30, total30d: 120 },
				perpsAggregatorsVolume: { total24h: 7, total7d: 40, total30d: 160 },
				bridgeAggregatorsVolume: { total24h: 9, total7d: 50, total30d: 180 },
				normalizedVolume: { total24h: 11, total7d: 60, total30d: 240 }
			},
			extraTvlCharts: {}
		}

		const html = renderToStaticMarkup(React.createElement(ProtocolsByCategoryOrTag, props))

		expect(html).toContain('Fees (7d)')
		expect(html).toContain('DEX Volume (7d)')
		expect(html).toContain('Fees (24h)')
		expect(html).toContain('Fees (30d)')
		expect(html).toContain('DEX Volume (24h)')
		expect(html).toContain('DEX Volume (30d)')
		expect(html).toContain('DEX Aggregator Volume (7d)')
		expect(html).toContain('Perp Aggregator Volume (30d)')
		expect(html).toContain('Bridge Aggregator Volume (24h)')
		expect(html).toContain('Normalized Volume (30d)')
	})

	it('sorts summary metrics by their primary dollar value', () => {
		const props: IProtocolByCategoryOrTagPageData = {
			protocols: [],
			category: 'Prediction Market',
			tag: null,
			effectiveCategory: 'Prediction Market',
			capabilities: {
				tvl: true,
				fees: true,
				revenue: true,
				dexVolume: true,
				openInterest: true
			},
			chains: [],
			chain: 'All',
			charts: {
				dataset: {
					source: [{ timestamp: 1710000000000, TVL: 495_570_000 }],
					dimensions: ['timestamp', 'TVL']
				},
				charts: []
			},
			summaryMetrics: {
				fees: { total24h: 0, total7d: 10_030_000, total30d: 0 },
				revenue: { total24h: 0, total7d: 6_110_000, total30d: 0 },
				dexVolume: { total24h: 0, total7d: 2_643_000_000, total30d: 0 },
				openInterest: { total24h: 924_760_000, total7d: 0, total30d: 0 }
			},
			extraTvlCharts: {}
		}

		const html = renderToStaticMarkup(React.createElement(ProtocolsByCategoryOrTag, props))

		expect(html.indexOf('Prediction Volume (7d)')).toBeLessThan(html.indexOf('Open Interest'))
		expect(html.indexOf('Open Interest')).toBeLessThan(html.indexOf('Total Value Locked'))
		expect(html.indexOf('Total Value Locked')).toBeLessThan(html.indexOf('Fees (7d)'))
		expect(html.indexOf('Fees (7d)')).toBeLessThan(html.indexOf('Revenue (7d)'))
	})

	it('does not attach a generic dex tooltip to relabeled dex metrics', () => {
		const props: IProtocolByCategoryOrTagPageData = {
			protocols: [],
			category: 'Interface',
			tag: null,
			effectiveCategory: 'Interface',
			capabilities: {
				tvl: true,
				dexVolume: true
			},
			chains: [],
			chain: 'All',
			charts: {
				dataset: {
					source: [{ timestamp: 1710000000000, TVL: 123 }],
					dimensions: ['timestamp', 'TVL']
				},
				charts: []
			},
			summaryMetrics: {
				dexVolume: { total24h: 20, total7d: 140, total30d: 600 }
			},
			extraTvlCharts: {}
		}

		const html = renderToStaticMarkup(React.createElement(ProtocolsByCategoryOrTag, props))

		expect(html).toContain('Spot Volume (7d)')
		expect(html).not.toContain('title="7d"')
	})
})
