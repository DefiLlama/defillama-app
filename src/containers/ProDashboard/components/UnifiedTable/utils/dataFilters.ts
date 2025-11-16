import type { TableFilters } from '../../../types'
import type { NormalizedRow } from '../types'

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
		const chainSet = new Set(filters.chains.map((c) => normalize(c)))
		filtered = filtered.filter((row) => {
			const chain = normalize(row.chain)
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

	if (filters.tvlMin !== undefined) {
		filtered = filtered.filter((row) => row.metrics.tvl !== null && row.metrics.tvl !== undefined && row.metrics.tvl >= filters.tvlMin!)
	}

	if (filters.tvlMax !== undefined) {
		filtered = filtered.filter((row) => row.metrics.tvl !== null && row.metrics.tvl !== undefined && row.metrics.tvl <= filters.tvlMax!)
	}

	if (filters.mcapMin !== undefined) {
		filtered = filtered.filter((row) => row.metrics.mcap !== null && row.metrics.mcap !== undefined && row.metrics.mcap >= filters.mcapMin!)
	}

	if (filters.mcapMax !== undefined) {
		filtered = filtered.filter((row) => row.metrics.mcap !== null && row.metrics.mcap !== undefined && row.metrics.mcap <= filters.mcapMax!)
	}

	if (filters.volumeDex24hMin !== undefined) {
		filtered = filtered.filter(
			(row) => row.metrics.volume24h !== null && row.metrics.volume24h !== undefined && row.metrics.volume24h >= filters.volumeDex24hMin!
		)
	}

	if (filters.volumeDex24hMax !== undefined) {
		filtered = filtered.filter(
			(row) => row.metrics.volume24h !== null && row.metrics.volume24h !== undefined && row.metrics.volume24h <= filters.volumeDex24hMax!
		)
	}

	if (filters.fees24hMin !== undefined) {
		filtered = filtered.filter(
			(row) => row.metrics.fees24h !== null && row.metrics.fees24h !== undefined && row.metrics.fees24h >= filters.fees24hMin!
		)
	}

	if (filters.fees24hMax !== undefined) {
		filtered = filtered.filter(
			(row) => row.metrics.fees24h !== null && row.metrics.fees24h !== undefined && row.metrics.fees24h <= filters.fees24hMax!
		)
	}

	if (filters.revenue24hMin !== undefined) {
		filtered = filtered.filter(
			(row) => row.metrics.revenue24h !== null && row.metrics.revenue24h !== undefined && row.metrics.revenue24h >= filters.revenue24hMin!
		)
	}

	if (filters.revenue24hMax !== undefined) {
		filtered = filtered.filter(
			(row) => row.metrics.revenue24h !== null && row.metrics.revenue24h !== undefined && row.metrics.revenue24h <= filters.revenue24hMax!
		)
	}

	if (filters.pfRatioMin !== undefined) {
		filtered = filtered.filter((row) => row.metrics.pf !== null && row.metrics.pf !== undefined && row.metrics.pf >= filters.pfRatioMin!)
	}

	if (filters.pfRatioMax !== undefined) {
		filtered = filtered.filter((row) => row.metrics.pf !== null && row.metrics.pf !== undefined && row.metrics.pf <= filters.pfRatioMax!)
	}

	if (filters.hasPerps) {
		filtered = filtered.filter((row) => row.strategyType === 'protocols' && (row.metrics.perpsVolume24h ?? 0) > 0)
	}

	if (filters.hasOptions) {
		filtered = filtered.filter((row) => row.strategyType === 'protocols' && (row.metrics.options_volume_24h ?? 0) > 0)
	}

	if (filters.hasOpenInterest) {
		filtered = filtered.filter((row) => row.metrics.openInterest !== null && row.metrics.openInterest !== undefined && row.metrics.openInterest > 0)
	}

	if (filters.multiChainOnly) {
		filtered = filtered.filter((row) => row.strategyType === 'protocols' && (row.chains?.filter(Boolean).length ?? 0) > 1)
	}

	if (filters.parentProtocolsOnly) {
		filtered = filtered.filter((row) => row.strategyType === 'protocols' && !row.parentProtocolId)
	}

	if (filters.subProtocolsOnly) {
		filtered = filtered.filter((row) => row.strategyType === 'protocols' && Boolean(row.parentProtocolId))
	}

	if (filters.protocolCountMin !== undefined) {
		filtered = filtered.filter(
			(row) =>
				row.strategyType === 'chains' &&
				row.metrics.protocolCount !== null &&
				row.metrics.protocolCount !== undefined &&
				row.metrics.protocolCount >= filters.protocolCountMin!
		)
	}

	if (filters.protocolCountMax !== undefined) {
		filtered = filtered.filter(
			(row) =>
				row.strategyType === 'chains' &&
				row.metrics.protocolCount !== null &&
				row.metrics.protocolCount !== undefined &&
				row.metrics.protocolCount <= filters.protocolCountMax!
		)
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
