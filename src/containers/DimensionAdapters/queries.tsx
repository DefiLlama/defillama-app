import { getAnnualizedRatio } from '~/api/categories/adaptors'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { PROTOCOLS_API, REV_PROTOCOLS, V2_SERVER_URL, ZERO_FEE_PERPS } from '~/constants'
import { chainIconUrl, slug, tokenIconUrl } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { IChainMetadata } from '~/utils/metadata/types'
import {
	getAdapterChainChartData,
	getAdapterChainMetrics,
	getAdapterProtocolChartData,
	getAdapterProtocolMetrics
} from './api'
import type { IAdapterOverview, IAdapterSummary } from './api.types'
import { ADAPTER_DATA_TYPE_KEYS, ADAPTER_DATA_TYPES, ADAPTER_TYPES, ADAPTER_TYPES_TO_METADATA_TYPE } from './constants'
import { IAdapterByChainPageData, IChainsByAdapterPageData, IChainsByREVPageData } from './types'

export { getAdapterChainChartData, getAdapterChainChartDataByProtocolBreakdown } from './api'
export { getAdapterChainMetrics, getAdapterProtocolChartData, getAdapterProtocolChartDataByBreakdownType } from './api'
export { getAdapterProtocolMetrics, getCexVolume } from './api'
export type { IAdapterOverview, IAdapterSummary } from './api.types'

//breakdown is using chain internal name so we need to map it
let chainMappingCache: Record<string, string> | null = null

async function getChainMapping() {
	if (chainMappingCache) {
		return chainMappingCache
	}

	try {
		const mapping = await fetchJson('https://api.llama.fi/overview/_internal/chain-name-id-map')
		chainMappingCache = mapping
		return mapping
	} catch {
		console.log('Failed to fetch chain mapping, falling back to toLowerCase conversion')
		return {}
	}
}

function getInternalChainName(displayChain: string, chainMapping: Record<string, string>) {
	for (const display in chainMapping) {
		if (display === displayChain) {
			return chainMapping[display]
		}
	}
	return slug(displayChain)
}

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
			getAdapterChainMetrics({ adapterType, chain, dataType }),
			excludeTotalDataChart ? Promise.resolve([]) : getAdapterChainChartData({ adapterType, chain, dataType })
		])

		return { ...overviewData, totalDataChart } as IAdapterOverview
	} else {
		//earnings we don't need to filter by chain, instead we filter it later on
		const [overviewData, totalDataChart, emissionsData, chainMapping] = await Promise.all([
			getAdapterChainMetrics({ adapterType, chain: 'All', dataType: 'dailyRevenue' }),
			excludeTotalDataChart
				? Promise.resolve([])
				: getAdapterChainChartData({ adapterType, chain, dataType: 'dailyRevenue' }),
			getEmissionsData(),
			getChainMapping()
		])

		const earningsData = processEarningsData(overviewData, emissionsData)

		let filteredEarningsData = earningsData
		let chainSpecificTotal24h = 0
		let chainSpecificTotal7d = 0
		let chainSpecificTotal30d = 0
		let chainSpecificTotal1y = 0

		if (chain && chain !== 'All') {
			const internalChainName = getInternalChainName(chain, chainMapping)

			filteredEarningsData = earningsData
				.filter((protocol) => {
					return protocol.breakdown24h && protocol.breakdown24h[internalChainName]
				})
				.map((protocol) => {
					const chainRevenue24h: number = protocol.breakdown24h?.[internalChainName]
						? (Object.values(protocol.breakdown24h[internalChainName]) as number[]).reduce(
								(sum: number, val: number) => sum + (val || 0),
								0
							)
						: 0
					const chainRevenue30d: number = protocol.breakdown30d?.[internalChainName]
						? (Object.values(protocol.breakdown30d[internalChainName]) as number[]).reduce(
								(sum: number, val: number) => sum + (val || 0),
								0
							)
						: 0

					const totalRevenue24h: number = (
						Object.values(protocol.breakdown24h || {}) as Record<string, number>[]
					).reduce(
						(sum: number, chainData) =>
							sum +
							(Object.values(chainData as Record<string, number>) as number[]).reduce(
								(s: number, v: number) => s + (v || 0),
								0
							),
						0
					)
					const totalRevenue30d: number = (
						Object.values(protocol.breakdown30d || {}) as Record<string, number>[]
					).reduce(
						(sum: number, chainData) =>
							sum +
							(Object.values(chainData as Record<string, number>) as number[]).reduce(
								(s: number, v: number) => s + (v || 0),
								0
							),
						0
					)

					const chainRevenueRatio24h = totalRevenue24h > 0 ? chainRevenue24h / totalRevenue24h : 0
					const chainRevenueRatio30d = totalRevenue30d > 0 ? chainRevenue30d / totalRevenue30d : 0

					const emissions = protocol._emissions

					const chainEmissions24h = (emissions?.emission24h || 0) * chainRevenueRatio24h
					const chainEmissions30d = (emissions?.emission30d || 0) * chainRevenueRatio30d

					const chainEarnings24h = chainRevenue24h - chainEmissions24h
					const chainEarnings30d = chainRevenue30d - chainEmissions30d

					chainSpecificTotal24h += chainEarnings24h
					chainSpecificTotal30d += chainEarnings30d

					return {
						...protocol,
						//use chain earnings (revenue - emissions)
						total24h: chainEarnings24h,
						total30d: chainEarnings30d
					}
				})
		} else {
			chainSpecificTotal24h = earningsData.reduce((sum, p) => sum + (p.total24h ?? 0), 0)
			chainSpecificTotal7d = earningsData.reduce((sum, p) => sum + (p.total7d ?? 0), 0)
			chainSpecificTotal30d = earningsData.reduce((sum, p) => sum + (p.total30d ?? 0), 0)
			chainSpecificTotal1y = earningsData.reduce((sum, p) => sum + (p.total1y ?? 0), 0)
			filteredEarningsData = earningsData
		}

		return {
			...overviewData,
			totalDataChart,
			chain,
			total24h: chainSpecificTotal24h,
			total7d: chainSpecificTotal7d,
			total30d: chainSpecificTotal30d,
			total1y: chainSpecificTotal1y,
			protocols: filteredEarningsData
		} as IAdapterOverview
	}
}

export async function getAdapterProtocolSummary({
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
		getAdapterProtocolMetrics({ adapterType, protocol, dataType }),
		excludeTotalDataChart ? Promise.resolve([]) : getAdapterProtocolChartData({ adapterType, protocol, dataType })
	])

	return { ...overviewData, totalDataChart } as IAdapterSummary
}

async function getEmissionsData() {
	const data = await fetchJson('https://api.llama.fi/emissionsBreakdownAggregated')
	return data
}

function findEmissionsForProtocol(protocolVersions: any[], emissionsData: any) {
	const parentKey = protocolVersions[0].parentProtocol || protocolVersions[0].defillamaId

	let emissions = emissionsData.protocols.find((p) => {
		if (p.defillamaId === parentKey) return true
		if (protocolVersions.some((pv) => p.defillamaId === pv.defillamaId)) return true
		if (p.linked && protocolVersions.some((pv) => p.linked.includes(pv.defillamaId))) return true
		return false
	})

	// Special case for Chain category protocols
	if (!emissions && protocolVersions.length === 1 && protocolVersions[0].category === 'Chain') {
		const protocol = protocolVersions[0]
		emissions = emissionsData.protocols.find((p) => p.name === protocol.name || p.name === protocol.displayName)
	}

	return emissions
}

function calculateEarnings(protocolData: any, emissions: any) {
	return {
		...protocolData,
		total24h: (protocolData.total24h ?? 0) - (emissions?.emission24h ?? 0),
		total7d: (protocolData.total7d ?? 0) - (emissions?.emission7d ?? 0),
		total30d: (protocolData.total30d ?? 0) - (emissions?.emission30d ?? 0),
		total1y: (protocolData.total1y ?? 0) - (emissions?.emission1y ?? 0),
		totalAllTime: (protocolData.totalAllTime ?? 0) - (emissions?.emissionAllTime ?? 0),
		_emissions: emissions
	}
}

function aggregateProtocolVersions(protocolVersions: any[]) {
	const aggregatedRevenue = {
		total24h: protocolVersions.reduce((sum, p) => sum + (p.total24h ?? 0), 0),
		total7d: protocolVersions.reduce((sum, p) => sum + (p.total7d ?? 0), 0),
		total30d: protocolVersions.reduce((sum, p) => sum + (p.total30d ?? 0), 0),
		total1y: protocolVersions.reduce((sum, p) => sum + (p.total1y ?? 0), 0),
		totalAllTime: protocolVersions.reduce((sum, p) => sum + (p.totalAllTime ?? 0), 0)
	}

	const breakdowns24h: any[] = []
	const breakdowns30d: any[] = []
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
		breakdown30d: mergedBreakdown30d,
		linkedProtocols: undefined,
		parentProtocol: undefined
	}
}

function mergeBreakdowns(breakdowns: Record<string, Record<string, number>>[]) {
	const merged = {}
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

function groupProtocolsByParent(protocols: any[]) {
	const protocolGroups = new Map<string, any[]>()

	for (const protocol of protocols) {
		const parentKey = protocol.parentProtocol || protocol.defillamaId
		if (!protocolGroups.has(parentKey)) {
			protocolGroups.set(parentKey, [])
		}
		protocolGroups.get(parentKey)!.push(protocol)
	}

	return protocolGroups
}

function processGroupedProtocols(
	protocolGroups: Map<string, any[]>,
	processor: (protocolVersions: any[], parentKey: string) => any
) {
	const processedData = []
	for (const [parentKey, protocolVersions] of protocolGroups) {
		processedData.push(processor(protocolVersions, parentKey))
	}
	return processedData
}

function processEarningsData(data: IAdapterOverview, emissionsData: any) {
	const protocolGroups = groupProtocolsByParent(data.protocols)

	return processGroupedProtocols(protocolGroups, (protocolVersions, _parentKey) => {
		const emissions = findEmissionsForProtocol(protocolVersions, emissionsData)

		if (protocolVersions.length === 1) {
			return calculateEarnings(protocolVersions[0], emissions)
		} else {
			const aggregatedProtocol = aggregateProtocolVersions(protocolVersions)
			return calculateEarnings(aggregatedProtocol, emissions)
		}
	})
}

function processRevenueDataForMatching(protocols: any[]) {
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

function matchRevenueToEarnings(revenueData: any[], earningsProtocols: any[]) {
	const matchedData = {}

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
		IAdapterOverview,
		{
			protocols: Array<{ name: string; mcap: number | null }>
			parentProtocols: Array<{ name: string; mcap: number | null }>
		},
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null
	] = await Promise.all([
		getAdapterChainOverview({
			adapterType,
			chain,
			dataType,
			excludeTotalDataChart: adapterType === 'fees'
		}),
		fetchJson(PROTOCOLS_API),
		adapterType === 'fees'
			? getAdapterChainOverview({
					adapterType,
					chain,
					dataType: 'dailyBribesRevenue',
					excludeTotalDataChart: true
				})
			: Promise.resolve(null),
		adapterType === 'fees'
			? getAdapterChainOverview({
					adapterType,
					chain,
					dataType: 'dailyTokenTaxes',
					excludeTotalDataChart: true
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
			? getAdapterChainOverview({
					adapterType: 'normalized-volume',
					chain,
					excludeTotalDataChart: true
				})
			: Promise.resolve(null)
	])

	const protocolsMcap = {}
	for (const protocol of protocolsData.protocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	for (const protocol of protocolsData.parentProtocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}

	const allProtocols = [...data.protocols]

	let bribesProtocols = {}
	let tokenTaxesProtocols = {}
	let openInterestProtocols: Record<string, { total24h: number | null; doublecounted: boolean }> = {}
	let activeLiquidityProtocols: Record<string, { total24h: number | null; doublecounted: boolean }> = {}
	let normalizedVolumeProtocols: Record<string, { total24h: number | null }> = {}

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
			bribesData?.protocols.reduce((acc, p) => {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					total7d: p.total7d ?? null,
					total30d: p.total30d ?? null,
					total1y: p.total1y ?? null,
					totalAllTime: p.totalAllTime ?? null
				}

				const protocolExists = allProtocols.find((ap) => ap.name === p.name)
				if (!protocolExists) {
					allProtocols.push({
						...p,
						total24h: null,
						total7d: null,
						total30d: null,
						total1y: null,
						totalAllTime: null
					})
				}

				return acc
			}, {}) ?? {}

		tokenTaxesProtocols =
			tokenTaxesData?.protocols.reduce((acc, p) => {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					total7d: p.total7d ?? null,
					total30d: p.total30d ?? null,
					total1y: p.total1y ?? null,
					totalAllTime: p.totalAllTime ?? null
				}

				const protocolExists = allProtocols.find((ap) => ap.name === p.name)
				if (!protocolExists) {
					allProtocols.push({
						...p,
						total24h: null,
						total7d: null,
						total30d: null,
						total1y: null,
						totalAllTime: null
					})
				}

				return acc
			}, {}) ?? {}
	}

	if (openInterestData) {
		openInterestProtocols = openInterestData.protocols.reduce((acc, p) => {
			acc[p.name] = {
				total24h: p.total24h ?? null,
				doublecounted: !!p.doublecounted
			}
			return acc
		}, {})
	}

	if (activeLiquidityData) {
		activeLiquidityProtocols = activeLiquidityData.protocols.reduce((acc, p) => {
			acc[p.name] = {
				total24h: p.total24h ?? null,
				doublecounted: !!p.doublecounted
			}
			return acc
		}, {})
	}

	if (normalizedVolumeData) {
		normalizedVolumeProtocols = normalizedVolumeData.protocols.reduce((acc, p) => {
			if (p.name === 'Extended') return acc
			acc[p.name] = {
				total24h: p.total24h ?? null
			}
			return acc
		}, {})
	}

	const protocols = {}
	const parentProtocols = {}
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

		const pf =
			protocolsMcap[protocol.name] && protocol.total30d
				? getAnnualizedRatio(protocolsMcap[protocol.name], protocol.total30d)
				: null

		const ps =
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
			...(pf ? { pf } : {}),
			...(ps ? { ps } : {}),
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

		const pf = protocolsMcap[protocol] && total30d ? getAnnualizedRatio(protocolsMcap[protocol], total30d) : null
		const ps = protocolsMcap[protocol] && total30d ? getAnnualizedRatio(protocolsMcap[protocol], total30d) : null

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
			...(pf ? { pf } : {}),
			...(ps ? { ps } : {}),
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
	if (route === 'pf') {
		for (const protocol in protocols) {
			if (protocols[protocol].pf != null) {
				finalProtocols.push(protocols[protocol])
			}
		}
	} else if (route === 'ps') {
		for (const protocol in protocols) {
			if (protocols[protocol].ps != null) {
				finalProtocols.push(protocols[protocol])
			}
		}
	} else {
		for (const protocol in protocols) {
			finalProtocols.push(protocols[protocol])
		}
	}

	if (route === 'pf') {
		finalProtocols = finalProtocols.sort(
			(a: IAdapterByChainPageData['protocols'][0], b: IAdapterByChainPageData['protocols'][0]) =>
				(b.pf ?? 0) - (a.pf ?? 0)
		)
	} else if (route === 'ps') {
		finalProtocols = finalProtocols.sort(
			(a: IAdapterByChainPageData['protocols'][0], b: IAdapterByChainPageData['protocols'][0]) =>
				(b.ps ?? 0) - (a.ps ?? 0)
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
			if (sType && currentChainMetadata[sType]) {
				allChainsSet.add(currentChainMetadata.name)
			}
		}

		const [chainsData, bribesData, tokenTaxesData] = await Promise.all([
			getAdapterChainOverview({
				adapterType,
				dataType,
				chain: 'All',
				excludeTotalDataChart: true
			}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name))),
			getAdapterChainOverview({
				adapterType,
				dataType: 'dailyBribesRevenue',
				chain: 'All',
				excludeTotalDataChart: true
			}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name))),
			getAdapterChainOverview({
				adapterType,
				dataType: 'dailyTokenTaxes',
				chain: 'All',
				excludeTotalDataChart: true
			}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name)))
		])

		const bribesByChain = {}
		const tokenTaxesByChain = {}

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
		postRuntimeLogs(error)
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
			if (sType && currentChainMetadata[sType]) {
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

		const bribesByChain = {}
		const tokenTaxesByChain = {}
		const openInterestByChain = {}
		const activeLiquidityByChain = {}
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
		postRuntimeLogs(error)
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
				getAdapterChainOverview({
					adapterType: 'fees',
					chain,
					excludeTotalDataChart: true
				})
			)
		)

		const chainFeesData = await getAdapterChainOverview({
			adapterType: 'fees',
			chain: 'All',
			excludeTotalDataChart: true
		})

		const chains = allChains.map((chain, index) => {
			const chainFees = chainFeesData.protocols.find((p) => p.slug === chain)
			const protocols = protocolsByChainsData[index].status === 'fulfilled' ? protocolsByChainsData[index].value : null
			const chainRevProtocols = new Set(REV_PROTOCOLS[chain] ?? [])
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
		postRuntimeLogs(error)
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
			const adapterMetadata = currentChainMetadata?.[ADAPTER_TYPES_TO_METADATA_TYPE[adapterType]]
			if (!adapterMetadata) continue
			const dataKey = ADAPTER_DATA_TYPE_KEYS[dataType] ?? null
			const value = currentChainMetadata.dimAgg?.[adapterType]?.[dataKey]
			if (!value) continue
			chains[currentChainMetadata.name] = value
		}

		return chains
	} catch (error) {
		postRuntimeLogs(error)
		throw error
	}
}
