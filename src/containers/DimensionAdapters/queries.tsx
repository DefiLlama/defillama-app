import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { getDimensionAdapterChainEarningsOverview } from '~/containers/Incentives/queries'
import { PROTOCOLS_API, REV_PROTOCOLS, V2_SERVER_URL, ZERO_FEE_PERPS } from '~/constants'
import { chainIconUrl, slug, tokenIconUrl, getAnnualizedRatio } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import type { IChainMetadata } from '~/utils/metadata/types'
import {
	fetchAdapterChainChartData,
	fetchAdapterChainMetrics,
	fetchAdapterProtocolChartData,
	fetchAdapterProtocolMetrics
} from './api'
import type { IAdapterProtocolMetrics, IAdapterChainMetrics } from './api.types'
import {
	ADAPTER_DATA_TYPE_KEYS,
	ADAPTER_DATA_TYPES,
	ADAPTER_TYPES,
	ADAPTER_TYPES_TO_METADATA_TYPE,
	isAdapterDataTypeKey
} from './constants'
import type {
	IAdapterByChainPageData,
	IAdapterChainOverview,
	IChainsByAdapterPageData,
	IChainsByREVPageData,
	IProtocol
} from './types'

// Type aliases for aggregated protocol data structures
type BribesData = {
	total24h: number | null
	total7d: number | null
	total30d: number | null
	total1y: number | null
	totalAllTime: number | null
}
type OpenInterestData = { total24h: number | null; doublecounted: boolean }
type ActiveLiquidityData = { total24h: number | null; doublecounted: boolean }
type NormalizedVolumeData = { total24h: number | null }

export async function getAdapterChainOverview({
	adapterType,
	chain,
	excludeTotalDataChart,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	excludeTotalDataChart: boolean
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
}) {
	if (dataType !== 'dailyEarnings') {
		const [overviewData, totalDataChart] = await Promise.all([
			fetchAdapterChainMetrics({ adapterType, chain, dataType }),
			excludeTotalDataChart ? Promise.resolve([]) : fetchAdapterChainChartData({ adapterType, chain, dataType })
		])

		return { ...overviewData, totalDataChart } as IAdapterChainOverview
	} else {
		const [overviewData, totalDataChart] = await Promise.all([
			fetchAdapterChainMetrics({ adapterType, chain: 'All', dataType: 'dailyRevenue' }),
			excludeTotalDataChart
				? Promise.resolve([])
				: fetchAdapterChainChartData({ adapterType, chain, dataType: 'dailyRevenue' })
		])

		return (await getDimensionAdapterChainEarningsOverview({
			chain,
			overviewData,
			totalDataChart
		})) as IAdapterChainOverview
	}
}

export async function getAdapterProtocolOverview({
	adapterType,
	protocol,
	excludeTotalDataChart,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	excludeTotalDataChart: boolean
	dataType?: `${ADAPTER_DATA_TYPES}`
}) {
	if (protocol == 'All') throw new Error('Protocol cannot be All')

	const [overviewData, totalDataChart] = await Promise.all([
		fetchAdapterProtocolMetrics({ adapterType, protocol, dataType }),
		excludeTotalDataChart ? Promise.resolve([]) : fetchAdapterProtocolChartData({ adapterType, protocol, dataType })
	])

	return { ...overviewData, totalDataChart } as IAdapterProtocolMetrics & { totalDataChart: Array<[number, number]> }
}

type AggregatedProtocol = Omit<
	IAdapterChainMetrics['protocols'][0],
	'total24h' | 'total7d' | 'total30d' | 'total1y' | 'totalAllTime'
> & {
	total24h: number
	total7d: number
	total30d: number
	total1y: number
	totalAllTime: number
}

function aggregateProtocolVersions(protocolVersions: IAdapterChainMetrics['protocols']): AggregatedProtocol {
	const aggregatedRevenue = {
		total24h: protocolVersions.reduce((sum, p) => sum + (p.total24h ?? 0), 0),
		total7d: protocolVersions.reduce((sum, p) => sum + (p.total7d ?? 0), 0),
		total30d: protocolVersions.reduce((sum, p) => sum + (p.total30d ?? 0), 0),
		total1y: protocolVersions.reduce((sum, p) => sum + (p.total1y ?? 0), 0),
		totalAllTime: protocolVersions.reduce((sum, p) => sum + (p.totalAllTime ?? 0), 0)
	}

	const breakdowns24h: Record<string, Record<string, number>>[] = []
	const breakdowns30d: Record<string, Record<string, number>>[] = []
	for (const p of protocolVersions) {
		if (p.breakdown24h) breakdowns24h.push(p.breakdown24h)
		if (p.breakdown30d) breakdowns30d.push(p.breakdown30d)
	}
	const mergedBreakdown24h = mergeBreakdowns(breakdowns24h)
	const mergedBreakdown30d = mergeBreakdowns(breakdowns30d)

	const parentProtocol = protocolVersions[0]
	return {
		...parentProtocol,
		name: parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.name,
		displayName: parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.displayName,
		slug: slug(parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.name),
		...aggregatedRevenue,
		chains: [...new Set(protocolVersions.flatMap((p) => p.chains))],
		breakdown24h: mergedBreakdown24h,
		breakdown30d: mergedBreakdown30d
	}
}

function mergeBreakdowns(breakdowns: Record<string, Record<string, number>>[]) {
	const merged: Record<string, Record<string, number>> = {}
	for (const breakdown of breakdowns) {
		if (!breakdown) continue
		for (const chainName in breakdown) {
			const protocolData = breakdown[chainName]
			if (!merged[chainName]) {
				merged[chainName] = {}
			}
			for (const protocolName in protocolData) {
				const value = protocolData[protocolName]
				merged[chainName][protocolName] = (merged[chainName][protocolName] || 0) + value
			}
		}
	}
	return merged
}

function groupProtocolsByParent<T extends { parentProtocol?: string; defillamaId: string }>(
	protocols: T[]
): Map<string, T[]> {
	const protocolGroups = new Map<string, T[]>()

	for (const protocol of protocols) {
		const parentKey = protocol.parentProtocol || protocol.defillamaId
		if (!protocolGroups.has(parentKey)) {
			protocolGroups.set(parentKey, [])
		}
		protocolGroups.get(parentKey)!.push(protocol)
	}

	return protocolGroups
}

function processGroupedProtocols<T, R>(
	protocolGroups: Map<string, T[]>,
	processor: (protocolVersions: T[], parentKey: string) => R
): R[] {
	const processedData: R[] = []
	for (const [parentKey, protocolVersions] of protocolGroups) {
		processedData.push(processor(protocolVersions, parentKey))
	}
	return processedData
}

function processRevenueDataForMatching(protocols: IAdapterChainMetrics['protocols']) {
	const protocolGroups = groupProtocolsByParent(protocols)

	return processGroupedProtocols(protocolGroups, (protocolVersions, parentKey) => {
		if (protocolVersions.length === 1) {
			return {
				...protocolVersions[0],
				parentKey,
				groupedName:
					protocolVersions[0].linkedProtocols?.[0] || protocolVersions[0].parentProtocol || protocolVersions[0].name
			}
		} else {
			const aggregatedProtocol = aggregateProtocolVersions(protocolVersions)
			return {
				...aggregatedProtocol,
				parentKey,
				groupedName:
					aggregatedProtocol.linkedProtocols?.[0] || aggregatedProtocol.parentProtocol || aggregatedProtocol.name
			}
		}
	})
}

function matchRevenueToEarnings(
	revenueData: Array<{
		parentKey: string
		name: string
		displayName: string
		defillamaId: string
		groupedName: string
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		totalAllTime: number | null
	}>,
	earningsProtocols: Array<{
		parentProtocol: string
		defillamaId: string
		name: string
		displayName: string
	}>
) {
	const matchedData: Record<string, BribesData> = {}

	for (const revenueProtocol of revenueData) {
		const matchingEarningsProtocol = earningsProtocols.find((earningsProto) => {
			const earningsParentKey = earningsProto.parentProtocol || earningsProto.defillamaId

			return (
				earningsParentKey === revenueProtocol.parentKey ||
				earningsProto.name === revenueProtocol.name ||
				earningsProto.displayName === revenueProtocol.displayName ||
				earningsProto.defillamaId === revenueProtocol.defillamaId ||
				earningsProto.name === revenueProtocol.groupedName ||
				earningsProto.displayName === revenueProtocol.groupedName
			)
		})

		if (matchingEarningsProtocol) {
			matchedData[matchingEarningsProtocol.name] = {
				total24h: revenueProtocol.total24h ?? null,
				total7d: revenueProtocol.total7d ?? null,
				total30d: revenueProtocol.total30d ?? null,
				total1y: revenueProtocol.total1y ?? null,
				totalAllTime: revenueProtocol.totalAllTime ?? null
			}
		}
	}

	return matchedData
}

function buildAdapterByChainChartDataset({
	adapterType,
	metricName,
	primaryChartData,
	openInterestChartData,
	activeLiquidityChartData
}: {
	adapterType: `${ADAPTER_TYPES}`
	metricName: string
	primaryChartData: Array<[number, number]>
	openInterestChartData: Array<[number, number]>
	activeLiquidityChartData: Array<[number, number]>
}) {
	const toChartPointMap = (points: Array<[number, number]>) => {
		const map = new Map<number, number>()

		for (const [timestamp, value] of points) {
			if (!Number.isFinite(timestamp) || !Number.isFinite(value)) continue
			map.set(timestamp * 1e3, value)
		}

		return map
	}

	const primaryDataMap = toChartPointMap(primaryChartData)
	const secondaryDimensionLabel =
		adapterType === 'derivatives' ? 'Open Interest' : adapterType === 'normalized-volume' ? 'Active Liquidity' : null
	const primaryDimensionLabel = metricName

	const secondarySourceData =
		adapterType === 'derivatives'
			? openInterestChartData
			: adapterType === 'normalized-volume'
				? activeLiquidityChartData
				: []

	const secondaryDataMap = toChartPointMap(secondarySourceData)

	const allTimestamps = new Set<number>([...primaryDataMap.keys(), ...secondaryDataMap.keys()])
	const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

	const hasSecondarySeries = secondaryDataMap.size > 0

	const source = sortedTimestamps.map((timestamp) => {
		if (hasSecondarySeries) {
			return {
				timestamp,
				[primaryDimensionLabel]: primaryDataMap.get(timestamp) ?? null,
				[secondaryDimensionLabel as string]: secondaryDataMap.get(timestamp) ?? null
			}
		}

		return {
			timestamp,
			[primaryDimensionLabel]: primaryDataMap.get(timestamp) ?? null
		}
	})

	return {
		source,
		dimensions: hasSecondarySeries
			? ['timestamp', primaryDimensionLabel, secondaryDimensionLabel as string]
			: ['timestamp', primaryDimensionLabel]
	}
}

export const getAdapterByChainPageData = async ({
	adapterType,
	chain,
	dataType,
	route,
	hasOpenInterest,
	metricName
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
	route: string
	hasOpenInterest?: boolean
	metricName: string
}): Promise<IAdapterByChainPageData | null> => {
	const [
		data,
		protocolsData,
		bribesData,
		tokenTaxesData,
		openInterestData,
		activeLiquidityData,
		normalizedVolumeData
	]: [
		IAdapterChainOverview,
		{
			protocols: Array<{ name: string; mcap: number | null }>
			parentProtocols: Array<{ name: string; mcap: number | null }>
		},
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainOverview | null,
		IAdapterChainOverview | null,
		IAdapterChainMetrics | null
	] = await Promise.all([
		getAdapterChainOverview({
			adapterType,
			chain,
			dataType,
			excludeTotalDataChart: adapterType === 'fees'
		}),
		fetchJson(PROTOCOLS_API),
		adapterType === 'fees'
			? fetchAdapterChainMetrics({
					adapterType,
					chain,
					dataType: 'dailyBribesRevenue'
				})
			: Promise.resolve(null),
		adapterType === 'fees'
			? fetchAdapterChainMetrics({
					adapterType,
					chain,
					dataType: 'dailyTokenTaxes'
				})
			: Promise.resolve(null),
		hasOpenInterest
			? getAdapterChainOverview({
					adapterType: 'open-interest',
					chain,
					dataType: 'openInterestAtEnd',
					excludeTotalDataChart: false
				})
			: Promise.resolve(null),
		adapterType === 'normalized-volume'
			? getAdapterChainOverview({
					adapterType: 'normalized-volume',
					chain,
					dataType: 'dailyActiveLiquidity',
					excludeTotalDataChart: false
				})
			: Promise.resolve(null),
		adapterType === 'derivatives'
			? fetchAdapterChainMetrics({
					adapterType: 'normalized-volume',
					chain
				})
			: Promise.resolve(null)
	])

	const protocolsMcap: Record<string, number | null> = {}
	for (const protocol of protocolsData.protocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	for (const protocol of protocolsData.parentProtocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}

	const allProtocols: IAdapterChainOverview['protocols'] = [...data.protocols]

	// Build protocol lookup Set for O(1) membership testing instead of O(n) .find()
	const allProtocolsByName = new Set<string>()
	for (const protocol of allProtocols) {
		allProtocolsByName.add(protocol.name)
	}

	let bribesProtocols: Record<string, BribesData> = {}
	let tokenTaxesProtocols: Record<string, BribesData> = {}
	let openInterestProtocols: Record<string, OpenInterestData> = {}
	let activeLiquidityProtocols: Record<string, ActiveLiquidityData> = {}
	let normalizedVolumeProtocols: Record<string, NormalizedVolumeData> = {}

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
		bribesProtocols =
			bribesData?.protocols.reduce(
				(
					acc: Record<
						string,
						{
							total24h: number | null
							total7d: number | null
							total30d: number | null
							total1y: number | null
							totalAllTime: number | null
						}
					>,
					p: {
						name: string
						total24h: number | null
						total7d: number | null
						total30d: number | null
						total1y: number | null
						totalAllTime: number | null
					}
				) => {
					acc[p.name] = {
						total24h: p.total24h ?? null,
						total7d: p.total7d ?? null,
						total30d: p.total30d ?? null,
						total1y: p.total1y ?? null,
						totalAllTime: p.totalAllTime ?? null
					}

					// O(1) Map lookup instead of O(n) .find()
					if (!allProtocolsByName.has(p.name)) {
						allProtocolsByName.add(p.name)
						allProtocols.push({
							...p,
							total24h: null,
							total7d: null,
							total30d: null,
							total1y: null,
							totalAllTime: null
						} as unknown as IAdapterChainOverview['protocols'][0])
					}

					return acc
				},
				{}
			) ?? {}

		tokenTaxesProtocols =
			tokenTaxesData?.protocols.reduce(
				(
					acc: Record<
						string,
						{
							total24h: number | null
							total7d: number | null
							total30d: number | null
							total1y: number | null
							totalAllTime: number | null
						}
					>,
					p: {
						name: string
						total24h: number | null
						total7d: number | null
						total30d: number | null
						total1y: number | null
						totalAllTime: number | null
					}
				) => {
					acc[p.name] = {
						total24h: p.total24h ?? null,
						total7d: p.total7d ?? null,
						total30d: p.total30d ?? null,
						total1y: p.total1y ?? null,
						totalAllTime: p.totalAllTime ?? null
					}

					// O(1) Map lookup instead of O(n) .find()
					if (!allProtocolsByName.has(p.name)) {
						allProtocolsByName.add(p.name)
						allProtocols.push({
							...p,
							total24h: null,
							total7d: null,
							total30d: null,
							total1y: null,
							totalAllTime: null
						} as unknown as IAdapterChainOverview['protocols'][0])
					}

					return acc
				},
				{}
			) ?? {}
	}

	if (openInterestData) {
		openInterestProtocols = openInterestData.protocols.reduce(
			(
				acc: Record<string, { total24h: number | null; doublecounted: boolean }>,
				p: { name: string; total24h: number | null; doublecounted?: boolean }
			) => {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					doublecounted: !!p.doublecounted
				}
				return acc
			},
			{}
		)
	}

	if (activeLiquidityData) {
		activeLiquidityProtocols = activeLiquidityData.protocols.reduce(
			(
				acc: Record<string, { total24h: number | null; doublecounted: boolean }>,
				p: { name: string; total24h: number | null; doublecounted?: boolean }
			) => {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					doublecounted: !!p.doublecounted
				}
				return acc
			},
			{}
		)
	}

	if (normalizedVolumeData) {
		normalizedVolumeProtocols = normalizedVolumeData.protocols.reduce(
			(acc: Record<string, { total24h: number | null }>, p: { name: string; total24h: number | null }) => {
				if (p.name === 'Extended') return acc
				acc[p.name] = {
					total24h: p.total24h ?? null
				}
				return acc
			},
			{}
		)
	}

	const protocols: Record<string, IProtocol> = {}
	const parentProtocols: Record<string, IProtocol[]> = {}
	const categories = new Set<string>()

	for (const protocol of allProtocols) {
		const methodology =
			adapterType === 'fees'
				? dataType === 'dailyRevenue'
					? (protocol.methodology?.['Revenue'] ??
						protocol.methodology?.['BribesRevenue'] ??
						protocol.methodology?.['TokenTaxes'])
					: dataType === 'dailyHoldersRevenue'
						? (protocol.methodology?.['HoldersRevenue'] ??
							protocol.methodology?.['BribesRevenue'] ??
							protocol.methodology?.['TokenTaxes'])
						: (protocol.methodology?.['Fees'] ??
							protocol.methodology?.['BribesRevenue'] ??
							protocol.methodology?.['TokenTaxes'])
				: null

		// Calculate P/F or P/S ratio (same calculation, context depends on dataType)
		const pfOrPs =
			protocolsMcap[protocol.name] && protocol.total30d
				? getAnnualizedRatio(protocolsMcap[protocol.name], protocol.total30d)
				: null

		const summary = {
			name: protocol.displayName,
			slug: protocol.slug,
			logo: protocol.protocolType === 'chain' ? chainIconUrl(protocol.slug) : tokenIconUrl(protocol.slug),
			chains: protocol.chains,
			category: protocol.category ?? null,
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			total1y: protocol.total1y ?? null,
			totalAllTime: protocol.totalAllTime ?? null,
			mcap: protocolsMcap[protocol.name] ?? null,
			...(bribesProtocols[protocol.name] ? { bribes: bribesProtocols[protocol.name] } : {}),
			...(tokenTaxesProtocols[protocol.name] ? { tokenTax: tokenTaxesProtocols[protocol.name] } : {}),
			...(pfOrPs ? { pfOrPs } : {}),
			...(methodology ? { methodology: methodology.endsWith('.') ? methodology.slice(0, -1) : methodology } : {}),
			...(protocol.doublecounted ? { doublecounted: protocol.doublecounted } : {}),
			...(ZERO_FEE_PERPS.has(protocol.displayName) ? { zeroFeePerp: true } : {}),
			...(openInterestProtocols[protocol.name]?.total24h != null
				? { openInterest: openInterestProtocols[protocol.name].total24h }
				: {}),
			...(activeLiquidityProtocols[protocol.name]?.total24h != null
				? { activeLiquidity: activeLiquidityProtocols[protocol.name].total24h }
				: {}),
			...(normalizedVolumeProtocols[protocol.name]?.total24h != null
				? { normalizedVolume24h: normalizedVolumeProtocols[protocol.name].total24h }
				: {})
		}

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
			protocols[protocol] = {
				...parentProtocols[protocol][0],
				name: protocol,
				slug: slug(protocol)
			}
			continue
		}
		const total24h = parentProtocols[protocol].some((p) => p.total24h != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total24h ?? 0), 0)
			: null
		const total7d = parentProtocols[protocol].some((p) => p.total7d != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total7d ?? 0), 0)
			: null
		const total30d = parentProtocols[protocol].some((p) => p.total30d != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total30d ?? 0), 0)
			: null
		const total1y = parentProtocols[protocol].some((p) => p.total1y != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total1y ?? 0), 0)
			: null
		const totalAllTime = parentProtocols[protocol].some((p) => p.totalAllTime != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.totalAllTime ?? 0), 0)
			: null
		const doublecounted = parentProtocols[protocol].some((p) => p.doublecounted)
		const zeroFeePerp = parentProtocols[protocol].some((p) => p.zeroFeePerp)
		const bribes = parentProtocols[protocol].some((p) => p.bribes != null)
			? parentProtocols[protocol].reduce(
					(acc, p) => {
						acc.total24h += p.bribes?.total24h ?? 0
						acc.total7d += p.bribes?.total7d ?? 0
						acc.total30d += p.bribes?.total30d ?? 0
						acc.total1y += p.bribes?.total1y ?? 0
						acc.totalAllTime += p.bribes?.totalAllTime ?? 0
						return acc
					},
					{
						total24h: 0,
						total7d: 0,
						total30d: 0,
						total1y: 0,
						totalAllTime: 0
					}
				)
			: null
		const tokenTax = parentProtocols[protocol].some((p) => p.tokenTax != null)
			? parentProtocols[protocol].reduce(
					(acc, p) => {
						acc.total24h += p.tokenTax?.total24h ?? 0
						acc.total7d += p.tokenTax?.total7d ?? 0
						acc.total30d += p.tokenTax?.total30d ?? 0
						acc.total1y += p.tokenTax?.total1y ?? 0
						acc.totalAllTime += p.tokenTax?.totalAllTime ?? 0
						return acc
					},
					{
						total24h: 0,
						total7d: 0,
						total30d: 0,
						total1y: 0,
						totalAllTime: 0
					}
				)
			: null

		const openInterest = parentProtocols[protocol].some((p) => p.openInterest != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.openInterest ?? 0), 0)
			: null

		const activeLiquidity = parentProtocols[protocol].some((p) => p.activeLiquidity != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.activeLiquidity ?? 0), 0)
			: null

		const normalizedVolume24h = parentProtocols[protocol].some((p) => p.normalizedVolume24h != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.normalizedVolume24h ?? 0), 0)
			: null

		const methodologySet = new Set<string>()
		for (const p of parentProtocols[protocol]) {
			if (p.methodology) methodologySet.add(p.methodology)
		}
		const methodology: Array<string> = Array.from(methodologySet)

		const pfOrPs = protocolsMcap[protocol] && total30d ? getAnnualizedRatio(protocolsMcap[protocol], total30d) : null

		let topProtocol = parentProtocols[protocol][0]
		for (const p of parentProtocols[protocol]) {
			if ((p.total24h ?? 0) > (topProtocol.total24h ?? 0)) {
				topProtocol = p
			}
		}

		protocols[protocol] = {
			name: protocol,
			slug: slug(protocol),
			logo: tokenIconUrl(protocol),
			category: topProtocol.category ?? null,
			chains: Array.from(new Set(parentProtocols[protocol].map((p) => p.chains ?? []).flat())),
			total24h,
			total7d,
			total30d,
			total1y,
			totalAllTime,
			mcap: protocolsMcap[protocol] ?? null,
			childProtocols: parentProtocols[protocol],
			...(bribes ? { bribes } : {}),
			...(tokenTax ? { tokenTax } : {}),
			...(pfOrPs ? { pfOrPs } : {}),
			...(methodology.length > 0
				? {
						methodology:
							methodology.length > 1
								? methodology
										.map((m) => {
											const children = parentProtocols[protocol].filter((p) => p.methodology === m)
											return `${children.map((c) => (c.name.startsWith(protocol) ? c.name.replace(protocol, '').trim() : c.name)).join(', ')}: ${m}`
										})
										.join('. ')
								: methodology[0]
					}
				: {}),
			...(doublecounted ? { doublecounted } : {}),
			...(zeroFeePerp ? { zeroFeePerp } : {}),
			...(openInterest ? { openInterest } : {}),
			...(activeLiquidity ? { activeLiquidity } : {}),
			...(normalizedVolume24h != null ? { normalizedVolume24h } : {})
		}
	}

	let finalProtocols = []
	if (route === 'pf' || route === 'ps') {
		for (const protocol in protocols) {
			if (protocols[protocol].pfOrPs != null) {
				finalProtocols.push(protocols[protocol])
			}
		}
	} else {
		for (const protocol in protocols) {
			finalProtocols.push(protocols[protocol])
		}
	}

	if (route === 'pf' || route === 'ps') {
		finalProtocols = finalProtocols.sort(
			(a: IAdapterByChainPageData['protocols'][0], b: IAdapterByChainPageData['protocols'][0]) =>
				(b.pfOrPs ?? 0) - (a.pfOrPs ?? 0)
		)
	} else {
		finalProtocols = finalProtocols.sort(
			(a: IAdapterByChainPageData['protocols'][0], b: IAdapterByChainPageData['protocols'][0]) =>
				(b.total24h ?? 0) - (a.total24h ?? 0)
		)
	}

	let openInterest = 0

	for (const protocol in openInterestProtocols) {
		if (openInterestProtocols[protocol]?.doublecounted) continue
		openInterest += openInterestProtocols[protocol]?.total24h ?? 0
	}

	let activeLiquidity: number | null = null

	if (activeLiquidityData) {
		activeLiquidity = 0
		for (const protocol in activeLiquidityProtocols) {
			if (activeLiquidityProtocols[protocol]?.doublecounted) continue
			activeLiquidity += activeLiquidityProtocols[protocol]?.total24h ?? 0
		}
	}

	return {
		chain,
		chains: [
			{ label: 'All', to: `/${route}` },
			...data.allChains.map((chain) => ({ label: chain, to: `/${route}/chain/${slug(chain)}` }))
		],
		protocols: finalProtocols,
		categories: adapterType === 'fees' ? Array.from(categories).sort() : [],
		adapterType,
		chartData:
			adapterType === 'fees'
				? { source: [], dimensions: ['timestamp', 'value'] }
				: buildAdapterByChainChartDataset({
						adapterType,
						metricName,
						primaryChartData: data.totalDataChart ?? [],
						openInterestChartData: openInterestData?.totalDataChart ?? [],
						activeLiquidityChartData: activeLiquidityData?.totalDataChart ?? []
					}),
		dataType: dataType ?? null,
		total24h: data.total24h ?? null,
		total7d: data.total7d ?? null,
		total30d: data.total30d ?? null,
		change_1d: data.change_1d ?? null,
		change_7d: data.change_7d ?? null,
		change_1m: data.change_1m ?? null,
		change_7dover7d: data.change_7dover7d ?? null,
		openInterest,
		activeLiquidity
	}
}

// only returns fees paid by users when using the chain (gas ?), not the fees paid by users when using the protocols on chain
export const getChainsByFeesAdapterPageData = async ({
	adapterType,
	dataType,
	chainMetadata
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	chainMetadata: Record<string, IChainMetadata>
}): Promise<IChainsByAdapterPageData> => {
	try {
		const allChainsSet = new Set<string>()

		for (const chain in chainMetadata) {
			const currentChainMetadata = chainMetadata[chain]
			const sType = adapterType === 'fees' ? (dataType === 'dailyRevenue' ? 'chainRevenue' : 'chainFees') : dataType
			// Check if key exists AND has truthy value (handles boolean flags correctly)
			if (sType in currentChainMetadata && currentChainMetadata[sType as keyof IChainMetadata]) {
				allChainsSet.add(currentChainMetadata.name)
			}
		}

		const [chainsData, bribesData, tokenTaxesData] = await Promise.all([
			fetchAdapterChainMetrics({
				adapterType,
				dataType,
				chain: 'All'
			}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name))),
			fetchAdapterChainMetrics({
				adapterType,
				dataType: 'dailyBribesRevenue',
				chain: 'All'
			}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name))),
			fetchAdapterChainMetrics({
				adapterType,
				dataType: 'dailyTokenTaxes',
				chain: 'All'
			}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name)))
		])

		const bribesByChain: Record<string, { total24h: number | null; total7d: number | null; total30d: number | null }> =
			{}
		const tokenTaxesByChain: Record<
			string,
			{ total24h: number | null; total7d: number | null; total30d: number | null }
		> = {}

		for (const chain of bribesData) {
			bribesByChain[chain.name] = {
				total24h: chain.total24h ?? null,
				total7d: chain.total7d ?? null,
				total30d: chain.total30d ?? null
			}
		}

		for (const chain of tokenTaxesData) {
			tokenTaxesByChain[chain.name] = {
				total24h: chain.total24h ?? null,
				total7d: chain.total7d ?? null,
				total30d: chain.total30d ?? null
			}
		}

		const chains = chainsData
			.map((c) => {
				return {
					name: c.name,
					logo: chainIconUrl(c.name),
					total24h: c.total24h ?? null,
					total7d: c.total7d ?? null,
					total30d: c.total30d ?? null,
					...(bribesByChain[c.name] ? { bribes: bribesByChain[c.name] } : {}),
					...(tokenTaxesByChain[c.name] ? { tokenTax: tokenTaxesByChain[c.name] } : {})
				}
			})
			.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))

		return {
			adapterType,
			dataType: dataType ?? null,
			chartData: { source: [], dimensions: ['timestamp'] },
			chains,
			allChains: chains.map((c) => c.name)
		}
	} catch (error) {
		postRuntimeLogs(String(error))
		throw error
	}
}

// returns combined metrics of all protocols by chain
export const getChainsByAdapterPageData = async ({
	adapterType,
	dataType,
	chainMetadata
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	chainMetadata: Record<string, IChainMetadata>
}): Promise<IChainsByAdapterPageData> => {
	try {
		const allChains: Array<string> = []

		for (const chain in chainMetadata) {
			const currentChainMetadata = chainMetadata[chain]
			const sType =
				adapterType === 'fees'
					? dataType === 'dailyRevenue'
						? 'chainRevenue'
						: 'chainFees'
					: ADAPTER_TYPES_TO_METADATA_TYPE[adapterType]
			// Check if key exists AND has truthy value (handles boolean flags correctly)
			if (sType in currentChainMetadata && currentChainMetadata[sType as keyof IChainMetadata]) {
				allChains.push(currentChainMetadata.name)
			}
		}

		const getOptionalOverview = ({
			enabled,
			adapterType,
			dataType
		}: {
			enabled: boolean
			adapterType: `${ADAPTER_TYPES}`
			dataType: `${ADAPTER_DATA_TYPES}`
		}) =>
			enabled
				? getDimensionAdapterOverviewOfAllChains({
						adapterType,
						dataType,
						chainMetadata
					}).catch(() => {
						return {}
					})
				: Promise.resolve({})

		const [chainsData, rawChartData, bribesData, tokenTaxesData, openInterestData, activeLiquidityData]: [
			Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }>,
			Array<[number, Record<string, number>]>,
			Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }>,
			Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }>,
			Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }>,
			Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }>
		] = await Promise.all([
			getDimensionAdapterOverviewOfAllChains({
				adapterType,
				dataType,
				chainMetadata
			}),
			adapterType === 'fees' ? Promise.resolve([]) : fetchJson(`${V2_SERVER_URL}/chart/${adapterType}/chain-breakdown`),
			getOptionalOverview({
				enabled: adapterType === 'fees',
				adapterType,
				dataType: 'dailyBribesRevenue'
			}),
			getOptionalOverview({
				enabled: adapterType === 'fees',
				adapterType,
				dataType: 'dailyTokenTaxes'
			}),
			getOptionalOverview({
				enabled: adapterType === 'derivatives',
				adapterType: 'open-interest',
				dataType: 'openInterestAtEnd'
			}),
			getOptionalOverview({
				enabled: adapterType === 'normalized-volume',
				adapterType: 'normalized-volume',
				dataType: 'dailyActiveLiquidity'
			})
		])

		const bribesByChain: Record<string, { total24h: number | null; total7d: number | null; total30d: number | null }> =
			{}
		const tokenTaxesByChain: Record<
			string,
			{ total24h: number | null; total7d: number | null; total30d: number | null }
		> = {}
		const openInterestByChain: Record<string, number | null> = {}
		const activeLiquidityByChain: Record<string, number | null> = {}
		const chartDimensions = ['timestamp', ...allChains]
		const chainNameByKey = Object.entries(chainMetadata).reduce(
			(acc, [metadataKey, chain]) => {
				const displayName = chain.name
				if (!displayName) return acc
				acc[displayName] = displayName
				acc[displayName.toLowerCase()] = displayName
				acc[slug(displayName)] = displayName
				acc[String(chain.id)] = displayName
				acc[metadataKey] = displayName
				acc[metadataKey.toLowerCase()] = displayName
				acc[slug(metadataKey)] = displayName
				return acc
			},
			{} as Record<string, string>
		)
		const chartData: MultiSeriesChart2Dataset = {
			dimensions: chartDimensions,
			source: rawChartData
				.map(([timestamp, chainValues]) => {
					const numericTimestamp = Number(timestamp)
					if (!Number.isFinite(numericTimestamp)) return null
					const normalizedTimestamp = numericTimestamp < 1e12 ? numericTimestamp * 1e3 : numericTimestamp
					const row: Record<string, number | null> = { timestamp: normalizedTimestamp }
					for (const chain of allChains) {
						row[chain] = null
					}
					for (const chainKey in chainValues) {
						const displayName =
							chainNameByKey[chainKey] ??
							chainNameByKey[chainKey.toLowerCase()] ??
							chainNameByKey[slug(chainKey)] ??
							chainKey
						if (displayName in row && typeof chainValues[chainKey] === 'number') {
							row[displayName] = chainValues[chainKey]
						}
					}
					return row
				})
				.filter((row): row is Record<string, number | null> => row != null)
				.sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
		}

		for (const chain in bribesData) {
			bribesByChain[chain] = {
				total24h: bribesData[chain]?.['24h'] ?? null,
				total7d: bribesData[chain]?.['7d'] ?? null,
				total30d: bribesData[chain]?.['30d'] ?? null
			}
		}

		for (const chain in tokenTaxesData) {
			tokenTaxesByChain[chain] = {
				total24h: tokenTaxesData[chain]?.['24h'] ?? null,
				total7d: tokenTaxesData[chain]?.['7d'] ?? null,
				total30d: tokenTaxesData[chain]?.['30d'] ?? null
			}
		}

		for (const chain in openInterestData) {
			openInterestByChain[chain] = openInterestData[chain]?.['24h'] ?? null
		}

		for (const chain in activeLiquidityData) {
			activeLiquidityByChain[chain] = activeLiquidityData[chain]?.['24h'] ?? null
		}

		const chains = allChains
			.map((chain) => {
				return {
					name: chain,
					logo: chainIconUrl(chain),
					total24h: chainsData[chain]?.['24h'] ?? null,
					total7d: chainsData[chain]?.['7d'] ?? null,
					total30d: chainsData[chain]?.['30d'] ?? null,
					...(bribesByChain[chain] ? { bribes: bribesByChain[chain] } : {}),
					...(tokenTaxesByChain[chain] ? { tokenTax: tokenTaxesByChain[chain] } : {}),
					...(openInterestByChain[chain] ? { openInterest: openInterestByChain[chain] } : {}),
					...(activeLiquidityByChain[chain] ? { activeLiquidity: activeLiquidityByChain[chain] } : {})
				}
			})
			.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))

		return {
			adapterType,
			dataType: dataType ?? null,
			chartData,
			chains,
			allChains: chains.map((c) => c.name)
		}
	} catch (error) {
		postRuntimeLogs(String(error))
		throw error
	}
}

export const getChainsByREVPageData = async ({
	chainMetadata
}: {
	chainMetadata: Record<string, IChainMetadata>
}): Promise<IChainsByREVPageData> => {
	try {
		const allChains: Array<string> = []

		for (const chain in chainMetadata) {
			if (chainMetadata[chain]['chainFees']) {
				allChains.push(chain)
			}
		}

		const protocolsByChainsData = await Promise.allSettled(
			allChains.map(async (chain) =>
				fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain
				})
			)
		)

		const chainFeesData = await fetchAdapterChainMetrics({
			adapterType: 'fees',
			chain: 'All'
		})

		const chains = allChains.map((chain, index) => {
			const chainFees = chainFeesData.protocols.find((p) => p.slug === chain)
			const protocols = protocolsByChainsData[index].status === 'fulfilled' ? protocolsByChainsData[index].value : null
			const chainRevProtocols =
				chain in REV_PROTOCOLS ? new Set(REV_PROTOCOLS[chain as keyof typeof REV_PROTOCOLS]) : new Set<string>()
			return {
				name: chainMetadata[chain].name,
				slug: chain,
				logo: chainIconUrl(chain),
				total24h:
					(chainFees?.total24h ?? 0) +
					(protocols?.protocols ?? []).reduce((acc, curr) => {
						return chainRevProtocols.has(curr.slug) ? acc + (curr.total24h ?? 0) : acc
					}, 0),
				total30d:
					(chainFees?.total30d ?? 0) +
					(protocols?.protocols ?? []).reduce((acc, curr) => {
						return chainRevProtocols.has(curr.slug) ? acc + (curr.total30d ?? 0) : acc
					}, 0)
			}
		})

		return { chains: chains.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0)) }
	} catch (error) {
		postRuntimeLogs(String(error))
		throw error
	}
}

export async function getDimensionAdapterOverviewOfAllChains({
	adapterType,
	dataType,
	chainMetadata
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	chainMetadata: Record<string, IChainMetadata>
}) {
	try {
		const chains: Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }> = {}
		for (const chain in chainMetadata) {
			const currentChainMetadata = chainMetadata[chain]
			const metadataKey = ADAPTER_TYPES_TO_METADATA_TYPE[adapterType]
			if (!(metadataKey in currentChainMetadata)) continue
			const dataKey = isAdapterDataTypeKey(dataType) ? ADAPTER_DATA_TYPE_KEYS[dataType] : null
			if (!dataKey) continue
			const value = currentChainMetadata.dimAgg?.[adapterType]?.[dataKey]
			if (!value) continue
			chains[currentChainMetadata.name] = value
		}

		return chains
	} catch (error) {
		postRuntimeLogs(String(error))
		throw error
	}
}
