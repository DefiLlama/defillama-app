import { useEffect, useMemo } from 'react'
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
} from '~/api/categories/chains/multiChainClient'
import type { IFormattedProtocol, IParentProtocol } from '~/api/types'
import { formatProtocolsList } from '~/hooks/data/defi'
import { getPercentChange } from '~/utils'
import type { UnifiedRowHeaderType } from '../../../types'
import type { NormalizedRow, NumericMetrics } from '../types'

export interface ProtocolsStrategyParams {
	chains?: string[]
}

const derivePrevFromChange = (current: number | null | undefined, change: number | null | undefined) => {
	if (current === null || current === undefined || change === null || change === undefined) {
		return null
	}
	const denominator = 1 + change / 100
	if (!Number.isFinite(denominator) || denominator === 0) {
		return null
	}
	return current / denominator
}

type ExtendedProtocol = IFormattedProtocol & {
	isParentProtocol?: boolean
	subRows?: IFormattedProtocol[]
}

type ChainTvlEntry = {
	tvl?: number | null
	tvlPrevDay?: number | null
	tvlPrevWeek?: number | null
	tvlPrevMonth?: number | null
}

const toMetrics = (protocol: any): NumericMetrics => ({
	tvl: protocol.tvl ?? null,
	tvlPrevDay: protocol.tvlPrevDay ?? null,
	tvlPrevWeek: protocol.tvlPrevWeek ?? null,
	tvlPrevMonth: protocol.tvlPrevMonth ?? null,
	change1d: protocol.change_1d ?? null,
	change7d: protocol.change_7d ?? null,
	change1m: protocol.change_1m ?? null,
	volume24h: protocol.volume_24h ?? null,
	fees24h: protocol.fees_24h ?? null,
	revenue24h: protocol.revenue_24h ?? null,
	perpsVolume24h: protocol.perps_volume_24h ?? null,
	openInterest: protocol.openInterest ?? null,
	mcap: protocol.mcap ?? null,
	protocolCount: 1
})

export function useProtocolsStrategy(
	params: ProtocolsStrategyParams | null | undefined,
	rowHeaders: UnifiedRowHeaderType[]
) {
	const chains = params?.chains?.length ? params.chains : ['All']

	const {
		fullProtocolsList,
		parentProtocols,
		isLoading: isLoadingProtocolsList
	} = useGetProtocolsListMultiChain(chains)
	const { data: volumeData, isLoading: isLoadingVolume } = useGetProtocolsVolumeByMultiChain(chains)
	const { data: feesData, isLoading: isLoadingFees } = useGetProtocolsFeesAndRevenueByMultiChain(chains)
	const { data: perpsData, isLoading: isLoadingPerps } = useGetProtocolsPerpsVolumeByMultiChain(chains)
	const { data: openInterestData, isLoading: isLoadingOpenInterest } = useGetProtocolsOpenInterestByMultiChain(chains)
	const { data: earningsData, isLoading: isLoadingEarnings } = useGetProtocolsEarningsByMultiChain(chains)
	const { data: aggregatorsData, isLoading: isLoadingAggregators } = useGetProtocolsAggregatorsByMultiChain(chains)
	const {
		data: bridgeAggregatorsData,
		isLoading: isLoadingBridgeAggregators
	} = useGetProtocolsBridgeAggregatorsByMultiChain(chains)
	const { data: optionsData, isLoading: isLoadingOptions } = useGetProtocolsOptionsVolumeByMultiChain(chains)

	const formattedProtocols = useMemo<ExtendedProtocol[]>(() => {
		if (!fullProtocolsList?.length) {
			return []
		}

		return formatProtocolsList({
			protocols: fullProtocolsList,
			parentProtocols,
			extraTvlsEnabled: {},
			volumeData,
			feesData,
			perpsData,
			openInterestData,
			earningsData,
			aggregatorsData,
			bridgeAggregatorsData,
			optionsData,
			noSubrows: false
		}) as ExtendedProtocol[]
	}, [
		fullProtocolsList,
		parentProtocols,
		volumeData,
		feesData,
		perpsData,
		openInterestData,
		earningsData,
		aggregatorsData,
		bridgeAggregatorsData,
		optionsData
	])

	const shouldExplodeByChain = rowHeaders.includes('chain')

	const normalizedChainFilter = useMemo(() => {
		if (!params?.chains?.length) return null
		const normalized = params.chains
			.map((chain) => chain.trim().toLowerCase())
			.filter((chain) => chain !== 'all')
		return normalized.length ? new Set(normalized) : null
	}, [params?.chains])

	const parentNameLookup = useMemo(() => {
		const map = new Map<string, string | null>()
		if (Array.isArray(parentProtocols)) {
			(parentProtocols as IParentProtocol[]).forEach((parent) => {
				map.set(String(parent.id), parent.name ?? null)
			})
		}
		return map
	}, [parentProtocols])

	const parentLogoLookup = useMemo(() => {
		const map = new Map<string, string | null>()
		if (Array.isArray(parentProtocols)) {
			(parentProtocols as IParentProtocol[]).forEach((parent) => {
				map.set(String(parent.id), parent.logo ?? null)
			})
		}
		return map
	}, [parentProtocols])

	const rows: NormalizedRow[] = useMemo(() => {
		if (!formattedProtocols.length) {
			return []
		}

		const chainFilterActive = Boolean(normalizedChainFilter && normalizedChainFilter.size)
		const normalizeChainName = (value: string) => value.trim().toLowerCase()
		const normalizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
		const processed = new Set<string>()
		const result: NormalizedRow[] = []

		const shouldIncludeChain = (chainName: string) => {
			if (!chainFilterActive || !normalizedChainFilter) return true
			return normalizedChainFilter.has(normalizeChainName(chainName))
		}

		const emitProtocolRows = (
			protocolData: ExtendedProtocol,
			parentInfo?: { parentId: string; parentName: string | null; parentLogo?: string | null }
		) => {
			const protocolName = protocolData.name ?? 'Unknown Protocol'
			const protocolSlug = String(
				protocolData.defillamaId ?? (protocolData as any).slug ?? normalizeId(protocolName) ?? result.length
			)
			const category = protocolData.category ?? null
			const baseMetrics = toMetrics(protocolData)
			const parentId = parentInfo?.parentId ?? (protocolData.parentProtocol ? String(protocolData.parentProtocol) : null)
			const parentLogo = parentInfo?.parentLogo ?? (parentId ? parentLogoLookup.get(parentId) ?? null : null)
			const baseRow: Omit<NormalizedRow, 'id' | 'metrics' | 'chain'> = {
				name: protocolName,
				displayName: protocolName,
				protocolId: protocolSlug,
				logo: protocolData.logo ?? null,
				category,
				parentProtocolId: parentId,
				parentProtocolName: parentInfo?.parentName ?? parentNameLookup.get(parentId ?? '') ?? null,
				parentProtocolLogo: parentLogo,
				strategyType: 'protocols' as const,
				original: protocolData
			}

			if (shouldExplodeByChain) {
				const chainTvls = protocolData.chainTvls || {}
				const entries = Object.entries(chainTvls).filter(([, values]) => typeof (values as any)?.tvl === 'number')
				const filteredEntries = entries.filter(([chainName]) => shouldIncludeChain(chainName))

					if (filteredEntries.length) {
						for (const [chainName, rawValues] of filteredEntries) {
							const chainValues = rawValues as ChainTvlEntry
							const chainTvl = chainValues?.tvl ?? null
							const prevDay = chainValues?.tvlPrevDay ?? null
							const prevWeek = chainValues?.tvlPrevWeek ?? null
							const prevMonth = chainValues?.tvlPrevMonth ?? null
							const normalizedChainKey = normalizeChainName(chainName)
							const volumeBreakdown = protocolData.volumeByChain?.[normalizedChainKey]
							const feesBreakdown = protocolData.feesByChain?.[normalizedChainKey]
							const revenueBreakdown =
								protocolData.revenueByChain?.[normalizedChainKey] ?? feesBreakdown
							const perpsBreakdown = protocolData.perpsVolumeByChain?.[normalizedChainKey]
							const openInterestBreakdown = protocolData.openInterestByChain?.[normalizedChainKey]

							const chainMetrics: NumericMetrics = {
								tvl: chainTvl,
								tvlPrevDay: prevDay,
								tvlPrevWeek: prevWeek,
								tvlPrevMonth: prevMonth,
								change1d: chainTvl !== null && prevDay !== null ? getPercentChange(chainTvl, prevDay) : null,
								change7d: chainTvl !== null && prevWeek !== null ? getPercentChange(chainTvl, prevWeek) : null,
								change1m: chainTvl !== null && prevMonth !== null ? getPercentChange(chainTvl, prevMonth) : null,
								volume24h: volumeBreakdown?.total24h ?? null,
								fees24h: feesBreakdown?.total24h ?? null,
								revenue24h: revenueBreakdown?.revenue24h ?? null,
								perpsVolume24h: perpsBreakdown?.total24h ?? null,
								openInterest: openInterestBreakdown?.total24h ?? null,
								mcap: protocolData.mcap ?? null,
								protocolCount: 1
							}

							result.push({
								id: `protocol-${protocolSlug}-${normalizeId(chainName)}`,
							chain: chainName,
							metrics: chainMetrics,
							...baseRow
						})
					}
					processed.add(protocolSlug)
					return
				}

				if (chainFilterActive) {
					return
				}
			}

			result.push({
				id: `protocol-${protocolSlug}${shouldExplodeByChain ? '-aggregate' : ''}`,
				chain: shouldExplodeByChain ? 'All Chains' : null,
				metrics: baseMetrics,
				...baseRow
			})
			processed.add(protocolSlug)
		}

		for (const protocol of formattedProtocols) {
			const isParent = Boolean(protocol?.isParentProtocol && Array.isArray(protocol.subRows) && protocol.subRows.length)
			if (isParent) {
				const parentId = String(
					protocol.defillamaId ?? (protocol as any).slug ?? normalizeId(protocol.name ?? `parent-${result.length}`)
				)
				const parentName = protocol.name ?? parentNameLookup.get(parentId) ?? 'Parent'
				const parentLogo = protocol.logo ?? parentLogoLookup.get(parentId) ?? null
				for (const child of (protocol.subRows ?? []) as ExtendedProtocol[]) {
					const childKey = String(
						child.defillamaId ?? (child as any).slug ?? normalizeId(child.name ?? `${parentId}-${result.length}`)
					)
					if (processed.has(childKey)) continue
					emitProtocolRows(child, { parentId, parentName, parentLogo })
					processed.add(childKey)
				}
				continue
			}

			const protocolKey = String(
				protocol.defillamaId ?? (protocol as any).slug ?? normalizeId(protocol.name ?? `${result.length}`)
			)
			if (processed.has(protocolKey)) continue

			if (protocol.parentProtocol) {
				const parentId = String(protocol.parentProtocol)
				const parentName = parentNameLookup.get(parentId) ?? null
				const parentLogo = parentLogoLookup.get(parentId) ?? null
				emitProtocolRows(protocol, { parentId, parentName, parentLogo })
			} else {
				emitProtocolRows(protocol)
			}
		}

		return result
	}, [
		formattedProtocols,
		parentNameLookup,
		parentLogoLookup,
		shouldExplodeByChain,
		normalizedChainFilter
	])

	useEffect(() => {
		const datasetLoading = {
			isLoadingProtocolsList,
			isLoadingVolume,
			isLoadingFees,
			isLoadingPerps,
			isLoadingOpenInterest,
			isLoadingEarnings,
			isLoadingAggregators,
			isLoadingBridgeAggregators,
			isLoadingOptions
		}

		const counts = {
			fullProtocolsList: fullProtocolsList?.length ?? 0,
			formattedProtocols: formattedProtocols.length,
			rows: rows.length,
			rowsWithChain: rows.filter((row) => Boolean(row.chain && row.chain !== 'All Chains')).length
		}

		console.log('[UnifiedTable][ProtocolsStrategy] snapshot', {
			chains,
			shouldExplodeByChain,
			chainFilter: normalizedChainFilter ? Array.from(normalizedChainFilter.values()) : null,
			datasetLoading,
			counts
		})

			if (
				!Object.values(datasetLoading).some(Boolean) &&
				formattedProtocols.length > 0 &&
				rows.length === 0 &&
				shouldExplodeByChain
			) {
				const sample = formattedProtocols.find((protocol) => {
					const entries = Object.entries(protocol.chainTvls || {})
					return entries.some(([, values]) => typeof (values as any)?.tvl === 'number')
				})

				console.log('[UnifiedTable][ProtocolsStrategy] zero-row diagnostic', {
					sampleProtocol: sample ? { name: sample.name, chains: Object.keys(sample.chainTvls || {}) } : null,
					filteredChains: normalizedChainFilter ? Array.from(normalizedChainFilter.values()) : null,
					sampleSet: formattedProtocols.slice(0, 5).map((protocol) => ({
						name: protocol.name,
						chainKeys: Object.keys(protocol.chainTvls || {}),
						hasNumericChainTvl: Object.values(protocol.chainTvls || {}).some(
							(values: any) => typeof values?.tvl === 'number'
						)
					}))
				})
			}
	}, [
		chains,
		shouldExplodeByChain,
		normalizedChainFilter,
		formattedProtocols,
		rows,
		fullProtocolsList,
		isLoadingProtocolsList,
		isLoadingVolume,
		isLoadingFees,
		isLoadingPerps,
		isLoadingOpenInterest,
		isLoadingEarnings,
		isLoadingAggregators,
		isLoadingBridgeAggregators,
		isLoadingOptions
	])

	const isLoading =
		isLoadingProtocolsList ||
		isLoadingVolume ||
		isLoadingFees ||
		isLoadingPerps ||
		isLoadingOpenInterest ||
		isLoadingEarnings ||
		isLoadingAggregators ||
		isLoadingBridgeAggregators ||
		isLoadingOptions

	return {
		rows,
		isLoading
	}
}
