import type { TableFilters } from '~/containers/ProDashboard/types'
import { formattedNum } from '~/utils'

export interface ActiveFilterChip {
	id: string
	label: string
	value?: string
	clearKeys: (keyof TableFilters)[]
}

const formatList = (values: string[]): string => {
	if (values.length <= 3) {
		return values.join(', ')
	}
	const remaining = values.length - 3
	return `${values.slice(0, 3).join(', ')} +${remaining}`
}

const formatCurrency = (value: number) => formattedNum(value, true)
const formatNumber = (value: number) => formattedNum(value)
const formatPercent = (value: number) => `${formattedNum(value)}%`

const addRangeChip = (
	chips: ActiveFilterChip[],
	filters: TableFilters,
	minKey: keyof TableFilters,
	maxKey: keyof TableFilters,
	label: string,
	formatter: (value: number) => string
) => {
	const minValue = filters[minKey] as number | undefined
	const maxValue = filters[maxKey] as number | undefined
	const hasMin = typeof minValue === 'number'
	const hasMax = typeof maxValue === 'number'
	if (!hasMin && !hasMax) {
		return
	}
	let value: string
	if (hasMin && hasMax) {
		value = `${formatter(minValue!)} - ${formatter(maxValue!)}`
	} else if (hasMin) {
		value = `≥ ${formatter(minValue!)}`
	} else {
		value = `≤ ${formatter(maxValue!)}`
	}
	chips.push({
		id: `${String(minKey)}-${String(maxKey)}`,
		label,
		value,
		clearKeys: [minKey, maxKey]
	})
}

const addListChip = (chips: ActiveFilterChip[], filters: TableFilters, key: keyof TableFilters, label: string) => {
	const values = filters[key]
	if (!Array.isArray(values) || !values.length) {
		return
	}
	chips.push({
		id: String(key),
		label,
		value: formatList(values as string[]),
		clearKeys: [key]
	})
}

const addBooleanChip = (chips: ActiveFilterChip[], filters: TableFilters, key: keyof TableFilters, label: string) => {
	if (!filters[key]) {
		return
	}
	chips.push({ id: String(key), label, clearKeys: [key] })
}

export const getActiveFilterChips = (filters?: TableFilters): ActiveFilterChip[] => {
	if (!filters) {
		return []
	}
	const chips: ActiveFilterChip[] = []
	const clones: TableFilters = { ...filters }

	addListChip(chips, clones, 'protocols', 'Protocols')
	addListChip(chips, clones, 'categories', 'Categories')
	addListChip(chips, clones, 'excludedCategories', 'Exclude Categories')
	addListChip(chips, clones, 'chains', 'Chains')
	addListChip(chips, clones, 'oracles', 'Oracles')
	addListChip(chips, clones, 'poolTypes', 'Pool Types')

	addRangeChip(chips, clones, 'tvlMin', 'tvlMax', 'TVL', formatCurrency)
	addRangeChip(chips, clones, 'mcapMin', 'mcapMax', 'Market Cap', formatCurrency)
	addRangeChip(chips, clones, 'volumeDex24hMin', 'volumeDex24hMax', '24h Volume', formatCurrency)
	addRangeChip(chips, clones, 'volume7dMin', 'volume7dMax', '7d Volume', formatCurrency)
	addRangeChip(chips, clones, 'volume30dMin', 'volume30dMax', '30d Volume', formatCurrency)
	addRangeChip(chips, clones, 'volumeChange1dMin', 'volumeChange1dMax', 'Volume Change 1d', formatPercent)
	addRangeChip(chips, clones, 'volumeChange7dMin', 'volumeChange7dMax', 'Volume Change 7d', formatPercent)
	addRangeChip(chips, clones, 'volumeChange1mMin', 'volumeChange1mMax', 'Volume Change 30d', formatPercent)
	addRangeChip(chips, clones, 'fees24hMin', 'fees24hMax', '24h Fees', formatCurrency)
	addRangeChip(chips, clones, 'fees7dMin', 'fees7dMax', '7d Fees', formatCurrency)
	addRangeChip(chips, clones, 'fees30dMin', 'fees30dMax', '30d Fees', formatCurrency)
	addRangeChip(chips, clones, 'fees1yMin', 'fees1yMax', '1y Fees', formatCurrency)
	addRangeChip(chips, clones, 'feesChange1dMin', 'feesChange1dMax', 'Fees Change 1d', formatPercent)
	addRangeChip(chips, clones, 'feesChange7dMin', 'feesChange7dMax', 'Fees Change 7d', formatPercent)
	addRangeChip(chips, clones, 'feesChange1mMin', 'feesChange1mMax', 'Fees Change 30d', formatPercent)
	addRangeChip(chips, clones, 'revenue24hMin', 'revenue24hMax', '24h Revenue', formatCurrency)
	addRangeChip(chips, clones, 'revenue7dMin', 'revenue7dMax', '7d Revenue', formatCurrency)
	addRangeChip(chips, clones, 'revenue30dMin', 'revenue30dMax', '30d Revenue', formatCurrency)
	addRangeChip(chips, clones, 'revenue1yMin', 'revenue1yMax', '1y Revenue', formatCurrency)
	addRangeChip(chips, clones, 'revenueChange1dMin', 'revenueChange1dMax', 'Revenue Change 1d', formatPercent)
	addRangeChip(chips, clones, 'revenueChange7dMin', 'revenueChange7dMax', 'Revenue Change 7d', formatPercent)
	addRangeChip(chips, clones, 'revenueChange1mMin', 'revenueChange1mMax', 'Revenue Change 30d', formatPercent)
	addRangeChip(chips, clones, 'change1dMin', 'change1dMax', 'TVL Change 1d', formatPercent)
	addRangeChip(chips, clones, 'change7dMin', 'change7dMax', 'TVL Change 7d', formatPercent)
	addRangeChip(chips, clones, 'change1mMin', 'change1mMax', 'TVL Change 30d', formatPercent)
	addRangeChip(chips, clones, 'apyMin', 'apyMax', 'APY', formatPercent)
	addRangeChip(chips, clones, 'baseApyMin', 'baseApyMax', 'Base APY', formatPercent)
	addRangeChip(chips, clones, 'pfRatioMin', 'pfRatioMax', 'P/F Ratio', formatNumber)
	addRangeChip(chips, clones, 'protocolCountMin', 'protocolCountMax', 'Protocol Count', formatNumber)
	addRangeChip(chips, clones, 'volumeDominance24hMin', 'volumeDominance24hMax', '24h Volume Dominance', formatPercent)
	addRangeChip(chips, clones, 'volumeMarketShare7dMin', 'volumeMarketShare7dMax', '7d Volume Share', formatPercent)
	addRangeChip(chips, clones, 'tvlShareMin', 'tvlShareMax', 'TVL Share', formatPercent)
	addRangeChip(
		chips,
		clones,
		'perpsVolumeDominance24hMin',
		'perpsVolumeDominance24hMax',
		'Perps Volume Dominance 24h',
		formatPercent
	)
	addRangeChip(
		chips,
		clones,
		'optionsVolumeDominance24hMin',
		'optionsVolumeDominance24hMax',
		'Options Volume Dominance 24h',
		formatPercent
	)
	addRangeChip(chips, clones, 'holderRevenue24hMin', 'holderRevenue24hMax', 'Holder Revenue 24h', formatCurrency)
	addRangeChip(chips, clones, 'treasuryRevenue24hMin', 'treasuryRevenue24hMax', 'Treasury Revenue 24h', formatCurrency)
	addRangeChip(chips, clones, 'stablesMcapMin', 'stablesMcapMax', 'Stablecoin Market Cap', formatCurrency)
	addRangeChip(chips, clones, 'bridgedTvlMin', 'bridgedTvlMax', 'Bridged TVL', formatCurrency)
	addRangeChip(
		chips,
		clones,
		'aggregatorsVolume24hMin',
		'aggregatorsVolume24hMax',
		'Aggregator Volume 24h',
		formatCurrency
	)
	addRangeChip(
		chips,
		clones,
		'aggregatorsVolume7dMin',
		'aggregatorsVolume7dMax',
		'Aggregator Volume 7d',
		formatCurrency
	)
	addRangeChip(
		chips,
		clones,
		'aggregatorsVolume30dMin',
		'aggregatorsVolume30dMax',
		'Aggregator Volume 30d',
		formatCurrency
	)
	addRangeChip(
		chips,
		clones,
		'derivativesAggregatorsVolume24hMin',
		'derivativesAggregatorsVolume24hMax',
		'Derivatives Aggregator Volume 24h',
		formatCurrency
	)
	addRangeChip(
		chips,
		clones,
		'derivativesAggregatorsVolume7dMin',
		'derivativesAggregatorsVolume7dMax',
		'Derivatives Aggregator Volume 7d',
		formatCurrency
	)
	addRangeChip(
		chips,
		clones,
		'derivativesAggregatorsVolume30dMin',
		'derivativesAggregatorsVolume30dMax',
		'Derivatives Aggregator Volume 30d',
		formatCurrency
	)

	addBooleanChip(chips, clones, 'multiChainOnly', 'Multi-chain only')
	addBooleanChip(chips, clones, 'parentProtocolsOnly', 'Parent protocols only')
	addBooleanChip(chips, clones, 'subProtocolsOnly', 'Sub-protocols only')
	addBooleanChip(chips, clones, 'stablesOnly', 'Stablecoin pools only')
	addBooleanChip(chips, clones, 'activeLending', 'Active lending pools')
	addBooleanChip(chips, clones, 'hasRewards', 'Rewards enabled')
	addBooleanChip(chips, clones, 'hasPerps', 'Perps only')
	addBooleanChip(chips, clones, 'hasOptions', 'Options only')
	addBooleanChip(chips, clones, 'hasOpenInterest', 'Has open interest')
	addBooleanChip(chips, clones, 'hasVolume', 'Has volume (24h)')
	addBooleanChip(chips, clones, 'hasFees', 'Has fees (24h)')
	addBooleanChip(chips, clones, 'hasRevenue', 'Has revenue (24h)')
	addBooleanChip(chips, clones, 'hasMarketCap', 'Has market cap')
	addBooleanChip(chips, clones, 'hasAggregators', 'Has DEX aggregator volume')
	addBooleanChip(chips, clones, 'hasDerivativesAggregators', 'Has derivatives aggregator volume')
	addBooleanChip(chips, clones, 'hasBridgedTVL', 'Has bridged TVL')
	addBooleanChip(chips, clones, 'hasStables', 'Has stablecoins')
	addBooleanChip(chips, clones, 'hasHolderRevenue', 'Has holder revenue')
	addBooleanChip(chips, clones, 'hasTreasuryRevenue', 'Has treasury revenue')
	addBooleanChip(chips, clones, 'hasMcapTVLRatio', 'Has MC/TVL ratio')
	addBooleanChip(chips, clones, 'isVolumeGrowing', 'Volume growing (7d)')
	addBooleanChip(chips, clones, 'isRevenueGrowing', 'Revenue growing (7d)')

	return chips
}
