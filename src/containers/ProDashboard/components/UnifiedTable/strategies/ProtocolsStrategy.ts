import { useMemo } from 'react'
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
import { usePriorityChainDatasets, type PriorityMetric } from './hooks/usePriorityChainDatasets'

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
	displayName?: string | null
}

type ChainTvlEntry = {
	tvl?: number | null
	tvlPrevDay?: number | null
	tvlPrevWeek?: number | null
	tvlPrevMonth?: number | null
}

const getProtocolLookupKey = (protocol: ExtendedProtocol): string | null => {
	const candidates = [
		protocol.defillamaId,
		(protocol as any)?.id,
		(protocol as any)?.slug,
		protocol.name,
		protocol.displayName
	]

	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.trim().length) {
			return candidate.trim().toLowerCase()
		}
	}

	return null
}

const toUniqueStringArray = (input: unknown): string[] => {
	if (!Array.isArray(input)) return []
	const seen = new Set<string>()
	const result: string[] = []
	for (const value of input) {
		if (typeof value !== 'string') continue
		const trimmed = value.trim()
		if (!trimmed || seen.has(trimmed)) continue
		seen.add(trimmed)
		result.push(trimmed)
	}
	return result
}

const TVL_ADJUSTMENT_CATEGORIES = new Set(
	[
		'staking',
		'pool2',
		'borrowed',
		'vesting',
		'doublecounted',
		'liquidstaking',
		'dcAndLsOverlap',
		'govtokens',
		'excludeParent'
	].map((value) => value.toLowerCase())
)

const normalizeChainToken = (value: string) => value.trim().toLowerCase()

const isAdjustmentToken = (token: string) => TVL_ADJUSTMENT_CATEGORIES.has(normalizeChainToken(token))

const isActualChain = (key: string): boolean => {
	const normalized = normalizeChainToken(key)
	if (!normalized) return false
	if (isAdjustmentToken(normalized)) {
		return false
	}
	const parts = normalized.split('-')
	if (parts.length > 1) {
		const lastPart = parts[parts.length - 1]
		if (isAdjustmentToken(lastPart)) {
			return false
		}
	}
	return true
}

const getBaseChainInfo = (rawChain: string) => {
	const trimmed = rawChain.trim()
	if (!trimmed) {
		return { displayName: '', normalizedKey: '' }
	}

	const tokens = trimmed.split('-')
	let endIndex = tokens.length

	while (endIndex > 1 && isAdjustmentToken(tokens[endIndex - 1])) {
		endIndex -= 1
	}

	const baseTokens = tokens.slice(0, endIndex)
	const displayName = baseTokens.join('-') || trimmed
	return {
		displayName,
		normalizedKey: normalizeChainToken(displayName)
	}
}

const toMetrics = (protocol: ExtendedProtocol): NumericMetrics => ({
	tvl: protocol.tvl ?? null,
	tvlPrevDay: protocol.tvlPrevDay ?? null,
	tvlPrevWeek: protocol.tvlPrevWeek ?? null,
	tvlPrevMonth: protocol.tvlPrevMonth ?? null,
	change1d: protocol.change_1d ?? null,
	change7d: protocol.change_7d ?? null,
	change1m: protocol.change_1m ?? null,
	volume24h: protocol.volume_24h ?? null,
	volume_7d: protocol.volume_7d ?? null,
	volume_30d: protocol.volume_30d ?? null,
	cumulativeVolume: protocol.cumulativeVolume ?? null,
	volumeChange_1d: protocol.volumeChange_1d ?? null,
	volumeChange_7d: protocol.volumeChange_7d ?? null,
	volumeChange_1m: protocol.volumeChange_1m ?? null,
	volumeDominance_24h: protocol.volumeDominance_24h ?? null,
	volumeMarketShare7d: protocol.volumeMarketShare7d ?? null,
	fees24h: protocol.fees_24h ?? null,
	fees_7d: protocol.fees_7d ?? null,
	fees_30d: protocol.fees_30d ?? null,
	fees_1y: protocol.fees_1y ?? null,
	average_1y: protocol.average_1y ?? null,
	cumulativeFees: protocol.cumulativeFees ?? null,
	userFees_24h: protocol.userFees_24h ?? null,
	holderRevenue_24h: protocol.holderRevenue_24h ?? null,
	holdersRevenue30d: protocol.holdersRevenue30d ?? null,
	holdersRevenueChange_30dover30d: protocol.holdersRevenueChange_30dover30d ?? null,
	treasuryRevenue_24h: protocol.treasuryRevenue_24h ?? null,
	supplySideRevenue_24h: protocol.supplySideRevenue_24h ?? null,
	feesChange_1d: protocol.feesChange_1d ?? null,
	feesChange_7d: protocol.feesChange_7d ?? null,
	feesChange_1m: protocol.feesChange_1m ?? null,
	feesChange_7dover7d: protocol.feesChange_7dover7d ?? null,
	feesChange_30dover30d: protocol.feesChange_30dover30d ?? null,
	revenue24h: protocol.revenue_24h ?? null,
	revenue_7d: protocol.revenue_7d ?? null,
	revenue_30d: protocol.revenue_30d ?? null,
	revenue_1y: protocol.revenue_1y ?? null,
	average_revenue_1y: protocol.average_revenue_1y ?? null,
	revenueChange_1d: protocol.revenueChange_1d ?? null,
	revenueChange_7d: protocol.revenueChange_7d ?? null,
	revenueChange_1m: protocol.revenueChange_1m ?? null,
	revenueChange_7dover7d: protocol.revenueChange_7dover7d ?? null,
	revenueChange_30dover30d: protocol.revenueChange_30dover30d ?? null,
	perpsVolume24h: protocol.perps_volume_24h ?? null,
	perps_volume_7d: protocol.perps_volume_7d ?? null,
	perps_volume_30d: protocol.perps_volume_30d ?? null,
	perps_volume_change_1d: protocol.perps_volume_change_1d ?? null,
	perps_volume_change_7d: protocol.perps_volume_change_7d ?? null,
	perps_volume_change_1m: protocol.perps_volume_change_1m ?? null,
	perps_volume_dominance_24h: protocol.perps_volume_dominance_24h ?? null,
	openInterest: protocol.openInterest ?? null,
	earnings_24h: protocol.earnings_24h ?? null,
	earnings_7d: protocol.earnings_7d ?? null,
	earnings_30d: protocol.earnings_30d ?? null,
	earnings_1y: protocol.earnings_1y ?? null,
	earningsChange_1d: protocol.earningsChange_1d ?? null,
	earningsChange_7d: protocol.earningsChange_7d ?? null,
	earningsChange_1m: protocol.earningsChange_1m ?? null,
	aggregators_volume_24h: protocol.aggregators_volume_24h ?? null,
	aggregators_volume_7d: protocol.aggregators_volume_7d ?? null,
	aggregators_volume_30d: protocol.aggregators_volume_30d ?? null,
	aggregators_volume_change_1d: protocol.aggregators_volume_change_1d ?? null,
	aggregators_volume_change_7d: protocol.aggregators_volume_change_7d ?? null,
	aggregators_volume_dominance_24h: protocol.aggregators_volume_dominance_24h ?? null,
	aggregators_volume_marketShare7d: protocol.aggregators_volume_marketShare7d ?? null,
	bridge_aggregators_volume_24h: protocol.bridge_aggregators_volume_24h ?? null,
	bridge_aggregators_volume_7d: protocol.bridge_aggregators_volume_7d ?? null,
	bridge_aggregators_volume_30d: protocol.bridge_aggregators_volume_30d ?? null,
	bridge_aggregators_volume_change_1d: protocol.bridge_aggregators_volume_change_1d ?? null,
	bridge_aggregators_volume_change_7d: protocol.bridge_aggregators_volume_change_7d ?? null,
	bridge_aggregators_volume_dominance_24h: protocol.bridge_aggregators_volume_dominance_24h ?? null,
	options_volume_24h: protocol.options_volume_24h ?? null,
	options_volume_7d: protocol.options_volume_7d ?? null,
	options_volume_30d: protocol.options_volume_30d ?? null,
	options_volume_change_1d: protocol.options_volume_change_1d ?? null,
	options_volume_change_7d: protocol.options_volume_change_7d ?? null,
	options_volume_dominance_24h: protocol.options_volume_dominance_24h ?? null,
	mcap: protocol.mcap ?? null,
	mcaptvl: protocol.mcaptvl ?? null,
	pf: protocol.pf ?? null,
	ps: protocol.ps ?? null,
	protocolCount: (protocol as any)?.protocolCount ?? null
})

export function useProtocolsStrategy(
	params: ProtocolsStrategyParams | null | undefined,
	rowHeaders: UnifiedRowHeaderType[],
	priorityChainHints?: string[]
) {
	const chainsKey = params?.chains?.join('|') ?? 'all'
	const chains = useMemo(() => {
		if (!Array.isArray(params?.chains)) {
			return ['All']
		}
		const filtered = params.chains.filter((chain): chain is string => typeof chain === 'string' && chain.trim().length > 0)
		return filtered.length ? filtered : ['All']
	}, [chainsKey])
	const shouldExplodeByChain = rowHeaders.includes('chain')

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
	const { data: bridgeAggregatorsData, isLoading: isLoadingBridgeAggregators } =
		useGetProtocolsBridgeAggregatorsByMultiChain(chains)
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

	const priorityChains = useMemo(() => {
		if (!shouldExplodeByChain) {
			return []
		}
		const hints = priorityChainHints ?? []
		const seen = new Set<string>()
		const result: string[] = []
		for (const chain of hints) {
			if (typeof chain !== 'string') continue
			const trimmed = chain.trim()
			if (!trimmed) continue
			const normalized = trimmed.toLowerCase()
			if (seen.has(normalized)) continue
			seen.add(normalized)
			result.push(trimmed)
		}
		return result
	}, [priorityChainHints, shouldExplodeByChain])

	const normalizedChainFilter = useMemo(() => {
		if (!params?.chains?.length) return null
		const normalized = params.chains.map((chain) => chain.trim().toLowerCase()).filter((chain) => chain !== 'all')
		return normalized.length ? new Set(normalized) : null
	}, [params?.chains])

	const priorityVolume = usePriorityChainDatasets('volume', priorityChains, shouldExplodeByChain)
	const priorityFees = usePriorityChainDatasets('fees', priorityChains, shouldExplodeByChain)
	const priorityPerps = usePriorityChainDatasets('perps', priorityChains, shouldExplodeByChain)
	const priorityOpenInterest = usePriorityChainDatasets('open-interest', priorityChains, shouldExplodeByChain)

	const parentNameLookup = useMemo(() => {
		const map = new Map<string, string | null>()
		if (Array.isArray(parentProtocols)) {
			;(parentProtocols as IParentProtocol[]).forEach((parent) => {
				map.set(String(parent.id), parent.name ?? null)
			})
		}
		return map
	}, [parentProtocols])

	const parentLogoLookup = useMemo(() => {
		const map = new Map<string, string | null>()
		if (Array.isArray(parentProtocols)) {
			;(parentProtocols as IParentProtocol[]).forEach((parent) => {
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
		const normalizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
		const processed = new Set<string>()
		const result: NormalizedRow[] = []

		const shouldIncludeChain = (chainName: string) => {
			if (!chainFilterActive || !normalizedChainFilter) return true
			const { normalizedKey } = getBaseChainInfo(chainName)
			if (!normalizedKey) return false
			return normalizedChainFilter.has(normalizedKey)
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
			const parentId =
				parentInfo?.parentId ?? (protocolData.parentProtocol ? String(protocolData.parentProtocol) : null)
			const parentLogo = parentInfo?.parentLogo ?? (parentId ? (parentLogoLookup.get(parentId) ?? null) : null)
			const baseChains = toUniqueStringArray(protocolData.chains)
			const chainOracleValues = protocolData.oraclesByChain ? Object.values(protocolData.oraclesByChain).flat() : []
			const baseOracles = toUniqueStringArray([
				...(Array.isArray(protocolData.oracles) ? protocolData.oracles : []),
				...chainOracleValues
			])
			const lookupKey = getProtocolLookupKey(protocolData)
			const volumeFallback = lookupKey ? priorityVolume.breakdowns.get(lookupKey) : undefined
			const feesFallback = lookupKey ? priorityFees.breakdowns.get(lookupKey) : undefined
			const perpsFallback = lookupKey ? priorityPerps.breakdowns.get(lookupKey) : undefined
			const openInterestFallback = lookupKey ? priorityOpenInterest.breakdowns.get(lookupKey) : undefined
			const baseRow: Omit<NormalizedRow, 'id' | 'metrics' | 'chain'> = {
				name: protocolName,
				displayName: protocolName,
				protocolId: protocolSlug,
				logo: protocolData.logo ?? null,
				category,
				chains: baseChains,
				oracles: baseOracles,
				parentProtocolId: parentId,
				parentProtocolName: parentInfo?.parentName ?? parentNameLookup.get(parentId ?? '') ?? null,
				parentProtocolLogo: parentLogo,
				strategyType: 'protocols' as const,
				original: protocolData
			}

			if (shouldExplodeByChain) {
				const allChains = new Set<string>()

				const chainTvls = protocolData.chainTvls || {}
				Object.keys(chainTvls).forEach((chain) => {
					if (isActualChain(chain) && typeof (chainTvls[chain] as any)?.tvl === 'number') {
						allChains.add(chain)
					}
				})

				const collectChainsFrom = (breakdown?: Record<string, any>) => {
					if (!breakdown) return
					Object.keys(breakdown).forEach((chain) => {
						if (isActualChain(chain)) allChains.add(chain)
					})
				}

				collectChainsFrom(protocolData.volumeByChain)
				collectChainsFrom(protocolData.feesByChain)
				collectChainsFrom(protocolData.revenueByChain)
				collectChainsFrom(protocolData.perpsVolumeByChain)
				collectChainsFrom(protocolData.openInterestByChain)
				collectChainsFrom(protocolData.earningsByChain)
				collectChainsFrom(protocolData.aggregatorsVolumeByChain)
				collectChainsFrom(protocolData.bridgeAggregatorsVolumeByChain)
				collectChainsFrom(protocolData.optionsVolumeByChain)

				const collectChainsFromFallback = (fallback?: Record<string, any>) => {
					if (!fallback) return
					Object.entries(fallback).forEach(([key, entry]) => {
						const chainLabel =
							typeof (entry as any)?.chain === 'string' && (entry as any).chain.trim().length
								? (entry as any).chain
								: key
						if (chainLabel && isActualChain(chainLabel)) {
							allChains.add(chainLabel)
						}
					})
				}

				collectChainsFromFallback(volumeFallback)
				collectChainsFromFallback(feesFallback)
				collectChainsFromFallback(perpsFallback)
				collectChainsFromFallback(openInterestFallback)

				const chainsToProcess = Array.from(allChains).filter(shouldIncludeChain)

				if (chainsToProcess.length) {
					for (const chainName of chainsToProcess) {
						const { displayName: displayChainName, normalizedKey: normalizedChainKey } = getBaseChainInfo(chainName)
						if (!normalizedChainKey) {
							continue
						}

						// Prefer TVL entry if present; otherwise allow metrics-only rows (e.g., fees-only protocols like Tether)
						const tvlCollections = protocolData.chainTvls || {}
						const chainValues = (tvlCollections as any)[chainName] ??
							(tvlCollections as any)[normalizedChainKey] ??
							(tvlCollections as any)[normalizeChainToken(chainName)] as ChainTvlEntry | undefined
						const chainTvl = chainValues?.tvl ?? null
						const prevDay = chainValues?.tvlPrevDay ?? null
						const prevWeek = chainValues?.tvlPrevWeek ?? null
						const prevMonth = chainValues?.tvlPrevMonth ?? null
						const rawNormalizedKey = normalizeChainToken(chainName)
						const getBreakdown = (collection?: Record<string, any>) =>
							collection?.[normalizedChainKey] ?? collection?.[rawNormalizedKey]
						const volumeBreakdown = getBreakdown(protocolData.volumeByChain) ?? volumeFallback?.[normalizedChainKey]
						const feesBreakdown = getBreakdown(protocolData.feesByChain) ?? feesFallback?.[normalizedChainKey]
						const revenueBreakdown = getBreakdown(protocolData.revenueByChain) ?? feesFallback?.[normalizedChainKey]
						const perpsBreakdown = getBreakdown(protocolData.perpsVolumeByChain) ?? perpsFallback?.[normalizedChainKey]
						const openInterestBreakdown =
							getBreakdown(protocolData.openInterestByChain) ?? openInterestFallback?.[normalizedChainKey]
						const earningsBreakdown = protocolData.earningsByChain?.[normalizedChainKey]
						const aggregatorsBreakdown = protocolData.aggregatorsVolumeByChain?.[normalizedChainKey]
						const bridgeAggregatorsBreakdown = protocolData.bridgeAggregatorsVolumeByChain?.[normalizedChainKey]
						const optionsBreakdown = protocolData.optionsVolumeByChain?.[normalizedChainKey]
						const chainSpecificOraclesRaw =
							protocolData.oraclesByChain?.[chainName] ?? protocolData.oraclesByChain?.[normalizedChainKey]
						const chainSpecificOracles = Array.isArray(chainSpecificOraclesRaw)
							? toUniqueStringArray(chainSpecificOraclesRaw)
							: []
						const rowOracles = chainSpecificOracles.length ? chainSpecificOracles : baseOracles

						const chainMetrics: NumericMetrics = {
							tvl: chainTvl,
							tvlPrevDay: prevDay,
							tvlPrevWeek: prevWeek,
							tvlPrevMonth: prevMonth,
							change1d: chainTvl !== null && prevDay !== null ? getPercentChange(chainTvl, prevDay) : null,
							change7d: chainTvl !== null && prevWeek !== null ? getPercentChange(chainTvl, prevWeek) : null,
							change1m: chainTvl !== null && prevMonth !== null ? getPercentChange(chainTvl, prevMonth) : null,
							volume24h: volumeBreakdown?.total24h ?? null,
							volume_7d: volumeBreakdown?.total7d ?? null,
							volume_30d: volumeBreakdown?.total30d ?? null,
							cumulativeVolume: null,
							volumeChange_1d: volumeBreakdown?.change_1d ?? null,
							volumeChange_7d: volumeBreakdown?.change_7d ?? null,
							volumeChange_1m: volumeBreakdown?.change_1m ?? null,
							volumeDominance_24h: null,
							volumeMarketShare7d: null,
							fees24h: feesBreakdown?.total24h ?? null,
							fees_7d: feesBreakdown?.total7d ?? null,
							fees_30d: feesBreakdown?.total30d ?? null,
							fees_1y: feesBreakdown?.total1y ?? null,
							average_1y: null,
							cumulativeFees: null,
							userFees_24h: null,
							holderRevenue_24h: null,
							holdersRevenue30d: null,
							holdersRevenueChange_30dover30d: null,
							treasuryRevenue_24h: null,
							supplySideRevenue_24h: null,
							feesChange_1d: feesBreakdown?.feesChange_1d ?? null,
							feesChange_7d: feesBreakdown?.feesChange_7d ?? null,
							feesChange_1m: feesBreakdown?.feesChange_1m ?? null,
							feesChange_7dover7d: null,
							feesChange_30dover30d: null,
							revenue24h: revenueBreakdown?.revenue24h ?? null,
							revenue_7d: revenueBreakdown?.revenue7d ?? null,
							revenue_30d: revenueBreakdown?.revenue30d ?? null,
							revenue_1y: revenueBreakdown?.revenue1y ?? null,
							average_revenue_1y: null,
							revenueChange_1d: revenueBreakdown?.revenueChange_1d ?? null,
							revenueChange_7d: revenueBreakdown?.revenueChange_7d ?? null,
							revenueChange_1m: revenueBreakdown?.revenueChange_1m ?? null,
							revenueChange_7dover7d: null,
							revenueChange_30dover30d: null,
							perpsVolume24h: perpsBreakdown?.total24h ?? null,
							perps_volume_7d: perpsBreakdown?.total7d ?? null,
							perps_volume_30d: perpsBreakdown?.total30d ?? null,
							perps_volume_change_1d: perpsBreakdown?.change_1d ?? null,
							perps_volume_change_7d: perpsBreakdown?.change_7d ?? null,
							perps_volume_change_1m: perpsBreakdown?.change_1m ?? null,
							perps_volume_dominance_24h: null,
							openInterest: openInterestBreakdown?.total24h ?? null,
							earnings_24h: earningsBreakdown?.total24h ?? null,
							earnings_7d: earningsBreakdown?.total7d ?? null,
							earnings_30d: earningsBreakdown?.total30d ?? null,
							earnings_1y: earningsBreakdown?.total1y ?? null,
							earningsChange_1d: earningsBreakdown?.change_1d ?? null,
							earningsChange_7d: earningsBreakdown?.change_7d ?? null,
							earningsChange_1m: earningsBreakdown?.change_1m ?? null,
							aggregators_volume_24h: aggregatorsBreakdown?.total24h ?? null,
							aggregators_volume_7d: aggregatorsBreakdown?.total7d ?? null,
							aggregators_volume_30d: aggregatorsBreakdown?.total30d ?? null,
							aggregators_volume_change_1d: aggregatorsBreakdown?.change_1d ?? null,
							aggregators_volume_change_7d: aggregatorsBreakdown?.change_7d ?? null,
							aggregators_volume_dominance_24h: null,
							aggregators_volume_marketShare7d: null,
							bridge_aggregators_volume_24h: bridgeAggregatorsBreakdown?.total24h ?? null,
							bridge_aggregators_volume_7d: bridgeAggregatorsBreakdown?.total7d ?? null,
							bridge_aggregators_volume_30d: bridgeAggregatorsBreakdown?.total30d ?? null,
							bridge_aggregators_volume_change_1d: bridgeAggregatorsBreakdown?.change_1d ?? null,
							bridge_aggregators_volume_change_7d: bridgeAggregatorsBreakdown?.change_7d ?? null,
							bridge_aggregators_volume_dominance_24h: null,
							options_volume_24h: optionsBreakdown?.total24h ?? null,
							options_volume_7d: optionsBreakdown?.total7d ?? null,
							options_volume_30d: optionsBreakdown?.total30d ?? null,
							options_volume_change_1d: optionsBreakdown?.change_1d ?? null,
							options_volume_change_7d: optionsBreakdown?.change_7d ?? null,
							options_volume_dominance_24h: null,
							mcap: protocolData.mcap ?? null,
							mcaptvl: protocolData.mcaptvl ?? null,
							pf: protocolData.pf ?? null,
							ps: protocolData.ps ?? null,
							protocolCount: null
						}

						result.push({
							...baseRow,
							id: `protocol-${protocolSlug}-${normalizeId(chainName)}`,
							chain: displayChainName,
							chains: [displayChainName],
							oracles: rowOracles,
							metrics: chainMetrics
						})
					}
					processed.add(protocolSlug)
					return
				}

				if (chainFilterActive || shouldExplodeByChain) {
					return
				}
			}

			result.push({
				...baseRow,
				id: `protocol-${protocolSlug}`,
				chain: null,
				metrics: baseMetrics
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
		priorityFees.breakdowns,
		priorityOpenInterest.breakdowns,
		priorityPerps.breakdowns,
		priorityVolume.breakdowns,
		shouldExplodeByChain
	])

	const chainLoadingStates = useMemo(() => {
		if (!shouldExplodeByChain) {
			return new Map<string, Set<PriorityMetric>>()
		}

		const map = new Map<string, Set<PriorityMetric>>()
		const register = (metric: PriorityMetric, chainsSet: Set<string>) => {
			chainsSet.forEach((chain) => {
				const normalized = typeof chain === 'string' ? chain.trim().toLowerCase() : ''
				if (!normalized) return
				const existing = map.get(normalized) ?? new Set<PriorityMetric>()
				existing.add(metric)
				map.set(normalized, existing)
			})
		}

		register('volume', priorityVolume.loadingChains)
		register('fees', priorityFees.loadingChains)
		register('perps', priorityPerps.loadingChains)
		register('open-interest', priorityOpenInterest.loadingChains)

		return map
	}, [
		priorityFees.loadingChains,
		priorityOpenInterest.loadingChains,
		priorityPerps.loadingChains,
		priorityVolume.loadingChains,
		shouldExplodeByChain
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
		isLoading,
		chainLoadingStates
	}
}
