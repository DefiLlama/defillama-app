import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { V2_SERVER_URL } from '~/constants'
import { getDimensionAdapterChainEarningsOverview } from '~/containers/Incentives/queries'
import { fetchProtocols } from '~/containers/ProtocolLists/api'
import type { ChainNativeFeeRevenueRankingDataType } from '~/metrics/definitions'
import { feeRevenueMetrics, getChainNativeFeeRevenueRankingMetric } from '~/metrics/feesRevenue'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { chainIconUrl } from '~/utils/icons'
import type { IChainMetadata } from '~/utils/metadata/types'
import { recordRuntimeError } from '~/utils/telemetry'
import { buildAdapterByChainReadModel } from './adapterByChainReadModel'
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
	getChainMetadataKey,
	REV_PROTOCOLS
} from './constants'
import type {
	IAdapterByChainPageData,
	IAdapterChainOverview,
	IChainsByAdapterPageData,
	IChainsByREVPageData
} from './types'
import { buildAdapterByChainChartDataset } from './utils'

const FEES_CHART_ROUTES = new Set(['fees', 'revenue', 'holders-revenue'])
const CANTON_INCENTIVES_WARNING =
	'Canton is currently distributing massive incentives, so its fees and revenue should be interpreted with that context.'

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
	const rankBy = route === 'pf' || route === 'ps' ? 'pfOrPs' : 'total24h'
	const cantonIncentivesWarning = metricName === 'Fees' || metricName === 'Revenue' ? CANTON_INCENTIVES_WARNING : null

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

	const readModel = buildAdapterByChainReadModel({
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
	})

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
		protocols: readModel.protocols,
		categories: readModel.categories,
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
		openInterest: readModel.openInterest,
		activeLiquidity: readModel.activeLiquidity
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
