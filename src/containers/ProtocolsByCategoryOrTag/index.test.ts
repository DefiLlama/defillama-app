import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { IProtocolByCategoryOrTagPageData } from './types'

let lastTableWithSearchProps: any = null

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
	TableWithSearch: (props: any) => {
		lastTableWithSearchProps = props
		return null
	}
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
	it('uses the fixed widths for resized ranking columns', () => {
		const columns = getColumnsForCategory({
			effectiveCategory: 'Interface',
			metrics: {
				tvl: true,
				fees: true,
				revenue: true,
				dexVolume: true,
				dexAggregatorsVolume: true,
				perpsAggregatorsVolume: true,
				bridgeAggregatorsVolume: true
			}
		})

		expect(columns.find((column) => column.id === 'dex_aggregator_volume_7d')?.size).toBe(230)
		expect(columns.find((column) => column.id === 'perp_aggregator_volume_7d')?.size).toBe(230)
		expect(columns.find((column) => column.id === 'bridge_aggregator_volume_7d')?.size).toBe(230)
		expect(columns.find((column) => column.id === 'fees_7d')?.size).toBe(100)
		expect(columns.find((column) => column.id === 'revenue_7d')?.size).toBe(125)
	})

	it('renders metric sections with nested 24h and 30d rows', () => {
		lastTableWithSearchProps = null
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
		lastTableWithSearchProps = null
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
		lastTableWithSearchProps = null
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

	it('orders ranking columns to match the summary metric order', () => {
		lastTableWithSearchProps = null

		const props: IProtocolByCategoryOrTagPageData = {
			protocols: [],
			category: 'Interface',
			tag: null,
			effectiveCategory: 'Interface',
			capabilities: {
				tvl: true,
				fees: true,
				revenue: true,
				dexVolume: true,
				dexAggregatorsVolume: true,
				perpsAggregatorsVolume: true,
				bridgeAggregatorsVolume: true
			},
			chains: [],
			chain: 'All',
			charts: {
				dataset: {
					source: [{ timestamp: 1710000000000, TVL: 5_850_000 }],
					dimensions: ['timestamp', 'TVL']
				},
				charts: []
			},
			summaryMetrics: {
				fees: { total24h: 100_000, total7d: 1_060_000, total30d: 4_400_000 },
				revenue: { total24h: 80_000, total7d: 1_000_000, total30d: 4_000_000 },
				dexVolume: { total24h: 7_000_000, total7d: 56_270_000, total30d: 210_000_000 },
				dexAggregatorsVolume: { total24h: 900_000_000, total7d: 10_490_000_000, total30d: 38_000_000_000 },
				perpsAggregatorsVolume: { total24h: 75_000_000, total7d: 869_250_000, total30d: 3_200_000_000 },
				bridgeAggregatorsVolume: { total24h: 21_000_000, total7d: 233_550_000, total30d: 940_000_000 }
			},
			extraTvlCharts: {}
		}

		renderToStaticMarkup(React.createElement(ProtocolsByCategoryOrTag, props))

		expect(lastTableWithSearchProps?.columns.map((column: { header: string }) => column.header)).toEqual([
			'Name',
			'DEX Aggregator Volume 30d',
			'Perp Aggregator Volume 30d',
			'Bridge Aggregator Volume 30d',
			'Spot Volume 30d',
			'TVL',
			'Fees 30d',
			'Revenue 30d',
			'Perp Aggregator Volume 7d',
			'Bridge Aggregator Volume 7d',
			'DEX Aggregator Volume 7d',
			'Spot Volume 7d',
			'Fees 7d',
			'Revenue 7d',
			'Perp Aggregator Volume 24h',
			'Bridge Aggregator Volume 24h',
			'DEX Aggregator Volume 24h',
			'Spot Volume 24h',
			'Fees 24h',
			'Revenue 24h',
			'Mcap/TVL'
		])
	})

	it('keeps ranked summary metrics ahead of unranked visible metrics on Dexs pages', () => {
		lastTableWithSearchProps = null

		const props: IProtocolByCategoryOrTagPageData = {
			protocols: [],
			category: 'Dexs',
			tag: null,
			effectiveCategory: 'Dexs',
			capabilities: {
				tvl: true,
				fees: true,
				revenue: true,
				dexVolume: true,
				dexAggregatorsVolume: true,
				perpVolume: true
			},
			chains: [],
			chain: 'All',
			charts: {
				dataset: {
					source: [{ timestamp: 1710000000000, TVL: 13_138_000_000 }],
					dimensions: ['timestamp', 'TVL']
				},
				charts: []
			},
			summaryMetrics: {
				fees: { total24h: 1_000_000, total7d: 29_870_000, total30d: 120_000_000 },
				revenue: { total24h: 200_000, total7d: 7_100_000, total30d: 31_000_000 },
				dexVolume: { total24h: 5_300_000_000, total7d: 37_446_000_000, total30d: 145_000_000_000 },
				dexAggregatorsVolume: { total24h: 201, total7d: 201, total30d: 201 },
				perpVolume: { total24h: null, total7d: null, total30d: null }
			},
			extraTvlCharts: {}
		}

		renderToStaticMarkup(React.createElement(ProtocolsByCategoryOrTag, props))

		expect(lastTableWithSearchProps?.sortingState).toEqual([{ id: 'dex_volume_30d', desc: true }])
		expect(lastTableWithSearchProps?.columns.slice(0, 7).map((column: { header: string }) => column.header)).toEqual([
			'Name',
			'DEX Volume 30d',
			'TVL',
			'Fees 30d',
			'Revenue 30d',
			'DEX Aggregator Volume 30d',
			'Perp Volume 30d'
		])
	})
})
