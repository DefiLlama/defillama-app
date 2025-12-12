import type { TableFilters } from '../../../types'
import type { NormalizedRow } from '../types'
import { toChainSlug } from '~/containers/ProDashboard/chainNormalizer'

const normalize = (value: string | null | undefined) => value?.toLowerCase().trim()

export function filterRowsByConfig(rows: NormalizedRow[], filters?: TableFilters): NormalizedRow[] {
	if (!filters) {
		return rows
	}

	let filtered = rows

	if (filters.protocols?.length) {
		const protocolSet = new Set(filters.protocols.map((p) => normalize(p)))
		filtered = filtered.filter((row) => {
			const protocolId = normalize(row.protocolId)
			const rowName = normalize(row.name)
			return (protocolId && protocolSet.has(protocolId)) || (rowName && protocolSet.has(rowName))
		})
	}

	if (filters.categories?.length) {
		const categorySet = new Set(filters.categories.map((c) => normalize(c)))
		filtered = filtered.filter((row) => {
			const category = normalize(row.category)
			return category ? categorySet.has(category) : false
		})
	}

	if (filters.excludedCategories?.length) {
		const excludedSet = new Set(filters.excludedCategories.map((c) => normalize(c)))
		filtered = filtered.filter((row) => {
			const category = normalize(row.category)
			return category ? !excludedSet.has(category) : true
		})
	}

	if (filters.chains?.length) {
		const chainSet = new Set(filters.chains.map((c) => toChainSlug(c)))
		filtered = filtered.filter((row) => {
			const chain = toChainSlug(row.chain)
			return chain ? chainSet.has(chain) : true
		})
	}

	if (filters.oracles?.length) {
		const oracleSet = new Set(filters.oracles.map((o) => normalize(o)))
		filtered = filtered.filter((row) => {
			if (!row.oracles || row.oracles.length === 0) {
				return false
			}
			return row.oracles.some((oracle) => {
				const normalizedOracle = normalize(oracle)
				return normalizedOracle ? oracleSet.has(normalizedOracle) : false
			})
		})
	}

	type RangeFilterConfig = {
		minKey?: keyof TableFilters
		maxKey?: keyof TableFilters
		getValue: (row: NormalizedRow) => number | null | undefined
	}

	const numericRangeFilters: RangeFilterConfig[] = [
		{ minKey: 'tvlMin', maxKey: 'tvlMax', getValue: (row) => row.metrics.tvl },
		{ minKey: 'mcapMin', maxKey: 'mcapMax', getValue: (row) => row.metrics.mcap },
		{ minKey: 'volumeDex24hMin', maxKey: 'volumeDex24hMax', getValue: (row) => row.metrics.volume24h },
		{ minKey: 'volume7dMin', maxKey: 'volume7dMax', getValue: (row) => row.metrics.volume_7d },
		{ minKey: 'volume30dMin', maxKey: 'volume30dMax', getValue: (row) => row.metrics.volume_30d },
		{ minKey: 'volumeChange1dMin', maxKey: 'volumeChange1dMax', getValue: (row) => row.metrics.volumeChange_1d },
		{ minKey: 'volumeChange7dMin', maxKey: 'volumeChange7dMax', getValue: (row) => row.metrics.volumeChange_7d },
		{ minKey: 'volumeChange1mMin', maxKey: 'volumeChange1mMax', getValue: (row) => row.metrics.volumeChange_1m },
		{ minKey: 'fees24hMin', maxKey: 'fees24hMax', getValue: (row) => row.metrics.fees24h },
		{ minKey: 'fees7dMin', maxKey: 'fees7dMax', getValue: (row) => row.metrics.fees_7d },
		{ minKey: 'fees30dMin', maxKey: 'fees30dMax', getValue: (row) => row.metrics.fees_30d },
		{ minKey: 'fees1yMin', maxKey: 'fees1yMax', getValue: (row) => row.metrics.fees_1y },
		{ minKey: 'feesChange1dMin', maxKey: 'feesChange1dMax', getValue: (row) => row.metrics.feesChange_1d },
		{ minKey: 'feesChange7dMin', maxKey: 'feesChange7dMax', getValue: (row) => row.metrics.feesChange_7d },
		{ minKey: 'feesChange1mMin', maxKey: 'feesChange1mMax', getValue: (row) => row.metrics.feesChange_1m },
		{ minKey: 'revenue24hMin', maxKey: 'revenue24hMax', getValue: (row) => row.metrics.revenue24h },
		{ minKey: 'revenue7dMin', maxKey: 'revenue7dMax', getValue: (row) => row.metrics.revenue_7d },
		{ minKey: 'revenue30dMin', maxKey: 'revenue30dMax', getValue: (row) => row.metrics.revenue_30d },
		{ minKey: 'revenue1yMin', maxKey: 'revenue1yMax', getValue: (row) => row.metrics.revenue_1y },
		{ minKey: 'revenueChange1dMin', maxKey: 'revenueChange1dMax', getValue: (row) => row.metrics.revenueChange_1d },
		{ minKey: 'revenueChange7dMin', maxKey: 'revenueChange7dMax', getValue: (row) => row.metrics.revenueChange_7d },
		{ minKey: 'revenueChange1mMin', maxKey: 'revenueChange1mMax', getValue: (row) => row.metrics.revenueChange_1m },
		{ minKey: 'change1dMin', maxKey: 'change1dMax', getValue: (row) => row.metrics.change1d },
		{ minKey: 'change7dMin', maxKey: 'change7dMax', getValue: (row) => row.metrics.change7d },
		{ minKey: 'change1mMin', maxKey: 'change1mMax', getValue: (row) => row.metrics.change1m },
		{ minKey: 'pfRatioMin', maxKey: 'pfRatioMax', getValue: (row) => row.metrics.pf },
		{ minKey: 'protocolCountMin', maxKey: 'protocolCountMax', getValue: (row) => row.metrics.protocolCount },
		{ minKey: 'volumeDominance24hMin', maxKey: 'volumeDominance24hMax', getValue: (row) => row.metrics.volumeDominance_24h },
		{ minKey: 'volumeMarketShare7dMin', maxKey: 'volumeMarketShare7dMax', getValue: (row) => row.metrics.volumeMarketShare7d },
		{ minKey: 'tvlShareMin', maxKey: 'tvlShareMax', getValue: (row) => row.metrics.tvlShare },
		{ minKey: 'perpsVolumeDominance24hMin', maxKey: 'perpsVolumeDominance24hMax', getValue: (row) => row.metrics.perps_volume_dominance_24h },
		{ minKey: 'optionsVolumeDominance24hMin', maxKey: 'optionsVolumeDominance24hMax', getValue: (row) => row.metrics.options_volume_dominance_24h },
		{ minKey: 'holderRevenue24hMin', maxKey: 'holderRevenue24hMax', getValue: (row) => row.metrics.holderRevenue_24h },
		{ minKey: 'treasuryRevenue24hMin', maxKey: 'treasuryRevenue24hMax', getValue: (row) => row.metrics.treasuryRevenue_24h },
		{ minKey: 'stablesMcapMin', maxKey: 'stablesMcapMax', getValue: (row) => row.metrics.stablesMcap },
		{ minKey: 'bridgedTvlMin', maxKey: 'bridgedTvlMax', getValue: (row) => row.metrics.bridgedTvl },
		{ minKey: 'aggregatorsVolume24hMin', maxKey: 'aggregatorsVolume24hMax', getValue: (row) => row.metrics.aggregators_volume_24h },
		{ minKey: 'aggregatorsVolume7dMin', maxKey: 'aggregatorsVolume7dMax', getValue: (row) => row.metrics.aggregators_volume_7d },
		{ minKey: 'aggregatorsVolume30dMin', maxKey: 'aggregatorsVolume30dMax', getValue: (row) => row.metrics.aggregators_volume_30d },
		{ minKey: 'derivativesAggregatorsVolume24hMin', maxKey: 'derivativesAggregatorsVolume24hMax', getValue: (row) => row.metrics.derivatives_aggregators_volume_24h },
		{ minKey: 'derivativesAggregatorsVolume7dMin', maxKey: 'derivativesAggregatorsVolume7dMax', getValue: (row) => row.metrics.derivatives_aggregators_volume_7d },
		{ minKey: 'derivativesAggregatorsVolume30dMin', maxKey: 'derivativesAggregatorsVolume30dMax', getValue: (row) => row.metrics.derivatives_aggregators_volume_30d }
	]

	numericRangeFilters.forEach(({ minKey, maxKey, getValue }) => {
		const minValue = minKey ? (filters[minKey] as number | undefined) : undefined
		const maxValue = maxKey ? (filters[maxKey] as number | undefined) : undefined
		if (minValue === undefined && maxValue === undefined) {
			return
		}
		filtered = filtered.filter((row) => {
			const value = getValue(row)
			if (minValue !== undefined && (value === null || value === undefined || value < minValue)) {
				return false
			}
			if (maxValue !== undefined && (value === null || value === undefined || value > maxValue)) {
				return false
			}
			return true
		})
	})

	if (filters.hasPerps) {
		filtered = filtered.filter((row) => (row.metrics.perpsVolume24h ?? 0) > 0)
	}

	if (filters.hasOptions) {
		filtered = filtered.filter((row) => (row.metrics.options_volume_24h ?? 0) > 0)
	}

	if (filters.hasOpenInterest) {
		filtered = filtered.filter((row) => (row.metrics.openInterest ?? 0) > 0)
	}

	if (filters.hasVolume) {
		filtered = filtered.filter((row) => (row.metrics.volume24h ?? 0) > 0)
	}

	if (filters.hasFees) {
		filtered = filtered.filter((row) => (row.metrics.fees24h ?? 0) > 0)
	}

	if (filters.hasRevenue) {
		filtered = filtered.filter((row) => (row.metrics.revenue24h ?? 0) > 0)
	}

	if (filters.hasMarketCap) {
		filtered = filtered.filter((row) => row.metrics.mcap !== null && row.metrics.mcap !== undefined)
	}

	if (filters.hasAggregators) {
		filtered = filtered.filter((row) => (row.metrics.aggregators_volume_24h ?? 0) > 0)
	}

	if (filters.hasDerivativesAggregators) {
		filtered = filtered.filter((row) => (row.metrics.derivatives_aggregators_volume_24h ?? 0) > 0)
	}

	if (filters.hasBridgedTVL) {
		filtered = filtered.filter((row) => (row.metrics.bridgedTvl ?? 0) > 0)
	}

	if (filters.hasStables) {
		filtered = filtered.filter((row) => (row.metrics.stablesMcap ?? 0) > 0)
	}

	if (filters.hasHolderRevenue) {
		filtered = filtered.filter((row) => (row.metrics.holderRevenue_24h ?? 0) > 0)
	}

	if (filters.hasTreasuryRevenue) {
		filtered = filtered.filter((row) => (row.metrics.treasuryRevenue_24h ?? 0) > 0)
	}

	if (filters.hasMcapTVLRatio) {
		filtered = filtered.filter((row) => row.metrics.mcaptvl !== null && row.metrics.mcaptvl !== undefined)
	}

	return filtered
}

export function filterRowsBySearch(rows: NormalizedRow[], searchTerm: string): NormalizedRow[] {
	const term = searchTerm.trim().toLowerCase()
	if (!term) {
		return rows
	}

	return rows.filter((row) => {
		const name = row.name?.toLowerCase() ?? ''
		const chain = row.chain?.toLowerCase() ?? ''
		const category = row.category?.toLowerCase() ?? ''
		return name.includes(term) || chain.includes(term) || category.includes(term)
	})
}
