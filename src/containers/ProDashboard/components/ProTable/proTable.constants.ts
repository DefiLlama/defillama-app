'use no memo'

import type { SortingState } from '@tanstack/react-table'
import type { ColumnPresetDefinition } from './proTable.types'

export const DEFAULT_SORTING: SortingState = [{ id: 'tvl', desc: true }]

export const COLUMN_PRESETS: ColumnPresetDefinition[] = [
	{
		id: 'essential',
		label: 'Essential',
		group: 'core',
		columns: ['name', 'category', 'chains', 'tvl', 'change_1d', 'change_7d', 'mcap']
	},
	{
		id: 'advanced',
		label: 'Advanced',
		group: 'core',
		columns: [
			'name',
			'category',
			'chains',
			'tvl',
			'change_1d',
			'fees_24h',
			'revenue_24h',
			'volume_24h',
			'mcaptvl',
			'pf',
			'ps'
		]
	},
	{
		id: 'fees',
		label: 'Fees',
		group: 'dataset',
		description: '24h/7d/30d fees with change metrics and cumulative totals',
		columns: [
			'name',
			'category',
			'chains',
			'tvl',
			'fees_24h',
			'fees_7d',
			'fees_30d',
			'fees_1y',
			'average_1y',
			'feesChange_1d',
			'feesChange_7d',
			'feesChange_1m',
			'feesChange_7dover7d',
			'feesChange_30dover30d',
			'cumulativeFees',
			'pf'
		],
		sort: [{ id: 'fees_24h', desc: true }]
	},
	{
		id: 'revenue',
		label: 'Revenue',
		group: 'dataset',
		description: 'Protocol revenue across timeframes and change rates',
		columns: [
			'name',
			'category',
			'chains',
			'tvl',
			'revenue_24h',
			'revenue_7d',
			'revenue_30d',
			'revenue_1y',
			'average_revenue_1y',
			'revenueChange_1d',
			'revenueChange_7d',
			'revenueChange_1m',
			'revenueChange_7dover7d',
			'revenueChange_30dover30d',
			'treasuryRevenue_24h',
			'supplySideRevenue_24h',
			'userFees_24h',
			'ps'
		],
		sort: [{ id: 'revenue_24h', desc: true }]
	},
	{
		id: 'holders',
		label: 'Holders Rev',
		group: 'dataset',
		description: 'Revenue distributions to token holders',
		columns: [
			'name',
			'category',
			'chains',
			'holderRevenue_24h',
			'holdersRevenue30d',
			'holdersRevenueChange_30dover30d',
			'revenue_30d',
			'revenueChange_1m'
		],
		sort: [{ id: 'holderRevenue_24h', desc: true }]
	},
	{
		id: 'earnings',
		label: 'Earnings',
		group: 'dataset',
		description: 'Net protocol earnings across daily, weekly, monthly, and yearly windows',
		columns: [
			'name',
			'category',
			'chains',
			'earnings_24h',
			'earnings_7d',
			'earnings_30d',
			'earnings_1y',
			'earningsChange_1d',
			'earningsChange_7d',
			'earningsChange_1m'
		],
		sort: [{ id: 'earnings_24h', desc: true }]
	},
	{
		id: 'spot-volume',
		label: 'Spot Volume',
		group: 'dataset',
		description: 'DEX spot volume with dominance share',
		columns: [
			'name',
			'category',
			'chains',
			'volume_24h',
			'volume_7d',
			'volume_30d',
			'volumeChange_1d',
			'volumeChange_7d',
			'volumeChange_1m',
			'volumeDominance_24h',
			'volumeMarketShare7d',
			'cumulativeVolume'
		],
		sort: [{ id: 'volume_24h', desc: true }]
	},
	{
		id: 'perps-volume',
		label: 'Perps Volume',
		group: 'dataset',
		description: 'Perpetuals volume and open interest',
		columns: [
			'name',
			'category',
			'chains',
			'perps_volume_24h',
			'perps_volume_7d',
			'perps_volume_30d',
			'perps_volume_change_1d',
			'perps_volume_change_7d',
			'perps_volume_change_1m',
			'perps_volume_dominance_24h',
			'openInterest'
		],
		sort: [{ id: 'perps_volume_24h', desc: true }]
	},
	{
		id: 'open-interest',
		label: 'Open Interest',
		group: 'dataset',
		description: 'Rank protocols by open interest',
		columns: [
			'name',
			'category',
			'chains',
			'openInterest',
			'perps_volume_24h',
			'perps_volume_change_1d',
			'perps_volume_change_7d'
		],
		sort: [{ id: 'openInterest', desc: true }]
	},
	{
		id: 'dex-aggregators',
		label: 'DEX Aggregators',
		group: 'dataset',
		description: 'Aggregator trading volume and dominance metrics',
		columns: [
			'name',
			'category',
			'chains',
			'aggregators_volume_24h',
			'aggregators_volume_change_1d',
			'aggregators_volume_7d',
			'aggregators_volume_change_7d',
			'aggregators_volume_30d',
			'aggregators_volume_dominance_24h',
			'aggregators_volume_marketShare7d'
		],
		sort: [{ id: 'aggregators_volume_24h', desc: true }]
	},
	{
		id: 'bridge-aggregators',
		label: 'Bridge Aggregators',
		group: 'dataset',
		description: 'Bridge aggregator flows with 24h dominance share',
		columns: [
			'name',
			'category',
			'chains',
			'bridge_aggregators_volume_24h',
			'bridge_aggregators_volume_change_1d',
			'bridge_aggregators_volume_7d',
			'bridge_aggregators_volume_change_7d',
			'bridge_aggregators_volume_30d',
			'bridge_aggregators_volume_dominance_24h'
		],
		sort: [{ id: 'bridge_aggregators_volume_24h', desc: true }]
	},
	{
		id: 'options',
		label: 'Options',
		group: 'dataset',
		description: 'Options trading volume across timeframes',
		columns: [
			'name',
			'category',
			'chains',
			'options_volume_24h',
			'options_volume_change_1d',
			'options_volume_7d',
			'options_volume_change_7d',
			'options_volume_30d',
			'options_volume_dominance_24h'
		],
		sort: [{ id: 'options_volume_24h', desc: true }]
	}
]

export const USD_METRIC_KEYS = [
	'tvl',
	'mcap',
	'fees_24h',
	'fees_7d',
	'fees_30d',
	'fees_1y',
	'average_1y',
	'revenue_24h',
	'revenue_7d',
	'revenue_30d',
	'revenue_1y',
	'volume_24h',
	'volume_7d',
	'volume_30d',
	'cumulativeFees',
	'cumulativeVolume',
	'perps_volume_24h',
	'perps_volume_7d',
	'perps_volume_30d',
	'openInterest',
	'earnings_24h',
	'earnings_7d',
	'earnings_30d',
	'earnings_1y',
	'aggregators_volume_24h',
	'aggregators_volume_7d',
	'aggregators_volume_30d',
	'bridge_aggregators_volume_24h',
	'bridge_aggregators_volume_7d',
	'bridge_aggregators_volume_30d',
	'options_volume_24h',
	'options_volume_7d',
	'options_volume_30d'
] as const

export const SHARE_METRIC_DEFINITIONS = [
	{ key: 'tvl', name: 'TVL % Share' },
	{ key: 'mcap', name: 'Market Cap % Share' },
	{ key: 'fees_24h', name: 'Fees 24h % Share' },
	{ key: 'fees_7d', name: 'Fees 7d % Share' },
	{ key: 'fees_30d', name: 'Fees 30d % Share' },
	{ key: 'fees_1y', name: 'Fees 1y % Share' },
	{ key: 'average_1y', name: 'Monthly Avg 1Y Fees % Share' },
	{ key: 'revenue_24h', name: 'Revenue 24h % Share' },
	{ key: 'revenue_7d', name: 'Revenue 7d % Share' },
	{ key: 'revenue_30d', name: 'Revenue 30d % Share' },
	{ key: 'revenue_1y', name: 'Revenue 1y % Share' },
	{ key: 'volume_24h', name: 'Volume 24h % Share' },
	{ key: 'volume_7d', name: 'Volume 7d % Share' },
	{ key: 'cumulativeFees', name: 'Cumulative Fees % Share' },
	{ key: 'cumulativeVolume', name: 'Cumulative Volume % Share' },
	{ key: 'earnings_24h', name: 'Earnings 24h % Share' },
	{ key: 'earnings_7d', name: 'Earnings 7d % Share' },
	{ key: 'earnings_30d', name: 'Earnings 30d % Share' },
	{ key: 'earnings_1y', name: 'Earnings 1y % Share' },
	{ key: 'aggregators_volume_24h', name: 'Agg Volume 24h % Share' },
	{ key: 'aggregators_volume_7d', name: 'Agg Volume 7d % Share' },
	{ key: 'aggregators_volume_30d', name: 'Agg Volume 30d % Share' },
	{ key: 'bridge_aggregators_volume_24h', name: 'Bridge Agg Volume 24h % Share' },
	{ key: 'bridge_aggregators_volume_7d', name: 'Bridge Agg Volume 7d % Share' },
	{ key: 'bridge_aggregators_volume_30d', name: 'Bridge Agg Volume 30d % Share' },
	{ key: 'options_volume_24h', name: 'Options Volume 24h % Share' },
	{ key: 'options_volume_7d', name: 'Options Volume 7d % Share' },
	{ key: 'options_volume_30d', name: 'Options Volume 30d % Share' }
] as const

export const buildColumnVisibilityMap = (
	allColumnIds: string[],
	visibleColumnIds: string[]
): Record<string, boolean> => {
	const visibleSet = new Set(visibleColumnIds)
	const nextVisibility: Record<string, boolean> = {}
	for (const columnId of allColumnIds) {
		nextVisibility[columnId] = visibleSet.has(columnId)
	}
	return nextVisibility
}
