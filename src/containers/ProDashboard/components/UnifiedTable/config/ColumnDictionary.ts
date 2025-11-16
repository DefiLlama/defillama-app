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
	strategies?: Array<'protocols' | 'chains'>
}

const metaColumns: ColumnDictionaryItem[] = [
	{
		id: 'category',
		header: 'Category',
		group: 'meta',
		render: 'meta-category',
		strategies: ['protocols']
	},
	{
		id: 'chains',
		header: 'Chains',
		group: 'meta',
		render: 'meta-chains',
		strategies: ['protocols']
	},
	{
		id: 'oracles',
		header: 'Oracles',
		group: 'meta',
		render: 'meta-oracles',
		strategies: ['protocols']
	}
]

const tvlColumns: ColumnDictionaryItem[] = [
	{ id: 'tvl', header: 'TVL', group: 'tvl', render: 'usd' },
	{ id: 'change1d', header: '1d Change', group: 'tvl', render: 'percent' },
	{ id: 'change7d', header: '7d Change', group: 'tvl', render: 'percent' },
	{ id: 'change1m', header: '30d Change', group: 'tvl', render: 'percent' },
	{ id: 'bridgedTvl', header: 'Bridged TVL', group: 'tvl', render: 'usd', strategies: ['chains'] },
	{ id: 'stablesMcap', header: 'Stables', group: 'tvl', render: 'usd', strategies: ['chains'] },
	{
		id: 'tvlShare',
		header: 'TVL Share',
		group: 'tvl',
		render: 'percent',
		tags: ['share'],
		strategies: ['chains']
	},
	{
		id: 'stablesShare',
		header: 'Stables Share',
		group: 'tvl',
		render: 'percent',
		tags: ['share'],
		strategies: ['chains']
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
		tags: ['cumulative'],
		strategies: ['protocols']
	},
	{
		id: 'volumeChange_1d',
		header: '1d Volume Change',
		group: 'volume',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'volumeChange_7d',
		header: '7d Volume Change',
		group: 'volume',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'volumeChange_1m',
		header: '30d Volume Change',
		group: 'volume',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'volumeDominance_24h',
		header: '24h Volume Share',
		group: 'volume',
		render: 'percent',
		tags: ['dominance'],
		strategies: ['protocols']
	},
	{
		id: 'volumeMarketShare7d',
		header: '7d Volume Share',
		group: 'volume',
		render: 'percent',
		tags: ['dominance'],
		strategies: ['protocols']
	},
	{
		id: 'volume24hShare',
		header: '24h Volume Share',
		group: 'volume',
		render: 'percent',
		tags: ['share'],
		strategies: ['chains']
	}
]

const feesColumns: ColumnDictionaryItem[] = [
	{ id: 'fees24h', header: '24h Fees', group: 'fees', render: 'usd' },
	{ id: 'fees_7d', header: '7d Fees', group: 'fees', render: 'usd' },
	{ id: 'fees_30d', header: '30d Fees', group: 'fees', render: 'usd' },
	{ id: 'fees_1y', header: '1y Fees', group: 'fees', render: 'usd', strategies: ['protocols'] },
	{
		id: 'average_1y',
		header: '1y Monthly Avg Fees',
		group: 'fees',
		render: 'usd',
		tags: ['derived'],
		strategies: ['protocols']
	},
	{
		id: 'cumulativeFees',
		header: 'Cumulative Fees',
		group: 'fees',
		render: 'usd',
		tags: ['cumulative'],
		strategies: ['protocols']
	},
	{
		id: 'userFees_24h',
		header: '24h User Fees',
		group: 'fees',
		render: 'usd',
		tags: ['distribution'],
		strategies: ['protocols']
	},
	{
		id: 'holderRevenue_24h',
		header: '24h Holder Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution'],
		strategies: ['protocols']
	},
	{
		id: 'holdersRevenue30d',
		header: '30d Holder Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution'],
		strategies: ['protocols']
	},
	{
		id: 'treasuryRevenue_24h',
		header: '24h Treasury Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution'],
		strategies: ['protocols']
	},
	{
		id: 'supplySideRevenue_24h',
		header: '24h Supply-Side Revenue',
		group: 'fees',
		render: 'usd',
		tags: ['distribution'],
		strategies: ['protocols']
	},
	{
		id: 'feesChange_1d',
		header: '1d Fees Change',
		group: 'fees',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'feesChange_7d',
		header: '7d Fees Change',
		group: 'fees',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'feesChange_1m',
		header: '30d Fees Change',
		group: 'fees',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'feesChange_7dover7d',
		header: '7d/7d Fees Change',
		group: 'fees',
		render: 'percent',
		tags: ['advanced'],
		strategies: ['protocols']
	},
	{
		id: 'feesChange_30dover30d',
		header: '30d/30d Fees Change',
		group: 'fees',
		render: 'percent',
		tags: ['advanced'],
		strategies: ['protocols']
	},
	{
		id: 'holdersRevenueChange_30dover30d',
		header: '30d/30d Holder Rev Change',
		group: 'fees',
		render: 'percent',
		tags: ['distribution', 'advanced'],
		strategies: ['protocols']
	}
]

const revenueColumns: ColumnDictionaryItem[] = [
	{ id: 'revenue24h', header: '24h Revenue', group: 'revenue', render: 'usd' },
	{ id: 'revenue_7d', header: '7d Revenue', group: 'revenue', render: 'usd' },
	{ id: 'revenue_30d', header: '30d Revenue', group: 'revenue', render: 'usd' },
	{ id: 'revenue_1y', header: '1y Revenue', group: 'revenue', render: 'usd', strategies: ['protocols'] },
	{
		id: 'average_revenue_1y',
		header: '1y Monthly Avg Revenue',
		group: 'revenue',
		render: 'usd',
		tags: ['derived'],
		strategies: ['protocols']
	},
	{
		id: 'revenueChange_1d',
		header: '1d Revenue Change',
		group: 'revenue',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'revenueChange_7d',
		header: '7d Revenue Change',
		group: 'revenue',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'revenueChange_1m',
		header: '30d Revenue Change',
		group: 'revenue',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'revenueChange_7dover7d',
		header: '7d/7d Revenue Change',
		group: 'revenue',
		render: 'percent',
		tags: ['advanced'],
		strategies: ['protocols']
	},
	{
		id: 'revenueChange_30dover30d',
		header: '30d/30d Revenue Change',
		group: 'revenue',
		render: 'percent',
		tags: ['advanced'],
		strategies: ['protocols']
	}
]

const perpsColumns: ColumnDictionaryItem[] = [
	{ id: 'perpsVolume24h', header: '24h Perps Volume', group: 'perps', render: 'usd', strategies: ['protocols'] },
	{ id: 'perps_volume_7d', header: '7d Perps Volume', group: 'perps', render: 'usd', strategies: ['protocols'] },
	{ id: 'perps_volume_30d', header: '30d Perps Volume', group: 'perps', render: 'usd', strategies: ['protocols'] },
	{
		id: 'perps_volume_change_1d',
		header: '1d Perps Volume Change',
		group: 'perps',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'perps_volume_change_7d',
		header: '7d Perps Volume Change',
		group: 'perps',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'perps_volume_change_1m',
		header: '30d Perps Volume Change',
		group: 'perps',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'perps_volume_dominance_24h',
		header: '24h Perps Volume Share',
		group: 'perps',
		render: 'percent',
		tags: ['dominance'],
		strategies: ['protocols']
	},
	{ id: 'openInterest', header: 'Open Interest', group: 'perps', render: 'usd', strategies: ['protocols'] }
]

const earningsColumns: ColumnDictionaryItem[] = [
	{ id: 'earnings_24h', header: '24h Earnings', group: 'earnings', render: 'usd', strategies: ['protocols'] },
	{ id: 'earnings_7d', header: '7d Earnings', group: 'earnings', render: 'usd', strategies: ['protocols'] },
	{ id: 'earnings_30d', header: '30d Earnings', group: 'earnings', render: 'usd', strategies: ['protocols'] },
	{ id: 'earnings_1y', header: '1y Earnings', group: 'earnings', render: 'usd', strategies: ['protocols'] },
	{
		id: 'earningsChange_1d',
		header: '1d Earnings Change',
		group: 'earnings',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'earningsChange_7d',
		header: '7d Earnings Change',
		group: 'earnings',
		render: 'percent',
		strategies: ['protocols']
	},
	{
		id: 'earningsChange_1m',
		header: '30d Earnings Change',
		group: 'earnings',
		render: 'percent',
		strategies: ['protocols']
	}
]

const aggregatorsColumns: ColumnDictionaryItem[] = [
	{
		id: 'aggregators_volume_24h',
		header: '24h Aggregator Volume',
		group: 'aggregators',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'aggregators_volume_7d',
		header: '7d Aggregator Volume',
		group: 'aggregators',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'aggregators_volume_30d',
		header: '30d Aggregator Volume',
		group: 'aggregators',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'aggregators_volume_change_1d',
		header: '1d Aggregator Volume Change',
		group: 'aggregators',
		render: 'percent',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'aggregators_volume_change_7d',
		header: '7d Aggregator Volume Change',
		group: 'aggregators',
		render: 'percent',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'aggregators_volume_dominance_24h',
		header: '24h Aggregator Share',
		group: 'aggregators',
		render: 'percent',
		tags: ['specialized', 'dominance'],
		strategies: ['protocols']
	},
	{
		id: 'aggregators_volume_marketShare7d',
		header: '7d Aggregator Share',
		group: 'aggregators',
		render: 'percent',
		tags: ['specialized', 'dominance'],
		strategies: ['protocols']
	}
]

const bridgeAggregatorsColumns: ColumnDictionaryItem[] = [
	{
		id: 'bridge_aggregators_volume_24h',
		header: '24h Bridge Aggregator Volume',
		group: 'bridge-aggregators',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'bridge_aggregators_volume_7d',
		header: '7d Bridge Aggregator Volume',
		group: 'bridge-aggregators',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'bridge_aggregators_volume_30d',
		header: '30d Bridge Aggregator Volume',
		group: 'bridge-aggregators',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'bridge_aggregators_volume_change_1d',
		header: '1d Bridge Aggregator Change',
		group: 'bridge-aggregators',
		render: 'percent',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'bridge_aggregators_volume_change_7d',
		header: '7d Bridge Aggregator Change',
		group: 'bridge-aggregators',
		render: 'percent',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'bridge_aggregators_volume_dominance_24h',
		header: '24h Bridge Aggregator Share',
		group: 'bridge-aggregators',
		render: 'percent',
		tags: ['specialized', 'dominance'],
		strategies: ['protocols']
	}
]

const optionsColumns: ColumnDictionaryItem[] = [
	{
		id: 'options_volume_24h',
		header: '24h Options Volume',
		group: 'options',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'options_volume_7d',
		header: '7d Options Volume',
		group: 'options',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'options_volume_30d',
		header: '30d Options Volume',
		group: 'options',
		render: 'usd',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'options_volume_change_1d',
		header: '1d Options Volume Change',
		group: 'options',
		render: 'percent',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'options_volume_change_7d',
		header: '7d Options Volume Change',
		group: 'options',
		render: 'percent',
		tags: ['specialized'],
		strategies: ['protocols']
	},
	{
		id: 'options_volume_dominance_24h',
		header: '24h Options Volume Share',
		group: 'options',
		render: 'percent',
		tags: ['specialized', 'dominance'],
		strategies: ['protocols']
	}
]

const ratioColumns: ColumnDictionaryItem[] = [
	{ id: 'mcap', header: 'Market Cap', group: 'ratios', render: 'usd' },
	{ id: 'mcaptvl', header: 'Mcap / TVL', group: 'ratios', render: 'ratio' },
	{ id: 'pf', header: 'P/F', group: 'ratios', render: 'ratio', strategies: ['protocols'] },
	{ id: 'ps', header: 'P/S', group: 'ratios', render: 'ratio', strategies: ['protocols'] }
]

export const UNIFIED_TABLE_COLUMN_DICTIONARY: ColumnDictionaryItem[] = [
	...metaColumns,
	...tvlColumns,
	...volumeColumns,
	...feesColumns,
	...revenueColumns,
	...perpsColumns,
	...earningsColumns,
	...aggregatorsColumns,
	...bridgeAggregatorsColumns,
	...optionsColumns,
	...ratioColumns
]

export const COLUMN_DICTIONARY_BY_ID = new Map(UNIFIED_TABLE_COLUMN_DICTIONARY.map((item) => [item.id, item]))
