'use no memo'

import * as React from 'react'
import type { IParentProtocol } from '~/api/types'
import { getPercentChange } from '~/utils'
import type { IProtocolRow } from './proTable.types'
import type { UseProTableDataParams, UseProTableDataResult, ProtocolWithSubRows } from './proTable.types'
import { formatProtocolsList } from './proTable.utils'
import {
	useGetProtocolsAggregatorsByMultiChain,
	useGetProtocolsBridgeAggregatorsByMultiChain,
	useGetProtocolsEarningsByMultiChain,
	useGetProtocolsFeesAndRevenueByMultiChain,
	useGetProtocolsListMultiChain,
	useGetProtocolsOpenInterestByMultiChain,
	useGetProtocolsOptionsVolumeByMultiChain,
	useGetProtocolsPerpsVolumeByMultiChain,
	useGetProtocolsVolumeByMultiChain
} from './useProTableMultiChain'

type ProtocolFilterSet = {
	protocolSet: Set<string> | null
	categorySet: Set<string> | null
	excludedCategorySet: Set<string> | null
	oracleSet: Set<string> | null
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isProtocolRow = (value: unknown): value is IProtocolRow => {
	if (!isObject(value)) return false
	return typeof Reflect.get(value, 'name') === 'string'
}

const isParentProtocol = (value: unknown): value is IParentProtocol => {
	if (!isObject(value)) return false
	return typeof Reflect.get(value, 'id') === 'string' && typeof Reflect.get(value, 'name') === 'string'
}

const normalizeProtocolRows = (value: unknown): IProtocolRow[] => {
	if (!Array.isArray(value)) return []
	return value.filter(isProtocolRow)
}

const normalizeParentProtocols = (value: unknown): IParentProtocol[] => {
	if (!Array.isArray(value)) return []
	return value.filter(isParentProtocol)
}

const hasSubRows = (protocol: IProtocolRow): protocol is ProtocolWithSubRows => {
	return Array.isArray(protocol.subRows) && protocol.subRows.length > 0
}

const toNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	return null
}

const getProtocolOracles = (protocol: IProtocolRow): string[] => {
	if (Array.isArray(protocol.oracles) && protocol.oracles.length > 0) {
		return protocol.oracles
	}

	const chainOracles = protocol.oraclesByChain
	if (!chainOracles) return []

	const flattened = new Set<string>()
	for (const oracles of Object.values(chainOracles)) {
		for (const oracle of oracles) {
			flattened.add(oracle)
		}
	}

	return Array.from(flattened)
}

const recalculateParentMetrics = (
	parent: ProtocolWithSubRows,
	filteredSubRows: IProtocolRow[]
): ProtocolWithSubRows => {
	let tvl = 0
	let tvlPrevDay = 0
	let tvlPrevWeek = 0
	let tvlPrevMonth = 0
	let mcap = 0
	let volume24h = 0
	let volume7d = 0
	let volume30d = 0
	let fees24h = 0
	let fees7d = 0
	let fees30d = 0
	let fees1y = 0
	let average1y = 0
	let revenue24h = 0
	let revenue7d = 0
	let revenue30d = 0
	let revenue1y = 0
	let perpsVolume24h = 0
	let perpsVolume7d = 0
	let perpsVolume30d = 0
	let openInterest = 0
	let weightedVolumeChange = 0
	let totalVolumeWeight = 0
	let weightedPerpsVolumeChange = 0
	let totalPerpsVolumeWeight = 0

	for (const child of filteredSubRows) {
		const childTvl = toNumber(child.tvl)
		if (childTvl !== null) tvl += childTvl

		const childTvlPrevDay = toNumber(child.tvlPrevDay)
		if (childTvlPrevDay !== null) tvlPrevDay += childTvlPrevDay

		const childTvlPrevWeek = toNumber(child.tvlPrevWeek)
		if (childTvlPrevWeek !== null) tvlPrevWeek += childTvlPrevWeek

		const childTvlPrevMonth = toNumber(child.tvlPrevMonth)
		if (childTvlPrevMonth !== null) tvlPrevMonth += childTvlPrevMonth

		const childMcap = toNumber(child.mcap)
		if (childMcap !== null) mcap += childMcap

		const childVolume24h = toNumber(child.volume_24h)
		if (childVolume24h !== null) volume24h += childVolume24h

		const childVolume7d = toNumber(child.volume_7d)
		if (childVolume7d !== null) volume7d += childVolume7d

		const childVolume30d = toNumber(child.volume_30d)
		if (childVolume30d !== null) volume30d += childVolume30d

		const childVolumeChange7d = toNumber(child.volumeChange_7d)
		if (childVolume7d !== null && childVolumeChange7d !== null) {
			weightedVolumeChange += childVolumeChange7d * childVolume7d
			totalVolumeWeight += childVolume7d
		}

		const childFees24h = toNumber(child.fees_24h)
		if (childFees24h !== null) fees24h += childFees24h

		const childFees7d = toNumber(child.fees_7d)
		if (childFees7d !== null) fees7d += childFees7d

		const childFees30d = toNumber(child.fees_30d)
		if (childFees30d !== null) fees30d += childFees30d

		const childFees1y = toNumber(child.fees_1y)
		if (childFees1y !== null) fees1y += childFees1y

		const childAverage1y = toNumber(child.average_1y)
		if (childAverage1y !== null) average1y += childAverage1y

		const childRevenue24h = toNumber(child.revenue_24h)
		if (childRevenue24h !== null) revenue24h += childRevenue24h

		const childRevenue7d = toNumber(child.revenue_7d)
		if (childRevenue7d !== null) revenue7d += childRevenue7d

		const childRevenue30d = toNumber(child.revenue_30d)
		if (childRevenue30d !== null) revenue30d += childRevenue30d

		const childRevenue1y = toNumber(child.revenue_1y)
		if (childRevenue1y !== null) revenue1y += childRevenue1y

		const childPerpsVolume24h = toNumber(child.perps_volume_24h)
		if (childPerpsVolume24h !== null) perpsVolume24h += childPerpsVolume24h

		const childPerpsVolume7d = toNumber(child.perps_volume_7d)
		if (childPerpsVolume7d !== null) perpsVolume7d += childPerpsVolume7d

		const childPerpsVolume30d = toNumber(child.perps_volume_30d)
		if (childPerpsVolume30d !== null) perpsVolume30d += childPerpsVolume30d

		const childPerpsVolumeChange7d = toNumber(child.perps_volume_change_7d)
		if (childPerpsVolume7d !== null && childPerpsVolumeChange7d !== null) {
			weightedPerpsVolumeChange += childPerpsVolumeChange7d * childPerpsVolume7d
			totalPerpsVolumeWeight += childPerpsVolume7d
		}

		const childOpenInterest = toNumber(child.openInterest)
		if (childOpenInterest !== null) openInterest += childOpenInterest
	}

	const change1d = getPercentChange(tvl, tvlPrevDay)
	const change7d = getPercentChange(tvl, tvlPrevWeek)
	const change1m = getPercentChange(tvl, tvlPrevMonth)

	const volumeChange7d = totalVolumeWeight > 0 ? weightedVolumeChange / totalVolumeWeight : null
	const perpsVolumeChange7d = totalPerpsVolumeWeight > 0 ? weightedPerpsVolumeChange / totalPerpsVolumeWeight : null

	const parentMcap = toNumber(parent.mcap) ?? 0
	const finalMcap = mcap > 0 ? mcap : parentMcap
	const mcaptvl = tvl > 0 && finalMcap > 0 ? Number((finalMcap / tvl).toFixed(2)) : null

	const oracleSet = new Set<string>()
	const oraclesByChain = new Map<string, Set<string>>()

	const addOracles = (protocol: IProtocolRow) => {
		if (Array.isArray(protocol.oracles)) {
			for (const oracle of protocol.oracles) {
				oracleSet.add(oracle)
			}
		}

		if (!protocol.oraclesByChain) return

		for (const [chain, chainOracles] of Object.entries(protocol.oraclesByChain)) {
			const existingSet = oraclesByChain.get(chain) ?? new Set<string>()
			for (const oracle of chainOracles) {
				existingSet.add(oracle)
			}
			oraclesByChain.set(chain, existingSet)
		}
	}

	addOracles(parent)
	for (const child of filteredSubRows) {
		addOracles(child)
	}

	const aggregatedOraclesByChain: Record<string, string[]> = {}
	for (const [chain, chainOracles] of oraclesByChain.entries()) {
		aggregatedOraclesByChain[chain] = Array.from(chainOracles).toSorted((a, b) => a.localeCompare(b))
	}

	return {
		...parent,
		tvl,
		tvlPrevDay,
		tvlPrevWeek,
		tvlPrevMonth,
		mcap: finalMcap,
		volume_24h: volume24h,
		volume_7d: volume7d,
		volume_30d: volume30d,
		volumeChange_7d: volumeChange7d,
		fees_24h: fees24h,
		fees_7d: fees7d,
		fees_30d: fees30d,
		fees_1y: fees1y,
		average_1y: average1y,
		revenue_24h: revenue24h,
		revenue_7d: revenue7d,
		revenue_30d: revenue30d,
		revenue_1y: revenue1y,
		perps_volume_24h: perpsVolume24h,
		perps_volume_7d: perpsVolume7d,
		perps_volume_30d: perpsVolume30d,
		perps_volume_change_7d: perpsVolumeChange7d,
		openInterest,
		change_1d: change1d,
		change_7d: change7d,
		change_1m: change1m,
		mcaptvl,
		subRows: filteredSubRows,
		oracles: Array.from(oracleSet).toSorted((a, b) => a.localeCompare(b)),
		oraclesByChain: Object.keys(aggregatedOraclesByChain).length > 0 ? aggregatedOraclesByChain : parent.oraclesByChain
	}
}

const filterWithParentSupport = (
	protocols: IProtocolRow[],
	predicate: (protocol: IProtocolRow) => boolean
): IProtocolRow[] => {
	const filtered = protocols.map((protocol) => {
		if (predicate(protocol)) {
			return protocol
		}

		if (!hasSubRows(protocol)) {
			return null
		}

		const filteredSubRows = protocol.subRows.filter(predicate)
		if (filteredSubRows.length === 0) {
			return null
		}

		return recalculateParentMetrics(protocol, filteredSubRows)
	})

	return filtered.filter((protocol): protocol is IProtocolRow => protocol !== null)
}

const createFilterSets = (filters?: UseProTableDataParams['filters']): ProtocolFilterSet => {
	return {
		protocolSet: filters?.protocols && filters.protocols.length > 0 ? new Set(filters.protocols) : null,
		categorySet: filters?.categories && filters.categories.length > 0 ? new Set(filters.categories) : null,
		excludedCategorySet:
			filters?.excludedCategories && filters.excludedCategories.length > 0 ? new Set(filters.excludedCategories) : null,
		oracleSet: filters?.oracles && filters.oracles.length > 0 ? new Set(filters.oracles) : null
	}
}

const applyFilters = (protocols: IProtocolRow[], filterSets: ProtocolFilterSet): IProtocolRow[] => {
	let filtered = protocols

	if (filterSets.excludedCategorySet) {
		filtered = filtered
			.map((protocol) => {
				if (
					protocol.category &&
					filterSets.excludedCategorySet &&
					filterSets.excludedCategorySet.has(protocol.category)
				) {
					return null
				}

				if (!hasSubRows(protocol)) {
					return protocol
				}

				const filteredSubRows = protocol.subRows.filter(
					(child) =>
						!child.category || !filterSets.excludedCategorySet || !filterSets.excludedCategorySet.has(child.category)
				)
				if (filteredSubRows.length === 0) {
					return null
				}

				return recalculateParentMetrics(protocol, filteredSubRows)
			})
			.filter((protocol): protocol is IProtocolRow => protocol !== null)
	}

	if (filterSets.protocolSet) {
		filtered = filterWithParentSupport(
			filtered,
			(protocol) =>
				typeof protocol.name === 'string' &&
				filterSets.protocolSet !== null &&
				filterSets.protocolSet.has(protocol.name)
		)
	}

	if (filterSets.oracleSet) {
		filtered = filterWithParentSupport(filtered, (protocol) =>
			getProtocolOracles(protocol).some((oracle) => filterSets.oracleSet !== null && filterSets.oracleSet.has(oracle))
		)
	}

	if (filterSets.categorySet) {
		filtered = filterWithParentSupport(
			filtered,
			(protocol) =>
				!!protocol.category && filterSets.categorySet !== null && filterSets.categorySet.has(protocol.category)
		)
	}

	return filtered
}

export function useProTableData({ chains, filters }: UseProTableDataParams): UseProTableDataResult {
	const {
		fullProtocolsList: rawProtocols,
		parentProtocols: rawParentProtocols,
		isLoading: isLoadingProtocols
	} = useGetProtocolsListMultiChain(chains)
	const { data: chainProtocolsVolumes, isLoading: isLoadingVolumes } = useGetProtocolsVolumeByMultiChain(chains)
	const { data: chainProtocolsFees, isLoading: isLoadingFees } = useGetProtocolsFeesAndRevenueByMultiChain(chains)
	const { data: chainProtocolsPerps, isLoading: isLoadingPerps } = useGetProtocolsPerpsVolumeByMultiChain(chains)
	const { data: chainProtocolsOpenInterest, isLoading: isLoadingOpenInterest } =
		useGetProtocolsOpenInterestByMultiChain(chains)
	const { data: chainProtocolsEarnings } = useGetProtocolsEarningsByMultiChain(chains)
	const { data: chainProtocolsAggregators } = useGetProtocolsAggregatorsByMultiChain(chains)
	const { data: chainProtocolsBridgeAggregators } = useGetProtocolsBridgeAggregatorsByMultiChain(chains)
	const { data: chainProtocolsOptions } = useGetProtocolsOptionsVolumeByMultiChain(chains)

	const fullProtocolsList = normalizeProtocolRows(rawProtocols)
	const parentProtocols = normalizeParentProtocols(rawParentProtocols)

	const isLoading =
		isLoadingProtocols ||
		isLoadingVolumes ||
		isLoadingFees ||
		isLoadingPerps ||
		isLoadingOpenInterest ||
		fullProtocolsList.length === 0

	const finalProtocolsList = React.useMemo(() => {
		const formatted = formatProtocolsList({
			extraTvlsEnabled: {},
			protocols: fullProtocolsList,
			parentProtocols,
			volumeData: chainProtocolsVolumes,
			feesData: chainProtocolsFees,
			perpsData: chainProtocolsPerps,
			openInterestData: chainProtocolsOpenInterest,
			earningsData: chainProtocolsEarnings,
			aggregatorsData: chainProtocolsAggregators,
			bridgeAggregatorsData: chainProtocolsBridgeAggregators,
			optionsData: chainProtocolsOptions
		})

		const normalizedFormatted = normalizeProtocolRows(formatted)
		const filterSets = createFilterSets(filters)
		return applyFilters(normalizedFormatted, filterSets)
	}, [
		fullProtocolsList,
		parentProtocols,
		chainProtocolsVolumes,
		chainProtocolsFees,
		chainProtocolsPerps,
		chainProtocolsOpenInterest,
		chainProtocolsEarnings,
		chainProtocolsAggregators,
		chainProtocolsBridgeAggregators,
		chainProtocolsOptions,
		filters
	])

	const categories = React.useMemo(() => {
		const uniqueCategories = new Set<string>()
		for (const protocol of fullProtocolsList) {
			if (protocol.category) {
				uniqueCategories.add(protocol.category)
			}
		}
		return Array.from(uniqueCategories).toSorted((a, b) => a.localeCompare(b))
	}, [fullProtocolsList])

	const availableProtocols = React.useMemo(() => {
		return fullProtocolsList.toSorted((a, b) => {
			const aTvl = toNumber(a.tvl) ?? 0
			const bTvl = toNumber(b.tvl) ?? 0
			return bTvl - aTvl
		})
	}, [fullProtocolsList])

	return {
		finalProtocolsList,
		isLoading,
		categories,
		availableProtocols,
		parentProtocols
	}
}
