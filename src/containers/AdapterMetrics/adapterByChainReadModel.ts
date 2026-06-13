import { FEE_EXTRA_PERIOD_TOTAL_KEYS } from '~/metrics/feeExtras'
import { slug, getMarketCapToAnnualizedMetricRatio } from '~/utils'
import { chainIconUrl, tokenIconUrl } from '~/utils/icons'
import type { IAdapterChainMetrics } from './api.types'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES, ZERO_FEE_PERPS } from './constants'
import { mergeParentMetricPeriods } from './metricPeriods'
import type { IAdapterByChainPageData, IAdapterChainOverview, IProtocol } from './types'
import {
	matchRevenueToEarnings,
	processRevenueDataForMatching,
	type ActiveLiquidityData,
	type BribesData,
	type NormalizedVolumeData,
	type OpenInterestData
} from './utils'

type AdapterChainProtocolMetric = IAdapterChainMetrics['protocols'][number]
type AdapterByChainSourceProtocol = Pick<
	AdapterChainProtocolMetric,
	'name' | 'displayName' | 'slug' | 'protocolType' | 'chains'
> &
	Partial<
		Pick<
			AdapterChainProtocolMetric,
			| 'category'
			| 'methodology'
			| 'linkedProtocols'
			| 'doublecounted'
			| 'total24h'
			| 'total48hto24h'
			| 'total7d'
			| 'total14dto7d'
			| 'total30d'
			| 'total60dto30d'
			| 'total7DaysAgo'
			| 'total30DaysAgo'
			| 'total1y'
			| 'annualized1y'
			| 'totalAllTime'
			| 'change_1d'
			| 'change_7d'
			| 'change_1m'
			| 'change_7dover7d'
			| 'change_30dover30d'
		>
	>

type ProtocolMcapData = {
	protocols: Array<{ name: string; mcap: number | null }>
	parentProtocols: Array<{ name: string; mcap?: number | null }>
}

type AdapterByChainDataType = `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
type AdapterByChainRankBy = 'pfOrPs' | 'total24h'

type AdapterByChainReadModel = {
	protocols: IAdapterByChainPageData['protocols']
	categories: string[]
	openInterest: number
	activeLiquidity: number | null
}

function buildFeeExtraOnlyProtocolRow(protocol: AdapterChainProtocolMetric): AdapterByChainSourceProtocol {
	return {
		name: protocol.name,
		displayName: protocol.displayName,
		slug: protocol.slug,
		protocolType: protocol.protocolType,
		chains: protocol.chains,
		category: protocol.category,
		methodology: protocol.methodology,
		linkedProtocols: protocol.linkedProtocols,
		doublecounted: protocol.doublecounted,
		total24h: null,
		total48hto24h: null,
		total7d: null,
		total14dto7d: null,
		total30d: null,
		total60dto30d: null,
		total7DaysAgo: null,
		total30DaysAgo: null,
		total1y: null,
		annualized1y: null,
		totalAllTime: null,
		change_1d: null,
		change_7d: null,
		change_1m: null,
		change_7dover7d: null,
		change_30dover30d: null
	}
}

function getFeeExtraPeriodTotals(protocol: AdapterChainProtocolMetric): BribesData {
	return {
		total24h: protocol.total24h ?? null,
		total48hto24h: protocol.total48hto24h ?? null,
		total7d: protocol.total7d ?? null,
		total14dto7d: protocol.total14dto7d ?? null,
		total30d: protocol.total30d ?? null,
		total60dto30d: protocol.total60dto30d ?? null,
		total7DaysAgo: protocol.total7DaysAgo ?? null,
		total30DaysAgo: protocol.total30DaysAgo ?? null,
		total1y: protocol.total1y ?? null,
		annualized1y: protocol.annualized1y ?? null,
		totalAllTime: protocol.totalAllTime ?? null
	}
}

function addFeeExtraPeriodTotals(acc: BribesData, totals: BribesData) {
	for (const key of FEE_EXTRA_PERIOD_TOTAL_KEYS) {
		const value = totals[key]
		if (value == null) {
			if (acc[key] === undefined) {
				acc[key] = null
			}
			continue
		}
		acc[key] = (acc[key] ?? 0) + value
	}
}

function buildProtocolsMcap(protocolsData: ProtocolMcapData) {
	const protocolsMcap: Record<string, number | null> = {}
	for (const protocol of protocolsData.protocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	for (const protocol of protocolsData.parentProtocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	return protocolsMcap
}

function getProtocolMethodology({
	adapterType,
	dataType,
	protocol
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType?: AdapterByChainDataType
	protocol: AdapterByChainSourceProtocol
}) {
	if (adapterType !== 'fees') return null
	if (dataType === 'dailyRevenue') {
		return (
			protocol.methodology?.['Revenue'] ??
			protocol.methodology?.['BribesRevenue'] ??
			protocol.methodology?.['TokenTaxes']
		)
	}
	if (dataType === 'dailyHoldersRevenue') {
		return (
			protocol.methodology?.['HoldersRevenue'] ??
			protocol.methodology?.['BribesRevenue'] ??
			protocol.methodology?.['TokenTaxes']
		)
	}
	return (
		protocol.methodology?.['Fees'] ?? protocol.methodology?.['BribesRevenue'] ?? protocol.methodology?.['TokenTaxes']
	)
}

function buildProtocolSummary({
	protocol,
	adapterType,
	dataType,
	protocolMcap,
	bribesProtocols,
	tokenTaxesProtocols,
	openInterestProtocols,
	activeLiquidityProtocols,
	normalizedVolumeProtocols,
	cantonIncentivesWarning
}: {
	protocol: AdapterByChainSourceProtocol
	adapterType: `${ADAPTER_TYPES}`
	dataType?: AdapterByChainDataType
	protocolMcap: number | null | undefined
	bribesProtocols: Record<string, BribesData>
	tokenTaxesProtocols: Record<string, BribesData>
	openInterestProtocols: Record<string, OpenInterestData>
	activeLiquidityProtocols: Record<string, ActiveLiquidityData>
	normalizedVolumeProtocols: Record<string, NormalizedVolumeData>
	cantonIncentivesWarning: string | null
}): IProtocol {
	const warning = protocol.slug === 'canton' ? cantonIncentivesWarning : null
	const methodology = getProtocolMethodology({ adapterType, dataType, protocol })
	const pfOrPs =
		protocolMcap != null && protocol.annualized1y != null
			? getMarketCapToAnnualizedMetricRatio(protocolMcap, protocol.annualized1y)
			: null

	return {
		name: protocol.displayName,
		slug: protocol.slug,
		logo: protocol.protocolType === 'chain' ? chainIconUrl(protocol.slug) : tokenIconUrl(protocol.slug),
		chains: protocol.chains,
		category: protocol.category ?? null,
		total24h: protocol.total24h ?? null,
		total48hto24h: protocol.total48hto24h ?? null,
		total7d: protocol.total7d ?? null,
		total14dto7d: protocol.total14dto7d ?? null,
		total30d: protocol.total30d ?? null,
		total60dto30d: protocol.total60dto30d ?? null,
		total7DaysAgo: protocol.total7DaysAgo ?? null,
		total30DaysAgo: protocol.total30DaysAgo ?? null,
		total1y: protocol.total1y ?? null,
		annualized1y: protocol.annualized1y ?? null,
		totalAllTime: protocol.totalAllTime ?? null,
		change_1d: protocol.change_1d ?? null,
		change_7d: protocol.change_7d ?? null,
		change_1m: protocol.change_1m ?? null,
		change_7dover7d: protocol.change_7dover7d ?? null,
		change_30dover30d: protocol.change_30dover30d ?? null,
		mcap: protocolMcap ?? null,
		...(bribesProtocols[protocol.name] ? { bribes: bribesProtocols[protocol.name] } : {}),
		...(tokenTaxesProtocols[protocol.name] ? { tokenTax: tokenTaxesProtocols[protocol.name] } : {}),
		...(pfOrPs != null ? { pfOrPs } : {}),
		...(methodology ? { methodology: methodology.endsWith('.') ? methodology.slice(0, -1) : methodology } : {}),
		...(protocol.doublecounted ? { doublecounted: protocol.doublecounted } : {}),
		...(ZERO_FEE_PERPS.has(protocol.displayName) ? { zeroFeePerp: true } : {}),
		...(warning ? { warning } : {}),
		...(openInterestProtocols[protocol.name]?.total24h != null
			? { openInterest: openInterestProtocols[protocol.name].total24h }
			: {}),
		...(activeLiquidityProtocols[protocol.name]?.total24h != null
			? { activeLiquidity: activeLiquidityProtocols[protocol.name].total24h }
			: {}),
		...(normalizedVolumeProtocols[protocol.name]?.total24h != null
			? { normalizedVolume24h: normalizedVolumeProtocols[protocol.name].total24h }
			: {}),
		...(protocol.displayName !== protocol.name ? { breakdownAliases: [protocol.name] } : {})
	}
}

function buildSingleChildParentSummary(protocol: string, childProtocol: IProtocol): IProtocol {
	const breakdownAliases = new Set([childProtocol.name, ...(childProtocol.breakdownAliases ?? [])])
	breakdownAliases.delete(protocol)
	return {
		...childProtocol,
		name: protocol,
		slug: slug(protocol),
		breakdownAliases: Array.from(breakdownAliases)
	}
}

function buildParentProtocolSummary({
	protocol,
	childProtocols,
	protocolsMcap
}: {
	protocol: string
	childProtocols: IProtocol[]
	protocolsMcap: Record<string, number | null>
}): IProtocol {
	const periodTotals = mergeParentMetricPeriods(childProtocols)
	const totals = {
		total24h: periodTotals.total24h ?? null,
		total7d: periodTotals.total7d ?? null,
		total30d: periodTotals.total30d ?? null,
		total1y: periodTotals.total1y ?? null,
		annualized1y: periodTotals.annualized1y ?? null,
		totalAllTime: periodTotals.totalAllTime ?? null
	}
	let doublecounted = false
	let zeroFeePerp = false
	let warning: string | null = null
	let bribes: BribesData | null = null
	let tokenTax: BribesData | null = null
	let openInterest: number | null = null
	let activeLiquidity: number | null = null
	let normalizedVolume24h: number | null = null
	const methodologySet = new Set<string>()
	const methodologyChildrenByMethod = new Map<string, string[]>()
	let topProtocol = childProtocols[0]
	const breakdownAliasSet = new Set<string>()
	const chainSet = new Set<string>()

	for (const childProtocol of childProtocols) {
		if (childProtocol.doublecounted) doublecounted = true
		if (childProtocol.zeroFeePerp) zeroFeePerp = true
		if (!warning && childProtocol.warning) warning = childProtocol.warning
		if (childProtocol.bribes) {
			bribes ??= {}
			addFeeExtraPeriodTotals(bribes, childProtocol.bribes)
		}
		if (childProtocol.tokenTax) {
			tokenTax ??= {}
			addFeeExtraPeriodTotals(tokenTax, childProtocol.tokenTax)
		}
		if (childProtocol.openInterest != null) {
			openInterest = (openInterest ?? 0) + childProtocol.openInterest
		}
		if (childProtocol.activeLiquidity != null) {
			activeLiquidity = (activeLiquidity ?? 0) + childProtocol.activeLiquidity
		}
		if (childProtocol.normalizedVolume24h != null) {
			normalizedVolume24h = (normalizedVolume24h ?? 0) + childProtocol.normalizedVolume24h
		}
		if (childProtocol.methodology) {
			methodologySet.add(childProtocol.methodology)
			let children = methodologyChildrenByMethod.get(childProtocol.methodology)
			if (!children) {
				children = []
				methodologyChildrenByMethod.set(childProtocol.methodology, children)
			}
			children.push(
				childProtocol.name.startsWith(protocol) ? childProtocol.name.replace(protocol, '').trim() : childProtocol.name
			)
		}
		if ((childProtocol.total24h ?? 0) > (topProtocol.total24h ?? 0)) {
			topProtocol = childProtocol
		}
		if (childProtocol.name !== protocol) breakdownAliasSet.add(childProtocol.name)
		for (const alias of childProtocol.breakdownAliases ?? []) {
			if (alias !== protocol) breakdownAliasSet.add(alias)
		}
		for (const childChain of childProtocol.chains ?? []) {
			chainSet.add(childChain)
		}
	}

	const methodology = Array.from(methodologySet)
	let methodologyText: string | null = null
	if (methodology.length === 1) {
		methodologyText = methodology[0]
	} else if (methodology.length > 1) {
		const methodologyParts: string[] = []
		for (const method of methodology) {
			methodologyParts.push(`${(methodologyChildrenByMethod.get(method) ?? []).join(', ')}: ${method}`)
		}
		methodologyText = methodologyParts.join('. ')
	}

	const protocolMcap = protocolsMcap[protocol]
	const pfOrPs =
		protocolMcap != null && totals.annualized1y != null
			? getMarketCapToAnnualizedMetricRatio(protocolMcap, totals.annualized1y)
			: null

	return {
		name: protocol,
		slug: slug(protocol),
		logo: tokenIconUrl(protocol),
		category: topProtocol.category ?? null,
		chains: Array.from(chainSet),
		...periodTotals,
		...totals,
		mcap: protocolsMcap[protocol] ?? null,
		breakdownAliases: Array.from(breakdownAliasSet),
		childProtocols,
		...(bribes ? { bribes } : {}),
		...(tokenTax ? { tokenTax } : {}),
		...(pfOrPs != null ? { pfOrPs } : {}),
		...(methodologyText ? { methodology: methodologyText } : {}),
		...(doublecounted ? { doublecounted } : {}),
		...(zeroFeePerp ? { zeroFeePerp } : {}),
		...(warning ? { warning } : {}),
		...(openInterest != null ? { openInterest } : {}),
		...(activeLiquidity != null ? { activeLiquidity } : {}),
		...(normalizedVolume24h != null ? { normalizedVolume24h } : {})
	}
}

function sortFinalProtocols({
	protocols,
	rankBy
}: {
	protocols: Record<string, IProtocol>
	rankBy: AdapterByChainRankBy
}): IAdapterByChainPageData['protocols'] {
	const finalProtocols: IAdapterByChainPageData['protocols'] = []
	if (rankBy === 'pfOrPs') {
		for (const protocol in protocols) {
			if (protocols[protocol].pfOrPs != null) {
				finalProtocols.push(protocols[protocol])
			}
		}
		finalProtocols.sort((a, b) => (b.pfOrPs ?? 0) - (a.pfOrPs ?? 0))
	} else {
		for (const protocol in protocols) {
			finalProtocols.push(protocols[protocol])
		}
		finalProtocols.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))
	}

	return finalProtocols
}

function sumSupplementalTotal<T extends { total24h: number | null; doublecounted: boolean }>(
	protocols: Record<string, T>
) {
	let total = 0
	for (const protocol in protocols) {
		if (protocols[protocol]?.doublecounted) continue
		total += protocols[protocol]?.total24h ?? 0
	}
	return total
}

export function buildAdapterByChainReadModel({
	data,
	protocolsData,
	bribesData,
	tokenTaxesData,
	openInterestData,
	activeLiquidityData,
	normalizedVolumeData,
	adapterType,
	dataType,
	rankBy,
	cantonIncentivesWarning
}: {
	data: IAdapterChainOverview
	protocolsData: ProtocolMcapData
	bribesData: IAdapterChainMetrics | null
	tokenTaxesData: IAdapterChainMetrics | null
	openInterestData: IAdapterChainOverview | null
	activeLiquidityData: IAdapterChainOverview | null
	normalizedVolumeData: IAdapterChainMetrics | null
	adapterType: `${ADAPTER_TYPES}`
	dataType?: AdapterByChainDataType
	rankBy: AdapterByChainRankBy
	cantonIncentivesWarning: string | null
}): AdapterByChainReadModel {
	const protocolsMcap = buildProtocolsMcap(protocolsData)
	const allProtocols: AdapterByChainSourceProtocol[] = [...data.protocols]
	const allProtocolsByName = new Set<string>()
	for (const protocol of allProtocols) {
		allProtocolsByName.add(protocol.name)
	}

	let bribesProtocols: Record<string, BribesData> = {}
	let tokenTaxesProtocols: Record<string, BribesData> = {}
	const openInterestProtocols: Record<string, OpenInterestData> = {}
	const activeLiquidityProtocols: Record<string, ActiveLiquidityData> = {}
	const normalizedVolumeProtocols: Record<string, NormalizedVolumeData> = {}

	if (dataType === 'dailyEarnings') {
		if (bribesData) {
			const processedBribesData = processRevenueDataForMatching(bribesData.protocols)
			bribesProtocols = matchRevenueToEarnings(processedBribesData, data.protocols)
		}

		if (tokenTaxesData) {
			const processedTokenTaxData = processRevenueDataForMatching(tokenTaxesData.protocols)
			tokenTaxesProtocols = matchRevenueToEarnings(processedTokenTaxData, data.protocols)
		}
	} else {
		if (bribesData) {
			for (const protocol of bribesData.protocols) {
				bribesProtocols[protocol.name] = getFeeExtraPeriodTotals(protocol)

				if (!allProtocolsByName.has(protocol.name)) {
					allProtocolsByName.add(protocol.name)
					allProtocols.push(buildFeeExtraOnlyProtocolRow(protocol))
				}
			}
		}

		if (tokenTaxesData) {
			for (const protocol of tokenTaxesData.protocols) {
				tokenTaxesProtocols[protocol.name] = getFeeExtraPeriodTotals(protocol)

				if (!allProtocolsByName.has(protocol.name)) {
					allProtocolsByName.add(protocol.name)
					allProtocols.push(buildFeeExtraOnlyProtocolRow(protocol))
				}
			}
		}
	}

	if (openInterestData) {
		for (const protocol of openInterestData.protocols) {
			openInterestProtocols[protocol.name] = {
				total24h: protocol.total24h ?? null,
				doublecounted: !!protocol.doublecounted
			}
		}
	}

	if (activeLiquidityData) {
		for (const protocol of activeLiquidityData.protocols) {
			activeLiquidityProtocols[protocol.name] = {
				total24h: protocol.total24h ?? null,
				doublecounted: !!protocol.doublecounted
			}
		}
	}

	if (normalizedVolumeData) {
		for (const protocol of normalizedVolumeData.protocols) {
			normalizedVolumeProtocols[protocol.name] = {
				total24h: protocol.total24h ?? null
			}
		}
	}

	const protocols: Record<string, IProtocol> = {}
	const parentProtocols: Record<string, IProtocol[]> = {}
	const categories = new Set<string>()

	for (const protocol of allProtocols) {
		const summary = buildProtocolSummary({
			protocol,
			adapterType,
			dataType,
			protocolMcap: protocolsMcap[protocol.name],
			bribesProtocols,
			tokenTaxesProtocols,
			openInterestProtocols,
			activeLiquidityProtocols,
			normalizedVolumeProtocols,
			cantonIncentivesWarning
		})

		if (protocol.linkedProtocols?.length > 1) {
			parentProtocols[protocol.linkedProtocols[0]] = parentProtocols[protocol.linkedProtocols[0]] || []
			parentProtocols[protocol.linkedProtocols[0]].push(summary)
		} else {
			protocols[protocol.displayName] = summary
		}
		if (protocol.category) {
			categories.add(protocol.category)
		}
	}

	for (const protocol in parentProtocols) {
		if (parentProtocols[protocol].length === 1) {
			protocols[protocol] = buildSingleChildParentSummary(protocol, parentProtocols[protocol][0])
			continue
		}
		protocols[protocol] = buildParentProtocolSummary({
			protocol,
			childProtocols: parentProtocols[protocol],
			protocolsMcap
		})
	}

	return {
		protocols: sortFinalProtocols({ protocols, rankBy }),
		categories: adapterType === 'fees' ? Array.from(categories).sort() : [],
		openInterest: sumSupplementalTotal(openInterestProtocols),
		activeLiquidity: activeLiquidityData ? sumSupplementalTotal(activeLiquidityProtocols) : null
	}
}
