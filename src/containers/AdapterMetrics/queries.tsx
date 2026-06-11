import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { REV_PROTOCOLS, V2_SERVER_URL, ZERO_FEE_PERPS } from '~/constants'
import { getDimensionAdapterChainEarningsOverview } from '~/containers/Incentives/queries'
import { fetchProtocols } from '~/containers/ProtocolLists/api'
import type { ChainNativeFeeRevenueRankingDataType } from '~/metrics/definitions'
import { FEE_EXTRA_PERIOD_TOTAL_KEYS } from '~/metrics/feeExtras'
import { feeRevenueMetrics, getChainNativeFeeRevenueRankingMetric } from '~/metrics/feesRevenue'
import { slug, getAnnualizedRatio } from '~/utils'
import { fetchJson } from '~/utils/async'
import { chainIconUrl, tokenIconUrl } from '~/utils/icons'
import type { IChainMetadata } from '~/utils/metadata/types'
import { recordRuntimeError } from '~/utils/telemetry'
import {
	fetchAdapterChainChartData,
	fetchAdapterChainMetrics,
	fetchAdapterProtocolChartData,
	fetchAdapterProtocolMetrics
} from './api'
import type { IAdapterProtocolMetrics, IAdapterChainMetrics } from './api.types'
import { ADAPTER_DATA_TYPE_KEYS, ADAPTER_DATA_TYPES, ADAPTER_TYPES, getChainMetadataKey } from './constants'
import { mergeMetricPeriods, type MetricPeriodFields } from './metricPeriods'
import type {
	IAdapterByChainPageData,
	IAdapterChainOverview,
	IChainsByAdapterPageData,
	IChainsByREVPageData,
	IProtocol
} from './types'
import {
	buildAdapterByChainChartDataset,
	matchRevenueToEarnings,
	processRevenueDataForMatching,
	type ActiveLiquidityData,
	type BribesData,
	type NormalizedVolumeData,
	type OpenInterestData
} from './utils'

const FEES_CHART_ROUTES = new Set(['fees', 'revenue', 'holders-revenue'])
const CANTON_INCENTIVES_WARNING =
	'Canton is currently distributing massive incentives, so its fees and revenue should be interpreted with that context.'

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
			| 'totalAllTime'
			| 'change_1d'
			| 'change_7d'
			| 'change_1m'
			| 'change_7dover7d'
			| 'change_30dover30d'
		>
	>

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
		totalAllTime: protocol.totalAllTime ?? null
	}
}

function addFeeExtraPeriodTotals(acc: BribesData, totals: BribesData) {
	for (const key of FEE_EXTRA_PERIOD_TOTAL_KEYS) {
		acc[key] = (acc[key] ?? 0) + (totals[key] ?? 0)
	}
}

function buildChainsChartData({
	rawChartData,
	allChains
}: {
	rawChartData: Array<[number, Record<string, number>]>
	allChains: string[]
}): MultiSeriesChart2Dataset {
	const chartDimensions = ['timestamp', ...allChains]
	const source: MultiSeriesChart2Dataset['source'] = []
	for (const [timestamp, chainValues] of rawChartData) {
		const normalizedTimestamp = timestamp < 1e12 ? timestamp * 1e3 : timestamp
		const row: Record<string, number | null> = { timestamp: normalizedTimestamp }

		for (const chain of allChains) {
			row[chain] = null
		}

		for (const chainKey in chainValues) {
			if (chainKey in row) {
				row[chainKey] = chainValues[chainKey]
			}
		}

		source.push(row)
	}
	source.sort((a, b) => Number(a.timestamp) - Number(b.timestamp))

	return {
		dimensions: chartDimensions,
		source
	}
}

export function getChainsByAdapterAllChains({
	adapterType,
	dataType,
	chainMetadata
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	chainMetadata: Record<string, IChainMetadata>
}): string[] {
	const allChains: Array<string> = []
	const sType = getChainMetadataKey(adapterType, dataType)
	if (!sType) return allChains

	for (const chain in chainMetadata) {
		const currentChainMetadata = chainMetadata[chain]
		if (!currentChainMetadata[sType]) continue
		allChains.push(currentChainMetadata.name)
	}

	return allChains
}

export async function getChainsByAdapterChartData({
	adapterType,
	dataType,
	allChains,
	allowEmptyOnError = false
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	allChains: string[]
	allowEmptyOnError?: boolean
}): Promise<MultiSeriesChart2Dataset> {
	let rawChartData: Array<[number, Record<string, number>]>
	try {
		rawChartData = await fetchJson<Array<[number, Record<string, number>]>>(
			`${V2_SERVER_URL}/chart/${adapterType}/chain-breakdown${dataType ? `?dataType=${dataType}` : ''}`
		)
	} catch (error) {
		if (!allowEmptyOnError) throw error
		rawChartData = []
	}

	return buildChainsChartData({ rawChartData, allChains })
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
	if (protocol.toLowerCase() === 'all') throw new Error('Protocol cannot be All')

	const [overviewData, totalDataChart] = await Promise.all([
		fetchAdapterProtocolMetrics({ adapterType, protocol, dataType }),
		excludeTotalDataChart ? Promise.resolve([]) : fetchAdapterProtocolChartData({ adapterType, protocol, dataType })
	])

	return { ...overviewData, totalDataChart } as IAdapterProtocolMetrics & { totalDataChart: Array<[number, number]> }
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
	const showFeesChart = FEES_CHART_ROUTES.has(route)

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
			parentProtocols: Array<{ name: string; mcap?: number | null }>
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
			excludeTotalDataChart: adapterType === 'fees' && !showFeesChart
		}),
		fetchProtocols().catch(() => ({ protocols: [], parentProtocols: [] })),
		adapterType === 'fees'
			? fetchAdapterChainMetrics({
					adapterType,
					chain,
					dataType: 'dailyBribesRevenue'
				}).catch(() => null)
			: Promise.resolve(null),
		adapterType === 'fees'
			? fetchAdapterChainMetrics({
					adapterType,
					chain,
					dataType: 'dailyTokenTaxes'
				}).catch(() => null)
			: Promise.resolve(null),
		hasOpenInterest
			? getAdapterChainOverview({
					adapterType: 'open-interest',
					chain,
					dataType: 'openInterestAtEnd',
					excludeTotalDataChart: false
				}).catch(() => null)
			: Promise.resolve(null),
		adapterType === 'normalized-volume'
			? getAdapterChainOverview({
					adapterType: 'normalized-volume',
					chain,
					dataType: 'dailyActiveLiquidity',
					excludeTotalDataChart: false
				}).catch(() => null)
			: Promise.resolve(null),
		adapterType === 'derivatives'
			? fetchAdapterChainMetrics({
					adapterType: 'normalized-volume',
					chain
				}).catch(() => null)
			: Promise.resolve(null)
	])

	const protocolsMcap: Record<string, number | null> = {}
	for (const protocol of protocolsData.protocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	for (const protocol of protocolsData.parentProtocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}

	const allProtocols: AdapterByChainSourceProtocol[] = [...data.protocols]

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
		if (bribesData) {
			for (const p of bribesData.protocols) {
				bribesProtocols[p.name] = getFeeExtraPeriodTotals(p)

				if (!allProtocolsByName.has(p.name)) {
					allProtocolsByName.add(p.name)
					allProtocols.push(buildFeeExtraOnlyProtocolRow(p))
				}
			}
		}

		if (tokenTaxesData) {
			for (const p of tokenTaxesData.protocols) {
				tokenTaxesProtocols[p.name] = getFeeExtraPeriodTotals(p)

				if (!allProtocolsByName.has(p.name)) {
					allProtocolsByName.add(p.name)
					allProtocols.push(buildFeeExtraOnlyProtocolRow(p))
				}
			}
		}
	}

	if (openInterestData) {
		for (const p of openInterestData.protocols) {
			openInterestProtocols[p.name] = {
				total24h: p.total24h ?? null,
				doublecounted: !!p.doublecounted
			}
		}
	}

	if (activeLiquidityData) {
		for (const p of activeLiquidityData.protocols) {
			activeLiquidityProtocols[p.name] = {
				total24h: p.total24h ?? null,
				doublecounted: !!p.doublecounted
			}
		}
	}

	if (normalizedVolumeData) {
		for (const p of normalizedVolumeData.protocols) {
			normalizedVolumeProtocols[p.name] = {
				total24h: p.total24h ?? null
			}
		}
	}

	const protocols: Record<string, IProtocol> = {}
	const parentProtocols: Record<string, IProtocol[]> = {}
	const categories = new Set<string>()

	for (const protocol of allProtocols) {
		const warning =
			protocol.slug === 'canton' && (metricName === 'Fees' || metricName === 'Revenue')
				? CANTON_INCENTIVES_WARNING
				: null
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
			total48hto24h: protocol.total48hto24h ?? null,
			total7d: protocol.total7d ?? null,
			total14dto7d: protocol.total14dto7d ?? null,
			total30d: protocol.total30d ?? null,
			total60dto30d: protocol.total60dto30d ?? null,
			total7DaysAgo: protocol.total7DaysAgo ?? null,
			total30DaysAgo: protocol.total30DaysAgo ?? null,
			total1y: protocol.total1y ?? null,
			totalAllTime: protocol.totalAllTime ?? null,
			change_1d: protocol.change_1d ?? null,
			change_7d: protocol.change_7d ?? null,
			change_1m: protocol.change_1m ?? null,
			change_7dover7d: protocol.change_7dover7d ?? null,
			change_30dover30d: protocol.change_30dover30d ?? null,
			mcap: protocolsMcap[protocol.name] ?? null,
			...(bribesProtocols[protocol.name] ? { bribes: bribesProtocols[protocol.name] } : {}),
			...(tokenTaxesProtocols[protocol.name] ? { tokenTax: tokenTaxesProtocols[protocol.name] } : {}),
			...(pfOrPs ? { pfOrPs } : {}),
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
			const breakdownAliases = new Set([
				parentProtocols[protocol][0].name,
				...(parentProtocols[protocol][0].breakdownAliases ?? [])
			])
			breakdownAliases.delete(protocol)
			protocols[protocol] = {
				...parentProtocols[protocol][0],
				name: protocol,
				slug: slug(protocol),
				breakdownAliases: Array.from(breakdownAliases)
			}
			continue
		}
		let periodTotals: MetricPeriodFields = {}
		for (const p of parentProtocols[protocol]) {
			periodTotals = mergeMetricPeriods(periodTotals, p)
		}
		const totals = {
			total24h: periodTotals.total24h ?? null,
			total7d: periodTotals.total7d ?? null,
			total30d: periodTotals.total30d ?? null,
			total1y: periodTotals.total1y ?? null,
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
		let topProtocol = parentProtocols[protocol][0]
		const breakdownAliasSet = new Set<string>()
		const chainSet = new Set<string>()

		for (const p of parentProtocols[protocol]) {
			if (p.doublecounted) doublecounted = true
			if (p.zeroFeePerp) zeroFeePerp = true
			if (!warning && p.warning) warning = p.warning
			if (p.bribes) {
				bribes ??= {}
				addFeeExtraPeriodTotals(bribes, p.bribes)
			}
			if (p.tokenTax) {
				tokenTax ??= {}
				addFeeExtraPeriodTotals(tokenTax, p.tokenTax)
			}
			if (p.openInterest != null) {
				openInterest = (openInterest ?? 0) + p.openInterest
			}
			if (p.activeLiquidity != null) {
				activeLiquidity = (activeLiquidity ?? 0) + p.activeLiquidity
			}
			if (p.normalizedVolume24h != null) {
				normalizedVolume24h = (normalizedVolume24h ?? 0) + p.normalizedVolume24h
			}
			if (p.methodology) {
				methodologySet.add(p.methodology)
				let children = methodologyChildrenByMethod.get(p.methodology)
				if (!children) {
					children = []
					methodologyChildrenByMethod.set(p.methodology, children)
				}
				children.push(p.name.startsWith(protocol) ? p.name.replace(protocol, '').trim() : p.name)
			}
			if ((p.total24h ?? 0) > (topProtocol.total24h ?? 0)) {
				topProtocol = p
			}
			if (p.name !== protocol) breakdownAliasSet.add(p.name)
			for (const alias of p.breakdownAliases ?? []) {
				if (alias !== protocol) breakdownAliasSet.add(alias)
			}
			for (const childChain of p.chains ?? []) {
				chainSet.add(childChain)
			}
		}
		const methodology: Array<string> = Array.from(methodologySet)
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

		const pfOrPs =
			protocolsMcap[protocol] && totals.total30d ? getAnnualizedRatio(protocolsMcap[protocol], totals.total30d) : null

		protocols[protocol] = {
			name: protocol,
			slug: slug(protocol),
			logo: tokenIconUrl(protocol),
			category: topProtocol.category ?? null,
			chains: Array.from(chainSet),
			...periodTotals,
			...totals,
			mcap: protocolsMcap[protocol] ?? null,
			breakdownAliases: Array.from(breakdownAliasSet),
			childProtocols: parentProtocols[protocol],
			...(bribes ? { bribes } : {}),
			...(tokenTax ? { tokenTax } : {}),
			...(pfOrPs ? { pfOrPs } : {}),
			...(methodologyText ? { methodology: methodologyText } : {}),
			...(doublecounted ? { doublecounted } : {}),
			...(zeroFeePerp ? { zeroFeePerp } : {}),
			...(warning ? { warning } : {}),
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

	const chartData = buildAdapterByChainChartDataset({
		adapterType,
		metricName,
		primaryChartData: data.totalDataChart ?? [],
		openInterestChartData: openInterestData?.totalDataChart ?? [],
		activeLiquidityChartData: activeLiquidityData?.totalDataChart ?? []
	})

	return {
		chain,
		chains: [
			{ label: 'All', to: `/${route}` },
			...data.allChains.map((chainName) => ({ label: chainName, to: `/${route}/chain/${slug(chainName)}` }))
		],
		protocols: finalProtocols,
		categories: adapterType === 'fees' ? Array.from(categories).sort() : [],
		adapterType,
		chartData,
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
	dataType: ChainNativeFeeRevenueRankingDataType
	chainMetadata: Record<string, IChainMetadata>
}): Promise<IChainsByAdapterPageData> => {
	try {
		const allChainsSet = new Set<string>()
		const metric = getChainNativeFeeRevenueRankingMetric(dataType)

		for (const chain in chainMetadata) {
			const currentChainMetadata = chainMetadata[chain]
			if (!currentChainMetadata[metric.metadataFlag]) continue
			allChainsSet.add(currentChainMetadata.name)
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
			})
				.then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name)))
				.catch(() => []),
			fetchAdapterChainMetrics({
				adapterType,
				dataType: 'dailyTokenTaxes',
				chain: 'All'
			})
				.then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChainsSet.has(p.name)))
				.catch(() => [])
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
				const warning =
					c.name === 'Canton' &&
					(dataType === ADAPTER_DATA_TYPES.DAILY_FEES || dataType === ADAPTER_DATA_TYPES.DAILY_REVENUE)
						? CANTON_INCENTIVES_WARNING
						: null
				return {
					name: c.name,
					logo: chainIconUrl(c.name),
					total24h: c.total24h ?? null,
					total7d: c.total7d ?? null,
					total30d: c.total30d ?? null,
					...(warning ? { warning } : {}),
					...(bribesByChain[c.name] ? { bribes: bribesByChain[c.name] } : {}),
					...(tokenTaxesByChain[c.name] ? { tokenTax: tokenTaxesByChain[c.name] } : {})
				}
			})
			.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))
		const allChains = chains.map((c) => c.name)

		return {
			adapterType,
			dataType: dataType ?? null,
			chartData: { dimensions: ['timestamp'], source: [] },
			chains,
			allChains
		}
	} catch (error) {
		recordRuntimeError(error, 'pageBuild', { event: 'chainsByFeesAdapter', adapterType, dataType })
		throw error
	}
}

// returns combined metrics of all protocols by chain
export const getChainsByAdapterPageData = async ({
	adapterType,
	dataType,
	chainMetadata,
	includeChartData = true
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	chainMetadata: Record<string, IChainMetadata>
	includeChartData?: boolean
}): Promise<IChainsByAdapterPageData> => {
	try {
		const allChains = getChainsByAdapterAllChains({ adapterType, dataType, chainMetadata })

		const getOptionalOverview = ({
			enabled,
			adapterType: overviewAdapterType,
			dataType: overviewDataType
		}: {
			enabled: boolean
			adapterType: `${ADAPTER_TYPES}`
			dataType: `${ADAPTER_DATA_TYPES}`
		}) => {
			if (!enabled) return Promise.resolve({})
			try {
				return Promise.resolve(
					getDimensionAdapterOverviewOfAllChains({
						adapterType: overviewAdapterType,
						dataType: overviewDataType,
						chainMetadata
					})
				)
			} catch {
				return Promise.resolve({})
			}
		}

		const [chainsData, chartData, bribesData, tokenTaxesData, openInterestData, activeLiquidityData]: [
			Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }>,
			MultiSeriesChart2Dataset,
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
			includeChartData
				? getChainsByAdapterChartData({ adapterType, dataType, allChains, allowEmptyOnError: true })
				: Promise.resolve({ dimensions: ['timestamp'], source: [] }),
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

		const chains: IChainsByAdapterPageData['chains'] = []
		for (const chain of allChains) {
			const warning =
				chain === 'Canton' &&
				(dataType === ADAPTER_DATA_TYPES.DAILY_FEES || dataType === ADAPTER_DATA_TYPES.DAILY_REVENUE)
					? CANTON_INCENTIVES_WARNING
					: null
			const bribes = bribesData[chain]
				? {
						total24h: bribesData[chain]?.['24h'] ?? null,
						total7d: bribesData[chain]?.['7d'] ?? null,
						total30d: bribesData[chain]?.['30d'] ?? null
					}
				: null
			const tokenTax = tokenTaxesData[chain]
				? {
						total24h: tokenTaxesData[chain]?.['24h'] ?? null,
						total7d: tokenTaxesData[chain]?.['7d'] ?? null,
						total30d: tokenTaxesData[chain]?.['30d'] ?? null
					}
				: null
			const openInterest = openInterestData[chain]?.['24h'] ?? null
			const activeLiquidity = activeLiquidityData[chain]?.['24h'] ?? null

			chains.push({
				name: chain,
				logo: chainIconUrl(chain),
				total24h: chainsData[chain]?.['24h'] ?? null,
				total7d: chainsData[chain]?.['7d'] ?? null,
				total30d: chainsData[chain]?.['30d'] ?? null,
				...(warning ? { warning } : {}),
				...(bribes ? { bribes } : {}),
				...(tokenTax ? { tokenTax } : {}),
				...(openInterest ? { openInterest } : {}),
				...(activeLiquidity ? { activeLiquidity } : {})
			})
		}

		chains.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))
		const sortedAllChains: string[] = []
		for (const chain of chains) {
			sortedAllChains.push(chain.name)
		}

		return {
			adapterType,
			dataType: dataType ?? null,
			chartData,
			chains,
			allChains: sortedAllChains
		}
	} catch (error) {
		recordRuntimeError(error, 'pageBuild', { event: 'chainsByAdapter', adapterType, dataType })
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
			if (chainMetadata[chain][feeRevenueMetrics.rev.metadataFlag]) {
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

		const chains: IChainsByREVPageData['chains'] = []
		for (let index = 0; index < allChains.length; index++) {
			const chain = allChains[index]
			const chainFees = chainFeesData.protocols.find((p) => p.slug === chain)
			const protocolsResult = protocolsByChainsData[index]
			const protocols = protocolsResult.status === 'fulfilled' ? protocolsResult.value : null
			const chainRevProtocols =
				chain in REV_PROTOCOLS ? new Set(REV_PROTOCOLS[chain as keyof typeof REV_PROTOCOLS]) : new Set<string>()
			let revProtocols24h = 0
			let revProtocols30d = 0
			for (const curr of protocols?.protocols ?? []) {
				if (!chainRevProtocols.has(curr.slug)) continue
				revProtocols24h += curr.total24h ?? 0
				revProtocols30d += curr.total30d ?? 0
			}

			chains.push({
				name: chainMetadata[chain].name,
				slug: chain,
				logo: chainIconUrl(chain),
				total24h: (chainFees?.total24h ?? 0) + revProtocols24h,
				total30d: (chainFees?.total30d ?? 0) + revProtocols30d
			})
		}

		return { chains: chains.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0)) }
	} catch (error) {
		recordRuntimeError(error, 'pageBuild', { event: 'chainsByREV' })
		throw error
	}
}

export function getDimensionAdapterOverviewOfAllChains({
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
			const metadataKey = getChainMetadataKey(adapterType, dataType)
			if (!metadataKey || !currentChainMetadata[metadataKey]) continue
			const dataKey = dataType in ADAPTER_DATA_TYPE_KEYS ? ADAPTER_DATA_TYPE_KEYS[dataType] : null
			if (!dataKey) continue
			const value = currentChainMetadata.dimAgg?.[adapterType]?.[dataKey]
			if (!value) continue
			chains[currentChainMetadata.name] = value
		}

		return chains
	} catch (error) {
		recordRuntimeError(error, 'pageBuild', { event: 'dimensionAdapterOverviewOfAllChains', adapterType, dataType })
		throw error
	}
}
