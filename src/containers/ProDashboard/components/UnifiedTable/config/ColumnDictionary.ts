import type { MetricGroup } from '../types'

export type ColumnRenderType =
	| 'usd'
	| 'percent'
	| 'ratio'
	| 'number'
	| 'meta'
	| 'meta-category'
	| 'meta-chains'
	| 'meta-oracles'

export interface ColumnDictionaryItem {
	id: string
	header: string
	description?: string
	group: MetricGroup | 'meta'
	render: ColumnRenderType
	tags?: string[]
	chainGroupOnly?: boolean
}

const metaColumns: ColumnDictionaryItem[] = [
	{
		id: 'category',
		header: 'Category',
		group: 'meta',
		render: 'meta-category'
	},
	{
		id: 'chains',
		header: 'Chains',
		group: 'meta',
		render: 'meta-chains'
	},
	{
		id: 'oracles',
		header: 'Oracles',
		group: 'meta',
		render: 'meta-oracles'
	}
]

const tvlColumns: ColumnDictionaryItem[] = [
	{ id: 'tvl', header: 'TVL', group: 'tvl', render: 'usd' },
	{ id: 'change1d', header: '1d Change', group: 'tvl', render: 'percent', tags: ['change'] },
	{ id: 'change7d', header: '7d Change', group: 'tvl', render: 'percent', tags: ['change'] },
	{ id: 'change1m', header: '30d Change', group: 'tvl', render: 'percent', tags: ['change'] },
	{ id: 'bridgedTvl', header: 'Bridged TVL', group: 'tvl', render: 'usd', chainGroupOnly: true },
	{ id: 'stablesMcap', header: 'Stables', group: 'tvl', render: 'usd', chainGroupOnly: true },
	{
		id: 'tvlShare',
		header: 'TVL Share',
		group: 'tvl',
		render: 'percent',
		tags: ['dominance'],
		chainGroupOnly: true
	},
	{
		id: 'stablesShare',
		header: 'Stables Share',
		group: 'tvl',
		render: 'percent',
		tags: ['dominance'],
		chainGroupOnly: true
	}
]

const volumeColumns: ColumnDictionaryItem[] = [
	{ id: 'volume24h', header: '24h Volume', group: 'volume', render: 'usd' },
	{ id: 'volume_7d', header: '7d Volume', group: 'volume', render: 'usd' },
	{ id: 'volume_30d', header: '30d Volume', group: 'volume', render: 'usd' },
	{
		id: 'cumulativeVolume',
		header: 'Cumulative Volume',
		group: 'volume',
		render: 'usd',
		tags: ['cumulative']
	},
	{
		id: 'volumeChange_1d',
		header: '1d Volume Change',
		group: 'volume',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'volumeChange_7d',
		header: '7d Volume Change',
		group: 'volume',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'volumeChange_1m',
		header: '30d Volume Change',
		group: 'volume',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'volumeDominance_24h',
		header: '24h Volume Share',
		group: 'volume',
		render: 'percent',
		tags: ['dominance']
	},
	{
		id: 'volumeMarketShare7d',
		header: '7d Volume Share',
		group: 'volume',
		render: 'percent',
		tags: ['dominance']
	},
	{
		id: 'volume24hShare',
		header: '24h Chain Volume Share',
		group: 'volume',
		render: 'percent',
		tags: ['dominance'],
		chainGroupOnly: true
	}
]

const feesColumns: ColumnDictionaryItem[] = [
	{ id: 'fees24h', header: '24h Fees', group: 'fees', render: 'usd' },
	{ id: 'fees_7d', header: '7d Fees', group: 'fees', render: 'usd' },
	{ id: 'fees_30d', header: '30d Fees', group: 'fees', render: 'usd' },
	{ id: 'fees_1y', header: '1y Fees', group: 'fees', render: 'usd' },
	{
		id: 'average_1y',
		header: '1y Monthly Avg Fees',
		group: 'fees',
		render: 'usd',
		tags: ['derived']
	},
	{
		id: 'cumulativeFees',
		header: 'Cumulative Fees',
		group: 'fees',
		render: 'usd',
		tags: ['cumulative']
	},
	{
		id: 'userFees_24h',
		header: '24h User Fees',
		group: 'fees',
		render: 'usd',
		tags: ['distribution']
	},
	{
		id: 'holderRevenue_24h',
		header: '24h Holder Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution']
	},
	{
		id: 'holderRevenue_7d',
		header: '7d Holder Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution']
	},
	{
		id: 'holdersRevenue30d',
		header: '30d Holder Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution']
	},
	{
		id: 'treasuryRevenue_24h',
		header: '24h Treasury Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution']
	},
	{
		id: 'feesChange_1d',
		header: '1d Fees Change',
		group: 'fees',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'feesChange_7d',
		header: '7d Fees Change',
		group: 'fees',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'feesChange_1m',
		header: '30d Fees Change',
		group: 'fees',
		render: 'percent',
		tags: ['change']
	}
]

const revenueColumns: ColumnDictionaryItem[] = [
	{ id: 'revenue24h', header: '24h Revenue', group: 'revenue', render: 'usd' },
	{ id: 'revenue_7d', header: '7d Revenue', group: 'revenue', render: 'usd' },
	{ id: 'revenue_30d', header: '30d Revenue', group: 'revenue', render: 'usd' },
	{ id: 'revenue_1y', header: '1y Revenue', group: 'revenue', render: 'usd' },
	{
		id: 'average_revenue_1y',
		header: '1y Monthly Avg Revenue',
		group: 'revenue',
		render: 'usd',
		tags: ['derived']
	},
	{
		id: 'revenueChange_1d',
		header: '1d Revenue Change',
		group: 'revenue',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'revenueChange_7d',
		header: '7d Revenue Change',
		group: 'revenue',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'revenueChange_1m',
		header: '30d Revenue Change',
		group: 'revenue',
		render: 'percent',
		tags: ['change']
	}
]

const perpsColumns: ColumnDictionaryItem[] = [
	{ id: 'perpsVolume24h', header: '24h Perps Volume', group: 'perps', render: 'usd' },
	{ id: 'perps_volume_7d', header: '7d Perps Volume', group: 'perps', render: 'usd' },
	{ id: 'perps_volume_30d', header: '30d Perps Volume', group: 'perps', render: 'usd' },
	{
		id: 'perps_volume_change_1d',
		header: '1d Perps Volume Change',
		group: 'perps',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'perps_volume_change_7d',
		header: '7d Perps Volume Change',
		group: 'perps',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'perps_volume_change_1m',
		header: '30d Perps Volume Change',
		group: 'perps',
		render: 'percent',
		tags: ['change']
	},
	{
		id: 'perps_volume_dominance_24h',
		header: '24h Perps Volume Share',
		group: 'perps',
		render: 'percent',
		tags: ['dominance']
	},
	{ id: 'openInterest', header: 'Open Interest', group: 'perps', render: 'usd' }
]

const aggregatorsColumns: ColumnDictionaryItem[] = [
	{
		id: 'aggregators_volume_24h',
		header: '24h Aggregator Volume',
		group: 'aggregators',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'aggregators_volume_7d',
		header: '7d Aggregator Volume',
		group: 'aggregators',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'aggregators_volume_30d',
		header: '30d Aggregator Volume',
		group: 'aggregators',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'aggregators_volume_change_1d',
		header: '1d Aggregator Volume Change',
		group: 'aggregators',
		render: 'percent',
		tags: ['change', 'specialized']
	},
	{
		id: 'aggregators_volume_change_7d',
		header: '7d Aggregator Volume Change',
		group: 'aggregators',
		render: 'percent',
		tags: ['change', 'specialized']
	},
	{
		id: 'aggregators_volume_dominance_24h',
		header: '24h Aggregator Share',
		group: 'aggregators',
		render: 'percent',
		tags: ['specialized', 'dominance']
	},
	{
		id: 'aggregators_volume_marketShare7d',
		header: '7d Aggregator Share',
		group: 'aggregators',
		render: 'percent',
		tags: ['specialized', 'dominance']
	}
]

const derivativesAggregatorsColumns: ColumnDictionaryItem[] = [
	{
		id: 'derivatives_aggregators_volume_24h',
		header: '24h Derivatives Aggregator Volume',
		group: 'derivatives-aggregators',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'derivatives_aggregators_volume_7d',
		header: '7d Derivatives Aggregator Volume',
		group: 'derivatives-aggregators',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'derivatives_aggregators_volume_30d',
		header: '30d Derivatives Aggregator Volume',
		group: 'derivatives-aggregators',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'derivatives_aggregators_volume_change_1d',
		header: '1d Derivatives Aggregator Change',
		group: 'derivatives-aggregators',
		render: 'percent',
		tags: ['change', 'specialized']
	},
	{
		id: 'derivatives_aggregators_volume_change_7d',
		header: '7d Derivatives Aggregator Change',
		group: 'derivatives-aggregators',
		render: 'percent',
		tags: ['change', 'specialized']
	},
	{
		id: 'derivatives_aggregators_volume_change_1m',
		header: '30d Derivatives Aggregator Change',
		group: 'derivatives-aggregators',
		render: 'percent',
		tags: ['change', 'specialized']
	}
]

const optionsColumns: ColumnDictionaryItem[] = [
	{
		id: 'options_volume_24h',
		header: '24h Options Volume',
		group: 'options',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'options_volume_7d',
		header: '7d Options Volume',
		group: 'options',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'options_volume_30d',
		header: '30d Options Volume',
		group: 'options',
		render: 'usd',
		tags: ['specialized']
	},
	{
		id: 'options_volume_change_1d',
		header: '1d Options Volume Change',
		group: 'options',
		render: 'percent',
		tags: ['change', 'specialized']
	},
	{
		id: 'options_volume_change_7d',
		header: '7d Options Volume Change',
		group: 'options',
		render: 'percent',
		tags: ['change', 'specialized']
	},
	{
		id: 'options_volume_dominance_24h',
		header: '24h Options Volume Share',
		group: 'options',
		render: 'percent',
		tags: ['specialized', 'dominance']
	}
]

const ratioColumns: ColumnDictionaryItem[] = [
	{ id: 'mcap', header: 'Market Cap', group: 'ratios', render: 'usd' },
	{ id: 'fdv', header: 'FDV', group: 'ratios', render: 'usd' },
	{
		id: 'mcaptvl',
		header: 'Mcap / TVL',
		group: 'ratios',
		render: 'ratio',
		description: 'Market Cap divided by Total Value Locked'
	},
	{
		id: 'pf',
		header: 'P/F',
		group: 'ratios',
		render: 'ratio',
		description: 'Price to Fees ratio'
	},
	{
		id: 'ps',
		header: 'P/S',
		group: 'ratios',
		render: 'ratio',
		description: 'Price to Sales (Revenue) ratio'
	}
]

export const UNIFIED_TABLE_COLUMN_DICTIONARY: ColumnDictionaryItem[] = [
	...metaColumns,
	...tvlColumns,
	...volumeColumns,
	...feesColumns,
	...revenueColumns,
	...perpsColumns,
	...aggregatorsColumns,
	...derivativesAggregatorsColumns,
	...optionsColumns,
	...ratioColumns
]

export const COLUMN_DICTIONARY_BY_ID = new Map(UNIFIED_TABLE_COLUMN_DICTIONARY.map((item) => [item.id, item]))
