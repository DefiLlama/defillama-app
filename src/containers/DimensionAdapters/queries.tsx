import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { REV_PROTOCOLS, V2_SERVER_URL, ZERO_FEE_PERPS } from '~/constants'
import { getDimensionAdapterChainEarningsOverview } from '~/containers/Incentives/queries'
import { fetchProtocols } from '~/containers/Protocols/api'
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

const toFiniteNumber = (value: unknown): number | null => {
	if (value == null) return null
	const num = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(num) ? num : null
}

const getWeightedChange = (
	protocols: Array<{
		total24h: number | null
		total7d: number | null
		total30d: number | null
		change_1d?: number | null
		change_7d?: number | null
		change_1m?: number | null
		change_7dover7d?: number | null
	}>,
	changeKey: 'change_1d' | 'change_7d' | 'change_1m',
	weightKey: 'total24h' | 'total7d' | 'total30d'
) => {
	let numerator = 0
	let denominator = 0

	for (const protocol of protocols) {
		const change =
			changeKey === 'change_7d'
				? toFiniteNumber(protocol.change_7d ?? protocol.change_7dover7d)
				: toFiniteNumber(protocol[changeKey])
		const weight = toFiniteNumber(protocol[weightKey])
		if (change == null || weight == null || weight <= 0) continue
		numerator += change * weight
		denominator += weight
	}

	return denominator > 0 ? numerator / denominator : null
}

function buildChainsChartData({
	rawChartData,
	allChains
}: {
	rawChartData: Array<[number, Record<string, number>]>
	allChains: string[]
}): MultiSeriesChart2Dataset {
	const chartDimensions = ['timestamp', ...allChains]
	return {
		dimensions: chartDimensions,
		source: rawChartData
			.map(([timestamp, chainValues]) => {
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

				return row
			})
			.sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
	}
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
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			total1y: protocol.total1y ?? null,
			totalAllTime: protocol.totalAllTime ?? null,
			change_1d: protocol.change_1d ?? null,
			change_7d: protocol.change_7d ?? null,
			change_1m: protocol.change_1m ?? null,
			change_7dover7d: protocol.change_7dover7d ?? null,
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
			protocols[protocol] = {
				...parentProtocols[protocol][0],
				name: protocol,
				slug: slug(protocol),
				breakdownAliases: Array.from(
					new Set([parentProtocols[protocol][0].name, ...(parentProtocols[protocol][0].breakdownAliases ?? [])])
				).filter((alias) => alias !== protocol)
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
		let warning: string | null = null
		for (const p of parentProtocols[protocol]) {
			if (p.warning) {
				warning = p.warning
				break
			}
		}
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
		const change_1d = getWeightedChange(parentProtocols[protocol], 'change_1d', 'total24h')
		const change_7d = getWeightedChange(parentProtocols[protocol], 'change_7d', 'total7d')
		const change_1m = getWeightedChange(parentProtocols[protocol], 'change_1m', 'total30d')

		let topProtocol = parentProtocols[protocol][0]
		for (const p of parentProtocols[protocol]) {
			if ((p.total24h ?? 0) > (topProtocol.total24h ?? 0)) {
				topProtocol = p
			}
		}

		const breakdownAliasSet = new Set<string>()
		for (const childProtocol of parentProtocols[protocol]) {
			if (childProtocol.name !== protocol) breakdownAliasSet.add(childProtocol.name)
			for (const alias of childProtocol.breakdownAliases ?? []) {
				if (alias !== protocol) breakdownAliasSet.add(alias)
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
			...(change_1d != null ? { change_1d } : {}),
			...(change_7d != null ? { change_7d } : {}),
			...(change_1m != null ? { change_1m } : {}),
			mcap: protocolsMcap[protocol] ?? null,
			breakdownAliases: Array.from(breakdownAliasSet),
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
	dataType: `${ADAPTER_DATA_TYPES}`
	chainMetadata: Record<string, IChainMetadata>
}): Promise<IChainsByAdapterPageData> => {
	try {
		const allChainsSet = new Set<string>()

		const chainLevelKey = dataType === 'dailyRevenue' ? 'chainRevenue' : 'chainFees'
		for (const chain in chainMetadata) {
			const currentChainMetadata = chainMetadata[chain]
			if (!currentChainMetadata[chainLevelKey]) continue
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
			const sType = getChainMetadataKey(adapterType, dataType)
			if (!sType || !currentChainMetadata[sType]) continue
			allChains.push(currentChainMetadata.name)
		}

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
			fetchJson<Array<[number, Record<string, number>]>>(
				`${V2_SERVER_URL}/chart/${adapterType}/chain-breakdown${dataType ? `?dataType=${dataType}` : ''}`
			).catch(() => []),
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
		const chartData = buildChainsChartData({ rawChartData, allChains })

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
				const warning =
					chain === 'Canton' &&
					(dataType === ADAPTER_DATA_TYPES.DAILY_FEES || dataType === ADAPTER_DATA_TYPES.DAILY_REVENUE)
						? CANTON_INCENTIVES_WARNING
						: null
				return {
					name: chain,
					logo: chainIconUrl(chain),
					total24h: chainsData[chain]?.['24h'] ?? null,
					total7d: chainsData[chain]?.['7d'] ?? null,
					total30d: chainsData[chain]?.['30d'] ?? null,
					...(warning ? { warning } : {}),
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
