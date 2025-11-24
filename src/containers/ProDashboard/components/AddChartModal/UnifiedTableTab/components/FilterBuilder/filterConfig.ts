import type { TableFilters } from '~/containers/ProDashboard/types'

export type StrategyType = 'protocols' | 'chains'

export type FilterType = 'numeric-range' | 'numeric-single' | 'boolean' | 'array'
export type FilterFormat = 'currency' | 'percent' | 'number'
export type NumericOperator = '>' | '>=' | '<' | '<=' | 'between'

export interface FilterConfig {
	id: string
	label: string
	description?: string
	type: FilterType
	category: FilterCategory
	strategies: StrategyType[]
	format?: FilterFormat
	min?: number
	minKey?: keyof TableFilters
	maxKey?: keyof TableFilters
	booleanKey?: keyof TableFilters
	arrayKey?: keyof TableFilters
	options?: Array<{ value: string; label: string }>
}

export type FilterCategory =
	| 'metrics'
	| 'volume'
	| 'fees'
	| 'revenue'
	| 'changes'
	| 'dominance'
	| 'aggregators'
	| 'flags'
	| 'chain-metrics'

export const FILTER_CATEGORIES: Array<{ key: FilterCategory; label: string }> = [
	{ key: 'metrics', label: 'Metrics' },
	{ key: 'volume', label: 'Volume' },
	{ key: 'fees', label: 'Fees' },
	{ key: 'revenue', label: 'Revenue' },
	{ key: 'changes', label: 'Changes' },
	{ key: 'dominance', label: 'Dominance' },
	{ key: 'aggregators', label: 'Aggregators' },
	{ key: 'chain-metrics', label: 'Chain Metrics' },
	{ key: 'flags', label: 'Flags' }
]

export const FILTER_CONFIGS: FilterConfig[] = [
	{
		id: 'tvl',
		label: 'TVL',
		type: 'numeric-range',
		category: 'metrics',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'tvlMin',
		maxKey: 'tvlMax'
	},
	{
		id: 'mcap',
		label: 'Market Cap',
		type: 'numeric-range',
		category: 'metrics',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'mcapMin',
		maxKey: 'mcapMax'
	},
	{
		id: 'pfRatio',
		label: 'P/F Ratio',
		type: 'numeric-range',
		category: 'metrics',
		strategies: ['protocols'],
		format: 'number',
		minKey: 'pfRatioMin',
		maxKey: 'pfRatioMax'
	},
	{
		id: 'volumeDex24h',
		label: 'DEX Volume (24h)',
		type: 'numeric-range',
		category: 'volume',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'volumeDex24hMin',
		maxKey: 'volumeDex24hMax'
	},
	{
		id: 'volume7d',
		label: 'Volume (7d)',
		type: 'numeric-range',
		category: 'volume',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'volume7dMin',
		maxKey: 'volume7dMax'
	},
	{
		id: 'volume30d',
		label: 'Volume (30d)',
		type: 'numeric-range',
		category: 'volume',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'volume30dMin',
		maxKey: 'volume30dMax'
	},
	{
		id: 'fees24h',
		label: 'Fees (24h)',
		type: 'numeric-range',
		category: 'fees',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'fees24hMin',
		maxKey: 'fees24hMax'
	},
	{
		id: 'fees7d',
		label: 'Fees (7d)',
		type: 'numeric-range',
		category: 'fees',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'fees7dMin',
		maxKey: 'fees7dMax'
	},
	{
		id: 'fees30d',
		label: 'Fees (30d)',
		type: 'numeric-range',
		category: 'fees',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'fees30dMin',
		maxKey: 'fees30dMax'
	},
	{
		id: 'fees1y',
		label: 'Fees (1y)',
		type: 'numeric-range',
		category: 'fees',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'fees1yMin',
		maxKey: 'fees1yMax'
	},
	{
		id: 'revenue24h',
		label: 'Revenue (24h)',
		type: 'numeric-range',
		category: 'revenue',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'revenue24hMin',
		maxKey: 'revenue24hMax'
	},
	{
		id: 'revenue7d',
		label: 'Revenue (7d)',
		type: 'numeric-range',
		category: 'revenue',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'revenue7dMin',
		maxKey: 'revenue7dMax'
	},
	{
		id: 'revenue30d',
		label: 'Revenue (30d)',
		type: 'numeric-range',
		category: 'revenue',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'revenue30dMin',
		maxKey: 'revenue30dMax'
	},
	{
		id: 'revenue1y',
		label: 'Revenue (1y)',
		type: 'numeric-range',
		category: 'revenue',
		strategies: ['protocols', 'chains'],
		format: 'currency',
		minKey: 'revenue1yMin',
		maxKey: 'revenue1yMax'
	},
	{
		id: 'holderRevenue24h',
		label: 'Holder Revenue (24h)',
		type: 'numeric-range',
		category: 'revenue',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'holderRevenue24hMin',
		maxKey: 'holderRevenue24hMax'
	},
	{
		id: 'treasuryRevenue24h',
		label: 'Treasury Revenue (24h)',
		type: 'numeric-range',
		category: 'revenue',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'treasuryRevenue24hMin',
		maxKey: 'treasuryRevenue24hMax'
	},
	{
		id: 'change1d',
		label: 'TVL Change (1d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols'],
		format: 'percent',
		min: -1000,
		minKey: 'change1dMin',
		maxKey: 'change1dMax'
	},
	{
		id: 'change7d',
		label: 'TVL Change (7d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols'],
		format: 'percent',
		min: -1000,
		minKey: 'change7dMin',
		maxKey: 'change7dMax'
	},
	{
		id: 'change1m',
		label: 'TVL Change (30d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols'],
		format: 'percent',
		min: -1000,
		minKey: 'change1mMin',
		maxKey: 'change1mMax'
	},
	{
		id: 'volumeChange1d',
		label: 'Volume Change (1d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols'],
		format: 'percent',
		min: -1000,
		minKey: 'volumeChange1dMin',
		maxKey: 'volumeChange1dMax'
	},
	{
		id: 'volumeChange7d',
		label: 'Volume Change (7d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols'],
		format: 'percent',
		min: -1000,
		minKey: 'volumeChange7dMin',
		maxKey: 'volumeChange7dMax'
	},
	{
		id: 'volumeChange1m',
		label: 'Volume Change (30d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols'],
		format: 'percent',
		min: -1000,
		minKey: 'volumeChange1mMin',
		maxKey: 'volumeChange1mMax'
	},
	{
		id: 'feesChange1d',
		label: 'Fees Change (1d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols', 'chains'],
		format: 'percent',
		min: -1000,
		minKey: 'feesChange1dMin',
		maxKey: 'feesChange1dMax'
	},
	{
		id: 'feesChange7d',
		label: 'Fees Change (7d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols', 'chains'],
		format: 'percent',
		min: -1000,
		minKey: 'feesChange7dMin',
		maxKey: 'feesChange7dMax'
	},
	{
		id: 'feesChange1m',
		label: 'Fees Change (30d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols', 'chains'],
		format: 'percent',
		min: -1000,
		minKey: 'feesChange1mMin',
		maxKey: 'feesChange1mMax'
	},
	{
		id: 'revenueChange1d',
		label: 'Revenue Change (1d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols', 'chains'],
		format: 'percent',
		min: -1000,
		minKey: 'revenueChange1dMin',
		maxKey: 'revenueChange1dMax'
	},
	{
		id: 'revenueChange7d',
		label: 'Revenue Change (7d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols', 'chains'],
		format: 'percent',
		min: -1000,
		minKey: 'revenueChange7dMin',
		maxKey: 'revenueChange7dMax'
	},
	{
		id: 'revenueChange1m',
		label: 'Revenue Change (30d)',
		type: 'numeric-range',
		category: 'changes',
		strategies: ['protocols', 'chains'],
		format: 'percent',
		min: -1000,
		minKey: 'revenueChange1mMin',
		maxKey: 'revenueChange1mMax'
	},
	{
		id: 'volumeDominance24h',
		label: 'Volume Dominance (24h)',
		type: 'numeric-range',
		category: 'dominance',
		strategies: ['protocols'],
		format: 'percent',
		min: 0,
		minKey: 'volumeDominance24hMin',
		maxKey: 'volumeDominance24hMax'
	},
	{
		id: 'volumeMarketShare7d',
		label: 'Volume Market Share (7d)',
		type: 'numeric-range',
		category: 'dominance',
		strategies: ['protocols'],
		format: 'percent',
		min: 0,
		minKey: 'volumeMarketShare7dMin',
		maxKey: 'volumeMarketShare7dMax'
	},
	{
		id: 'tvlShare',
		label: 'TVL Share',
		type: 'numeric-range',
		category: 'dominance',
		strategies: ['chains'],
		format: 'percent',
		min: 0,
		minKey: 'tvlShareMin',
		maxKey: 'tvlShareMax'
	},
	{
		id: 'perpsVolumeDominance24h',
		label: 'Perps Volume Dominance (24h)',
		type: 'numeric-range',
		category: 'dominance',
		strategies: ['protocols'],
		format: 'percent',
		min: 0,
		minKey: 'perpsVolumeDominance24hMin',
		maxKey: 'perpsVolumeDominance24hMax'
	},
	{
		id: 'optionsVolumeDominance24h',
		label: 'Options Volume Dominance (24h)',
		type: 'numeric-range',
		category: 'dominance',
		strategies: ['protocols'],
		format: 'percent',
		min: 0,
		minKey: 'optionsVolumeDominance24hMin',
		maxKey: 'optionsVolumeDominance24hMax'
	},
	{
		id: 'aggregatorsVolume24h',
		label: 'Aggregator Volume (24h)',
		type: 'numeric-range',
		category: 'aggregators',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'aggregatorsVolume24hMin',
		maxKey: 'aggregatorsVolume24hMax'
	},
	{
		id: 'aggregatorsVolume7d',
		label: 'Aggregator Volume (7d)',
		type: 'numeric-range',
		category: 'aggregators',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'aggregatorsVolume7dMin',
		maxKey: 'aggregatorsVolume7dMax'
	},
	{
		id: 'aggregatorsVolume30d',
		label: 'Aggregator Volume (30d)',
		type: 'numeric-range',
		category: 'aggregators',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'aggregatorsVolume30dMin',
		maxKey: 'aggregatorsVolume30dMax'
	},
	{
		id: 'derivativesAggregatorsVolume24h',
		label: 'Derivatives Aggregator Volume (24h)',
		type: 'numeric-range',
		category: 'aggregators',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'derivativesAggregatorsVolume24hMin',
		maxKey: 'derivativesAggregatorsVolume24hMax'
	},
	{
		id: 'derivativesAggregatorsVolume7d',
		label: 'Derivatives Aggregator Volume (7d)',
		type: 'numeric-range',
		category: 'aggregators',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'derivativesAggregatorsVolume7dMin',
		maxKey: 'derivativesAggregatorsVolume7dMax'
	},
	{
		id: 'derivativesAggregatorsVolume30d',
		label: 'Derivatives Aggregator Volume (30d)',
		type: 'numeric-range',
		category: 'aggregators',
		strategies: ['protocols'],
		format: 'currency',
		minKey: 'derivativesAggregatorsVolume30dMin',
		maxKey: 'derivativesAggregatorsVolume30dMax'
	},
	{
		id: 'stablesMcap',
		label: 'Stablecoin Market Cap',
		type: 'numeric-range',
		category: 'chain-metrics',
		strategies: ['chains'],
		format: 'currency',
		minKey: 'stablesMcapMin',
		maxKey: 'stablesMcapMax'
	},
	{
		id: 'bridgedTvl',
		label: 'Bridged TVL',
		type: 'numeric-range',
		category: 'chain-metrics',
		strategies: ['chains'],
		format: 'currency',
		minKey: 'bridgedTvlMin',
		maxKey: 'bridgedTvlMax'
	},
	{
		id: 'protocolCount',
		label: 'Protocol Count',
		type: 'numeric-range',
		category: 'chain-metrics',
		strategies: ['chains'],
		format: 'number',
		minKey: 'protocolCountMin',
		maxKey: 'protocolCountMax'
	},
	{
		id: 'hasPerps',
		label: 'Has Perps',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasPerps'
	},
	{
		id: 'hasOptions',
		label: 'Has Options',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasOptions'
	},
	{
		id: 'hasOpenInterest',
		label: 'Has Open Interest',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasOpenInterest'
	},
	{
		id: 'multiChainOnly',
		label: 'Multi-chain Only',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'multiChainOnly'
	},
	{
		id: 'parentProtocolsOnly',
		label: 'Parent Protocols Only',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'parentProtocolsOnly'
	},
	{
		id: 'subProtocolsOnly',
		label: 'Sub-protocols Only',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'subProtocolsOnly'
	},
	{
		id: 'hasVolume',
		label: 'Has Volume',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasVolume'
	},
	{
		id: 'hasFees',
		label: 'Has Fees',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasFees'
	},
	{
		id: 'hasRevenue',
		label: 'Has Revenue',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasRevenue'
	},
	{
		id: 'hasMarketCap',
		label: 'Has Market Cap',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasMarketCap'
	},
	{
		id: 'hasAggregators',
		label: 'Has DEX Aggregator Volume',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasAggregators'
	},
	{
		id: 'hasDerivativesAggregators',
		label: 'Has Derivatives Aggregator Volume',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasDerivativesAggregators'
	},
	{
		id: 'hasBridgedTVL',
		label: 'Has Bridged TVL',
		type: 'boolean',
		category: 'flags',
		strategies: ['chains'],
		booleanKey: 'hasBridgedTVL'
	},
	{
		id: 'hasStables',
		label: 'Has Stablecoins',
		type: 'boolean',
		category: 'flags',
		strategies: ['chains'],
		booleanKey: 'hasStables'
	},
	{
		id: 'hasHolderRevenue',
		label: 'Has Holder Revenue',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasHolderRevenue'
	},
	{
		id: 'hasTreasuryRevenue',
		label: 'Has Treasury Revenue',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasTreasuryRevenue'
	},
	{
		id: 'hasMcapTVLRatio',
		label: 'Has MC/TVL Ratio',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'hasMcapTVLRatio'
	},
	{
		id: 'isVolumeGrowing',
		label: 'Volume Growing',
		description: 'DEX volume increased over the past 7 days compared to previous 7 days',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'isVolumeGrowing'
	},
	{
		id: 'isRevenueGrowing',
		label: 'Revenue Growing',
		description: 'Revenue increased over the past 7 days compared to previous 7 days',
		type: 'boolean',
		category: 'flags',
		strategies: ['protocols'],
		booleanKey: 'isRevenueGrowing'
	}
]

export function getFiltersForStrategy(strategy: StrategyType): FilterConfig[] {
	return FILTER_CONFIGS.filter((config) => config.strategies.includes(strategy))
}

export function getFiltersByCategory(strategy: StrategyType): Map<FilterCategory, FilterConfig[]> {
	const filters = getFiltersForStrategy(strategy)
	const grouped = new Map<FilterCategory, FilterConfig[]>()

	for (const filter of filters) {
		const existing = grouped.get(filter.category) || []
		existing.push(filter)
		grouped.set(filter.category, existing)
	}

	return grouped
}

export function getFilterConfigById(id: string): FilterConfig | undefined {
	return FILTER_CONFIGS.find((config) => config.id === id)
}

export function formatFilterValue(value: number, format: FilterFormat = 'currency'): string {
	if (format === 'percent') {
		return `${value}%`
	}
	if (format === 'number') {
		return value.toLocaleString()
	}
	if (Math.abs(value) >= 1_000_000_000) {
		return `$${(value / 1_000_000_000).toFixed(1)}B`
	}
	if (Math.abs(value) >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(1)}M`
	}
	if (Math.abs(value) >= 1_000) {
		return `$${(value / 1_000).toFixed(1)}K`
	}
	return `$${value.toLocaleString()}`
}

export function getOperatorLabel(operator: NumericOperator): string {
	switch (operator) {
		case '>':
			return '>'
		case '>=':
			return '>='
		case '<':
			return '<'
		case '<=':
			return '<='
		case 'between':
			return 'between'
		default:
			return '>'
	}
}
