import { RWA_STATS_API_OLD, ZERO_FEE_PERPS } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { fetchAdapterChainChartData, fetchAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import { fetchProtocols } from '~/containers/Protocols/api'
import type { ParentProtocolLite, ProtocolLite, ProtocolsResponse } from '~/containers/Protocols/api.types'
import { TVL_SETTINGS_KEYS, TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { getNDistinctColors, getPercentChange, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { IChainMetadata } from '~/utils/metadata/types'
import { fetchCategoriesSummary, fetchCategoryChart, fetchTagChart } from './api'
import {
	categoriesPageExcludedExtraTvls,
	getProtocolCategoryChartMetrics,
	protocolCategories,
	type ProtocolCategoryChartMetric
} from './constants'
import type {
	IProtocolByCategoryOrTagPageData,
	IProtocolsCategoriesExtraTvlPoint,
	IProtocolsCategoriesPageData,
	IProtocolsCategoriesTableRow,
	IRWAStats
} from './types'

type GetProtocolsByCategoryOrTagParams = {
	chain?: string
	chainMetadata: Record<string, IChainMetadata>
} & (
	| {
			kind: 'category'
			category: string
			tag?: never
			tagCategory?: never
	  }
	| {
			kind: 'tag'
			tag: string
			tagCategory: string
			category?: never
	  }
)

const CHART_METRIC_LABELS: Record<ProtocolCategoryChartMetric, string> = {
	tvl: 'TVL',
	dexVolume: 'DEX Volume',
	perpVolume: 'Perp Volume',
	openInterest: 'Open Interest',
	borrowed: 'Borrowed',
	staking: 'Staking TVL'
}

const CHART_METRIC_SERIES_TYPE: Record<ProtocolCategoryChartMetric, 'line' | 'bar'> = {
	tvl: 'line',
	dexVolume: 'bar',
	perpVolume: 'bar',
	openInterest: 'line',
	borrowed: 'line',
	staking: 'line'
}

const CHART_METRIC_Y_AXIS_INDEX: Record<ProtocolCategoryChartMetric, number> = {
	tvl: 0,
	dexVolume: 1,
	perpVolume: 1,
	openInterest: 1,
	borrowed: 1,
	staking: 0
}

const FALLBACK_CHART_METRICS: ProtocolCategoryChartMetric[] = ['tvl']

const normalizeChartTimestamp = (timestamp: number) => (timestamp < 1e12 ? timestamp * 1e3 : timestamp)

const createTimeSeriesMap = (
	chartData: Array<[number, number | null]> | null | undefined
): Map<number, number | null> => {
	const chartMap = new Map<number, number | null>()

	for (const [timestamp, value] of chartData ?? []) {
		if (!Number.isFinite(timestamp)) continue
		chartMap.set(normalizeChartTimestamp(timestamp), value ?? null)
	}

	return chartMap
}

const createTimeSeriesMapFromRecord = (
	chartData: Record<string | number, number | null> | undefined
): Map<number, number | null> => {
	const chartMap = new Map<number, number | null>()
	if (!chartData) return chartMap

	for (const timestamp in chartData) {
		const numericTimestamp = Number(timestamp)
		if (!Number.isFinite(numericTimestamp)) continue
		chartMap.set(normalizeChartTimestamp(numericTimestamp), chartData[timestamp] ?? null)
	}

	return chartMap
}

const buildCategoryCharts = ({
	metrics,
	tvlChartData,
	dexVolumeChartData,
	perpVolumeChartData,
	openInterestChartData,
	borrowedChartData,
	stakingChartData
}: {
	metrics: ProtocolCategoryChartMetric[]
	tvlChartData: Array<[number, number | null]>
	dexVolumeChartData: Array<[number, number]> | null
	perpVolumeChartData: Array<[number, number]> | null
	openInterestChartData: Array<[number, number]> | null
	borrowedChartData: Record<string | number, number | null> | undefined
	stakingChartData: Record<string | number, number | null> | undefined
}): IProtocolByCategoryOrTagPageData['charts'] => {
	const chartMapsByMetric: Record<ProtocolCategoryChartMetric, Map<number, number | null>> = {
		tvl: createTimeSeriesMap(tvlChartData),
		dexVolume: createTimeSeriesMap(dexVolumeChartData),
		perpVolume: createTimeSeriesMap(perpVolumeChartData),
		openInterest: createTimeSeriesMap(openInterestChartData),
		borrowed: createTimeSeriesMapFromRecord(borrowedChartData),
		staking: createTimeSeriesMapFromRecord(stakingChartData)
	}

	const selectedMetrics = metrics.length > 0 ? metrics : FALLBACK_CHART_METRICS
	const activeMetrics = selectedMetrics.filter(
		(metric) => metric === 'tvl' || (chartMapsByMetric[metric]?.size ?? 0) > 0
	)
	const finalMetrics = activeMetrics.length > 0 ? activeMetrics : FALLBACK_CHART_METRICS

	const timestamps = new Set<number>()
	for (const metric of finalMetrics) {
		for (const timestamp of chartMapsByMetric[metric].keys()) {
			timestamps.add(timestamp)
		}
	}

	const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b)
	const dimensions = ['timestamp', ...finalMetrics.map((metric) => CHART_METRIC_LABELS[metric])]
	const source = sortedTimestamps.map((timestamp) => {
		const row: Record<string, number | null> = { timestamp }
		for (const metric of finalMetrics) {
			const dimension = CHART_METRIC_LABELS[metric]
			row[dimension] = chartMapsByMetric[metric].get(timestamp) ?? null
		}
		return row
	})

	return {
		dataset: {
			source,
			dimensions
		},
		charts: finalMetrics.map((metric, index) => {
			const dimension = CHART_METRIC_LABELS[metric]
			return {
				type: CHART_METRIC_SERIES_TYPE[metric],
				name: dimension,
				encode: { x: 'timestamp', y: dimension },
				color: CHART_COLORS[index],
				yAxisIndex: CHART_METRIC_Y_AXIS_INDEX[metric],
				valueSymbol: '$'
			}
		})
	}
}

type ProtocolTableRow = IProtocolByCategoryOrTagPageData['protocols'][number]

type ProtocolMetricTotals = {
	total24h: number | null
	total7d: number | null
	total30d: number | null
}

type PerpMetricTotals = ProtocolMetricTotals & {
	doublecounted?: boolean
	zeroFeePerp?: boolean
}

type OpenInterestTotals = {
	total24h: number | null
}

type AdapterProtocolData = {
	chains: Array<string>
	fees?: ProtocolMetricTotals
	revenue?: ProtocolMetricTotals
	dexVolume?: ProtocolMetricTotals
	perpVolume?: PerpMetricTotals
	openInterest?: OpenInterestTotals
	optionsPremium?: ProtocolMetricTotals
	optionsNotional?: ProtocolMetricTotals
}

type ChainTvlPoint = {
	tvl: number | null
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
}

export async function getProtocolsByCategoryOrTag(
	params: GetProtocolsByCategoryOrTagParams
): Promise<IProtocolByCategoryOrTagPageData | null> {
	const { chain, chainMetadata } = params
	const category = params.kind === 'category' ? params.category : undefined
	const tag = params.kind === 'tag' ? params.tag : undefined
	// For tag pages, we use the tag's parent category for category-specific logic.
	const effectiveCategory = params.kind === 'category' ? params.category : params.tagCategory
	const chartMetrics = getProtocolCategoryChartMetrics(effectiveCategory)
	const shouldFetchDexVolumeChart = chartMetrics.includes('dexVolume')
	const shouldFetchPerpVolumeChart = chartMetrics.includes('perpVolume')
	const shouldFetchOpenInterestChart = chartMetrics.includes('openInterest')
	const isDexAggregatorCategory = effectiveCategory === 'DEX Aggregator' || effectiveCategory === 'DEX Aggregators'

	const currentChainMetadata: IChainMetadata = chain
		? chainMetadata[slug(chain)]
		: {
				name: 'All',
				fees: true,
				dexs: true,
				perps: true,
				openInterest: true,
				optionsPremiumVolume: true,
				optionsNotionalVolume: true,
				id: 'all'
			}

	if (!currentChainMetadata) {
		return null
	}

	const [
		{ protocols, parentProtocols },
		feesData,
		revenueData,
		dexVolumeData,
		perpVolumeData,
		openInterestData,
		optionsPremiumData,
		optionsNotionalData,
		chartData,
		dexVolumeChartData,
		perpVolumeChartData,
		openInterestChartData,
		chainsByCategoriesOrTags,
		rwaStats
	]: [
		{ protocols: Array<ProtocolLite>; parentProtocols: Array<ParentProtocolLite> },
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		Record<string, Record<string, number | null>>,
		Array<[number, number]> | null,
		Array<[number, number]> | null,
		Array<[number, number]> | null,
		Record<string, Array<string>> | null,
		Record<string, IRWAStats> | null
	] = await Promise.all([
		fetchProtocols(),
		currentChainMetadata?.fees
			? fetchAdapterChainMetrics({
					chain: chain ?? 'All',
					adapterType: 'fees'
				})
			: null,
		currentChainMetadata?.fees
			? fetchAdapterChainMetrics({
					chain: chain ?? 'All',
					adapterType: 'fees',
					dataType: 'dailyRevenue'
				})
			: null,
		currentChainMetadata?.dexs &&
		effectiveCategory &&
		['Dexs', 'DEX Aggregator', 'DEX Aggregators', 'Prediction Market', 'Crypto Card Issuer'].includes(effectiveCategory)
			? fetchAdapterChainMetrics({
					chain: chain ?? 'All',
					adapterType: isDexAggregatorCategory ? 'aggregators' : 'dexs'
				})
			: null,
		currentChainMetadata?.perps && effectiveCategory && ['Derivatives', 'Interface'].includes(effectiveCategory)
			? fetchAdapterChainMetrics({
					chain: chain ?? 'All',
					adapterType: 'derivatives'
				})
			: null,
		currentChainMetadata?.openInterest &&
		effectiveCategory &&
		['Derivatives', 'Prediction Market'].includes(effectiveCategory)
			? fetchAdapterChainMetrics({
					chain: chain ?? 'All',
					adapterType: 'open-interest',
					dataType: 'openInterestAtEnd'
				}).catch((err) => {
					console.log(err)
					return null
				})
			: null,
		currentChainMetadata?.optionsPremiumVolume && effectiveCategory === 'Options'
			? fetchAdapterChainMetrics({
					chain: chain ?? 'All',
					adapterType: 'options',
					dataType: 'dailyPremiumVolume'
				})
			: null,
		currentChainMetadata?.optionsNotionalVolume && effectiveCategory === 'Options'
			? fetchAdapterChainMetrics({
					chain: chain ?? 'All',
					adapterType: 'options',
					dataType: 'dailyNotionalVolume'
				})
			: null,
		tag ? fetchTagChart({ tag, chain }) : fetchCategoryChart({ category: category ?? '', chain }),
		currentChainMetadata?.dexs && shouldFetchDexVolumeChart
			? fetchAdapterChainChartData({
					chain: chain ?? 'All',
					adapterType: isDexAggregatorCategory ? 'aggregators' : 'dexs'
				}).catch(() => null)
			: null,
		currentChainMetadata?.perps && shouldFetchPerpVolumeChart
			? fetchAdapterChainChartData({
					chain: chain ?? 'All',
					adapterType: 'derivatives'
				}).catch(() => null)
			: null,
		currentChainMetadata?.openInterest && shouldFetchOpenInterestChart
			? fetchAdapterChainChartData({
					chain: chain ?? 'All',
					adapterType: 'open-interest',
					dataType: 'openInterestAtEnd'
				}).catch(() => null)
			: null,
		tag
			? fetchJson('https://api.llama.fi/lite/chains-by-tags').catch(() => null)
			: fetchJson('https://api.llama.fi/lite/chains-by-categories').catch(() => null),
		effectiveCategory === 'RWA' ? fetchJson(RWA_STATS_API_OLD) : null
	])

	const chainsLookupKey = tag ?? category
	const chains = chainsLookupKey ? (chainsByCategoriesOrTags?.[chainsLookupKey] ?? []) : []

	const adapterDataStore: Record<string, AdapterProtocolData> = {}
	const getOrCreateAdapterProtocolData = ({
		protocolId,
		protocolChains
	}: {
		protocolId: string
		protocolChains: Array<string>
	}): AdapterProtocolData => {
		const existingData = adapterDataStore[protocolId]
		if (existingData != null) {
			existingData.chains = Array.from(new Set([...existingData.chains, ...protocolChains]))
			return existingData
		}

		const newData: AdapterProtocolData = {
			chains: Array.from(new Set(protocolChains))
		}
		adapterDataStore[protocolId] = newData
		return newData
	}

	for (const protocol of feesData?.protocols ?? []) {
		const adapterData = getOrCreateAdapterProtocolData({
			protocolId: protocol.defillamaId,
			protocolChains: protocol.chains
		})
		adapterData.fees = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null
		}
	}

	for (const protocol of revenueData?.protocols ?? []) {
		const adapterData = getOrCreateAdapterProtocolData({
			protocolId: protocol.defillamaId,
			protocolChains: protocol.chains
		})
		adapterData.revenue = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null
		}
	}

	for (const protocol of dexVolumeData?.protocols ?? []) {
		const adapterData = getOrCreateAdapterProtocolData({
			protocolId: protocol.defillamaId,
			protocolChains: protocol.chains
		})
		adapterData.dexVolume = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null
		}
	}

	for (const protocol of perpVolumeData?.protocols ?? []) {
		const adapterData = getOrCreateAdapterProtocolData({
			protocolId: protocol.defillamaId,
			protocolChains: protocol.chains
		})
		adapterData.perpVolume = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			...(protocol.doublecounted ? { doublecounted: protocol.doublecounted } : {}),
			...(ZERO_FEE_PERPS.has(protocol.displayName) ? { zeroFeePerp: true } : {})
		}
	}

	for (const protocol of openInterestData?.protocols ?? []) {
		const adapterData = getOrCreateAdapterProtocolData({
			protocolId: protocol.defillamaId,
			protocolChains: protocol.chains
		})
		adapterData.openInterest = {
			total24h: protocol.total24h ?? null
		}
	}

	for (const protocol of optionsPremiumData?.protocols ?? []) {
		const adapterData = getOrCreateAdapterProtocolData({
			protocolId: protocol.defillamaId,
			protocolChains: protocol.chains
		})
		adapterData.optionsPremium = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null
		}
	}

	for (const protocol of optionsNotionalData?.protocols ?? []) {
		const adapterData = getOrCreateAdapterProtocolData({
			protocolId: protocol.defillamaId,
			protocolChains: protocol.chains
		})
		adapterData.optionsNotional = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null
		}
	}

	const protocolsStore: Record<string, ProtocolTableRow> = {}
	const parentProtocolsStore: Record<string, Array<ProtocolTableRow>> = {}

	for (const protocol of protocols) {
		const isProtocolInCategoryOrTag = tag ? (protocol.tags ?? []).includes(tag) : protocol.category == category
		if (!isProtocolInCategoryOrTag) continue

		let tvl: number | null = null
		const extraTvls: Record<string, number> = {}
		const chainTvlEntries = Object.entries(protocol.chainTvls) as Array<[string, ChainTvlPoint]>

		if (chain) {
			for (const [chainTvlKey, chainTvlData] of chainTvlEntries) {
				const chainTvlValue = chainTvlData.tvl
				if (chainTvlValue == null) continue

				const chainName = chainTvlKey.split('-')[0]
				if (chainName !== currentChainMetadata.name) continue

				const extraKey = chainTvlKey.split('-')[1]
				if (extraKey === 'excludeParent') {
					extraTvls.excludeParent = (extraTvls.excludeParent ?? 0) + chainTvlValue
					continue
				}

				if (
					extraKey != null &&
					(['doublecounted', 'liquidstaking', 'dcAndLsOverlap', 'offers'].includes(extraKey) ||
						!TVL_SETTINGS_KEYS_SET.has(extraKey))
				) {
					continue
				}

				if (extraKey != null && TVL_SETTINGS_KEYS_SET.has(extraKey)) {
					extraTvls[extraKey] = (extraTvls[extraKey] ?? 0) + chainTvlValue
					continue
				}

				tvl = (tvl ?? 0) + chainTvlValue
			}
		} else {
			for (const [chainTvlKey, chainTvlData] of chainTvlEntries) {
				const chainTvlValue = chainTvlData.tvl
				if (chainTvlValue == null) continue

				if (chainTvlKey === 'excludeParent') {
					extraTvls[chainTvlKey] = (extraTvls[chainTvlKey] ?? 0) + chainTvlValue
					continue
				}

				if (
					['doublecounted', 'liquidstaking', 'dcAndLsOverlap', 'offers'].includes(chainTvlKey) ||
					chainTvlKey.includes('-')
				) {
					continue
				}

				if (TVL_SETTINGS_KEYS_SET.has(chainTvlKey)) {
					extraTvls[chainTvlKey] = (extraTvls[chainTvlKey] ?? 0) + chainTvlValue
					continue
				}

				tvl = (tvl ?? 0) + chainTvlValue
			}
		}

		const borrowed = extraTvls.borrowed ?? null
		const supplied = borrowed && tvl != null && tvl > 0 ? borrowed + tvl : null
		const suppliedTvl = supplied && tvl != null ? Number((supplied / tvl).toFixed(2)) : null
		const adapterProtocolData = adapterDataStore[protocol.defillamaId]

		const finalData: ProtocolTableRow = {
			name: protocol.name,
			slug: slug(protocol.name),
			logo: tokenIconUrl(protocol.name),
			chains: Array.from(new Set([...(adapterProtocolData?.chains ?? []), ...protocol.chains])),
			tvl,
			extraTvls,
			mcap: protocol.mcap ?? null,
			...(effectiveCategory && ['Lending'].includes(effectiveCategory) ? { borrowed, supplied, suppliedTvl } : {}),
			fees: adapterProtocolData?.fees ?? null,
			revenue: adapterProtocolData?.revenue ?? null,
			dexVolume: adapterProtocolData?.dexVolume ?? null,
			perpVolume: adapterProtocolData?.perpVolume ?? null,
			openInterest: adapterProtocolData?.openInterest ?? null,
			optionsPremium: adapterProtocolData?.optionsPremium ?? null,
			optionsNotional: adapterProtocolData?.optionsNotional ?? null,
			tags: protocol.tags ?? [],
			...(effectiveCategory === 'RWA' ? { rwaStats: rwaStats?.[protocol.defillamaId] ?? null } : {})
		}

		if (protocol.parentProtocol) {
			parentProtocolsStore[protocol.parentProtocol] = [
				...(parentProtocolsStore[protocol.parentProtocol] ?? []),
				finalData
			]
		} else {
			protocolsStore[protocol.defillamaId] = finalData
		}
	}

	const sumMetricTotals = ({
		rows,
		selector
	}: {
		rows: Array<ProtocolTableRow>
		selector: (row: ProtocolTableRow) => ProtocolMetricTotals | null | undefined
	}): ProtocolMetricTotals => {
		return rows.reduce<ProtocolMetricTotals>(
			(acc, row) => ({
				total24h: (acc.total24h ?? 0) + (selector(row)?.total24h ?? 0),
				total7d: (acc.total7d ?? 0) + (selector(row)?.total7d ?? 0),
				total30d: (acc.total30d ?? 0) + (selector(row)?.total30d ?? 0)
			}),
			{
				total24h: 0,
				total7d: 0,
				total30d: 0
			}
		)
	}

	const finalProtocols: Array<ProtocolTableRow> = Object.values(protocolsStore)
	for (const parentProtocol of parentProtocols) {
		const childProtocols = parentProtocolsStore[parentProtocol.id]
		if (childProtocols == null) continue

		if (childProtocols.length === 1) {
			finalProtocols.push(childProtocols[0])
			continue
		}

		let tvl = childProtocols.some((row) => row.tvl != null)
			? childProtocols.reduce((acc, row) => acc + (row.tvl ?? 0), 0)
			: null
		const extraTvls = childProtocols.reduce<Record<string, number>>((acc, row) => {
			for (const [extraTvlKey, extraTvlValue] of Object.entries(row.extraTvls)) {
				acc[extraTvlKey] = (acc[extraTvlKey] ?? 0) + extraTvlValue
			}
			return acc
		}, {})

		if (extraTvls.excludeParent != null && tvl != null) {
			tvl = Math.max(0, tvl - extraTvls.excludeParent)
		}

		const borrowed = extraTvls.borrowed ?? null
		const supplied = borrowed && tvl != null && tvl > 0 ? borrowed + tvl : null
		const suppliedTvl = supplied && tvl != null ? Number((supplied / tvl).toFixed(2)) : null
		const fees = sumMetricTotals({ rows: childProtocols, selector: (row) => row.fees })
		const revenue = sumMetricTotals({ rows: childProtocols, selector: (row) => row.revenue })
		const dexVolume = sumMetricTotals({ rows: childProtocols, selector: (row) => row.dexVolume })
		const perpVolume = sumMetricTotals({ rows: childProtocols, selector: (row) => row.perpVolume })
		const openInterest = childProtocols.reduce<OpenInterestTotals>(
			(acc, row) => ({
				total24h: (acc.total24h ?? 0) + (row.openInterest?.total24h ?? 0)
			}),
			{
				total24h: 0
			}
		)
		const optionsPremium = sumMetricTotals({ rows: childProtocols, selector: (row) => row.optionsPremium })
		const optionsNotional = sumMetricTotals({ rows: childProtocols, selector: (row) => row.optionsNotional })

		const hasRWAStats = childProtocols.some((row) => row.rwaStats != null)
		const aggregatedRwaStats: IRWAStats = {
			volumeUsd1d: 0,
			volumeUsd7d: 0,
			tvlUsd: 0,
			symbols: []
		}

		for (const childProtocol of childProtocols) {
			if (childProtocol.rwaStats == null) continue
			aggregatedRwaStats.volumeUsd1d += childProtocol.rwaStats.volumeUsd1d
			aggregatedRwaStats.volumeUsd7d += childProtocol.rwaStats.volumeUsd7d
			aggregatedRwaStats.tvlUsd += childProtocol.rwaStats.tvlUsd
			aggregatedRwaStats.symbols = Array.from(
				new Set([...aggregatedRwaStats.symbols, ...childProtocol.rwaStats.symbols])
			)
		}

		finalProtocols.push({
			name: parentProtocol.name,
			slug: slug(parentProtocol.name),
			logo: tokenIconUrl(parentProtocol.name),
			chains: parentProtocol.chains,
			mcap: parentProtocol.mcap ?? null,
			tvl,
			...(effectiveCategory && ['Lending'].includes(effectiveCategory) ? { borrowed, supplied, suppliedTvl } : {}),
			extraTvls,
			fees: fees.total24h == 0 && fees.total7d == 0 && fees.total30d == 0 ? null : fees,
			revenue: revenue.total24h == 0 && revenue.total7d == 0 && revenue.total30d == 0 ? null : revenue,
			dexVolume: dexVolume.total24h == 0 && dexVolume.total7d == 0 && dexVolume.total30d == 0 ? null : dexVolume,
			perpVolume: perpVolume.total24h == 0 && perpVolume.total7d == 0 && perpVolume.total30d == 0 ? null : perpVolume,
			openInterest: openInterest.total24h == 0 ? null : openInterest,
			optionsPremium:
				optionsPremium.total24h == 0 && optionsPremium.total7d == 0 && optionsPremium.total30d == 0
					? null
					: optionsPremium,
			optionsNotional:
				optionsNotional.total24h == 0 && optionsNotional.total7d == 0 && optionsNotional.total30d == 0
					? null
					: optionsNotional,
			subRows: childProtocols.toSorted((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0)),
			tags: Array.from(new Set(childProtocols.flatMap((row) => row.tags ?? []))),
			...(hasRWAStats ? { rwaStats: aggregatedRwaStats } : {})
		})
	}

	const tvlChart: Array<[number, number | null]> = []
	let extraTvlCharts: Record<string, Record<string | number, number | null>> = {}
	for (const chartType in chartData) {
		if (['doublecounted', 'liquidstaking', 'dcAndLsOverlap'].includes(chartType)) continue

		if (chartType === 'tvl') {
			for (const date in chartData[chartType]) {
				tvlChart.push([+date * 1e3, chartData[chartType][date] ?? null])
			}
		} else {
			if (!extraTvlCharts[chartType]) {
				extraTvlCharts[chartType] = {}
			}
			for (const date in chartData[chartType]) {
				extraTvlCharts[chartType][+date * 1e3] = chartData[chartType][date] ?? null
			}
		}
	}

	const startIndex = tvlChart.findIndex(([, tvl]) => tvl != null)
	const filteredTvlChart = startIndex >= 0 ? tvlChart.slice(startIndex) : tvlChart
	const categoryCharts = buildCategoryCharts({
		metrics: chartMetrics,
		tvlChartData: filteredTvlChart,
		dexVolumeChartData,
		perpVolumeChartData,
		openInterestChartData,
		borrowedChartData: extraTvlCharts.borrowed,
		stakingChartData: extraTvlCharts.staking
	})

	let fees7d = 0
	let revenue7d = 0
	let dexVolume7d = 0
	let perpVolume7d = 0
	let openInterest = 0
	let optionsPremium7d = 0
	let optionsNotional7d = 0

	for (const protocol of finalProtocols) {
		fees7d += protocol.fees?.total7d ?? 0
		revenue7d += protocol.revenue?.total7d ?? 0
		dexVolume7d += protocol.dexVolume?.total7d ?? 0
		perpVolume7d += protocol.perpVolume?.total7d ?? 0
		openInterest += protocol.openInterest?.total24h ?? 0
		optionsPremium7d += protocol.optionsPremium?.total7d ?? 0
		optionsNotional7d += protocol.optionsNotional?.total7d ?? 0
	}

	return {
		charts: categoryCharts,
		chain: currentChainMetadata?.name ?? 'All',
		protocols: (chain
			? finalProtocols.filter((p) => p.chains.includes(currentChainMetadata.name))
			: finalProtocols
		).sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0)),
		category: category ?? null,
		tag: tag ?? null,
		effectiveCategory,
		chains: [
			{ label: 'All', to: `/protocols/${slug(category ?? tag)}` },
			...chains.map((c) => ({ label: c, to: `/protocols/${slug(category ?? tag)}/${slug(c)}` }))
		],
		fees7d: fees7d > 0 ? fees7d : null,
		revenue7d: revenue7d > 0 ? revenue7d : null,
		dexVolume7d: dexVolume7d > 0 ? dexVolume7d : null,
		perpVolume7d: perpVolume7d > 0 ? perpVolume7d : null,
		openInterest: openInterest > 0 ? openInterest : null,
		optionsPremium7d: optionsPremium7d > 0 ? optionsPremium7d : null,
		optionsNotional7d: optionsNotional7d > 0 ? optionsNotional7d : null,
		extraTvlCharts
	}
}

type CategoriesApiChartMetrics = Record<string, number | null | undefined>
type CategoriesApiChart = Record<string, Record<string, CategoriesApiChartMetrics>>

type CategoriesApiResponse = {
	chart: CategoriesApiChart | null
	categories: Array<string> | Record<string, unknown> | null
}

type CategoryAggregateRow = {
	name: string
	protocols: number
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	revenue: number
	extraTvls: Record<string, IProtocolsCategoriesExtraTvlPoint>
}

const CATEGORIES_PAGE_INCLUDED_EXTRA_TVL_KEYS = TVL_SETTINGS_KEYS.filter(
	(key) => !categoriesPageExcludedExtraTvls.has(key)
)

function createEmptyExtraTvlPoint(): IProtocolsCategoriesExtraTvlPoint {
	return {
		tvl: 0,
		tvlPrevDay: 0,
		tvlPrevWeek: 0,
		tvlPrevMonth: 0
	}
}

function createEmptyExtraTvls(): Record<string, IProtocolsCategoriesExtraTvlPoint> {
	const extraTvls: Record<string, IProtocolsCategoriesExtraTvlPoint> = {}
	for (const key of CATEGORIES_PAGE_INCLUDED_EXTRA_TVL_KEYS) {
		extraTvls[key] = createEmptyExtraTvlPoint()
	}
	return extraTvls
}

function createCategoryAggregateRow(name: string): CategoryAggregateRow {
	return {
		name,
		protocols: 0,
		tvl: 0,
		tvlPrevDay: 0,
		tvlPrevWeek: 0,
		tvlPrevMonth: 0,
		revenue: 0,
		extraTvls: createEmptyExtraTvls()
	}
}

function toCategoryTableRow({
	row,
	description,
	subRows
}: {
	row: CategoryAggregateRow
	description: string
	subRows?: Array<IProtocolsCategoriesTableRow>
}): IProtocolsCategoriesTableRow {
	const categoryRow: IProtocolsCategoriesTableRow = {
		...row,
		change_1d: getPercentChange(row.tvl, row.tvlPrevDay),
		change_7d: getPercentChange(row.tvl, row.tvlPrevWeek),
		change_1m: getPercentChange(row.tvl, row.tvlPrevMonth),
		description
	}

	if (subRows != null && subRows.length > 0) {
		categoryRow.subRows = subRows
	}

	return categoryRow
}

function getCategoryKeysFromApi(categories: CategoriesApiResponse['categories']): Array<string> {
	if (Array.isArray(categories)) {
		return categories.filter((categoryName): categoryName is string => typeof categoryName === 'string')
	}

	if (categories != null && typeof categories === 'object') {
		const categoryKeys: string[] = []
		for (const categoryName in categories) {
			categoryKeys.push(categoryName)
		}
		return categoryKeys
	}

	return []
}

export async function getProtocolsCategoriesPageData(): Promise<IProtocolsCategoriesPageData> {
	const [{ protocols }, revenueData, { chart, categories }]: [
		ProtocolsResponse,
		IAdapterChainMetrics | null,
		CategoriesApiResponse
	] = await Promise.all([
		fetchProtocols(),
		fetchAdapterChainMetrics({
			adapterType: 'fees',
			chain: 'All',
			dataType: 'dailyRevenue'
		}).catch(() => null),
		fetchCategoriesSummary()
	])

	const categoryDescriptions = new Map<string, string>()
	for (const [name, data] of Object.entries(protocolCategories)) {
		categoryDescriptions.set(name, data.description)
	}

	const revenueByProtocol: Record<string, number> = {}
	for (const protocol of revenueData?.protocols ?? []) {
		revenueByProtocol[protocol.defillamaId] = protocol.total24h ?? 0
	}

	const categoryRows = new Map<string, CategoryAggregateRow>()
	const tagRowsByCategory = new Map<string, Map<string, CategoryAggregateRow>>()

	const getOrCreateCategoryRow = (categoryName: string): CategoryAggregateRow => {
		const existingRow = categoryRows.get(categoryName)
		if (existingRow != null) return existingRow

		const newRow = createCategoryAggregateRow(categoryName)
		categoryRows.set(categoryName, newRow)
		return newRow
	}

	const getOrCreateTagRow = ({
		categoryName,
		tagName
	}: {
		categoryName: string
		tagName: string
	}): CategoryAggregateRow => {
		const tagsByName = tagRowsByCategory.get(categoryName) ?? new Map<string, CategoryAggregateRow>()
		if (!tagRowsByCategory.has(categoryName)) {
			tagRowsByCategory.set(categoryName, tagsByName)
		}

		const existingRow = tagsByName.get(tagName)
		if (existingRow != null) return existingRow

		const newRow = createCategoryAggregateRow(tagName)
		tagsByName.set(tagName, newRow)
		return newRow
	}

	for (const protocol of protocols) {
		const categoryName = protocol.category
		if (!categoryName) continue
		const protocolRevenue = revenueByProtocol[protocol.defillamaId] ?? 0
		const protocolTvl = protocol.tvl ?? 0
		const protocolTvlPrevDay = protocol.tvlPrevDay ?? 0
		const protocolTvlPrevWeek = protocol.tvlPrevWeek ?? 0
		const protocolTvlPrevMonth = protocol.tvlPrevMonth ?? 0

		const categoryRow = getOrCreateCategoryRow(categoryName)
		categoryRow.protocols += 1
		categoryRow.tvl += protocolTvl
		categoryRow.tvlPrevDay += protocolTvlPrevDay
		categoryRow.tvlPrevWeek += protocolTvlPrevWeek
		categoryRow.tvlPrevMonth += protocolTvlPrevMonth
		categoryRow.revenue += protocolRevenue

		const protocolTags = protocol.tags ?? []
		for (const tagName of protocolTags) {
			const tagRow = getOrCreateTagRow({ categoryName, tagName })
			tagRow.protocols += 1
			tagRow.tvl += protocolTvl
			tagRow.tvlPrevDay += protocolTvlPrevDay
			tagRow.tvlPrevWeek += protocolTvlPrevWeek
			tagRow.tvlPrevMonth += protocolTvlPrevMonth
			tagRow.revenue += protocolRevenue
		}

		for (const extraTvlKey of CATEGORIES_PAGE_INCLUDED_EXTRA_TVL_KEYS) {
			const protocolExtraTvl = protocol.chainTvls[extraTvlKey]
			if (protocolExtraTvl == null) continue

			const categoryExtraTvl = categoryRow.extraTvls[extraTvlKey]
			categoryExtraTvl.tvl += protocolExtraTvl.tvl ?? 0
			categoryExtraTvl.tvlPrevDay += protocolExtraTvl.tvlPrevDay ?? 0
			categoryExtraTvl.tvlPrevWeek += protocolExtraTvl.tvlPrevWeek ?? 0
			categoryExtraTvl.tvlPrevMonth += protocolExtraTvl.tvlPrevMonth ?? 0

			for (const tagName of protocolTags) {
				const tagRow = getOrCreateTagRow({ categoryName, tagName })
				const tagExtraTvl = tagRow.extraTvls[extraTvlKey]
				tagExtraTvl.tvl += protocolExtraTvl.tvl ?? 0
				tagExtraTvl.tvlPrevDay += protocolExtraTvl.tvlPrevDay ?? 0
				tagExtraTvl.tvlPrevWeek += protocolExtraTvl.tvlPrevWeek ?? 0
				tagExtraTvl.tvlPrevMonth += protocolExtraTvl.tvlPrevMonth ?? 0
			}
		}
	}

	const categoryKeysFromApi = getCategoryKeysFromApi(categories)
	const fallbackCategoryKeysFromRows = Array.from(categoryRows.keys())
	const fallbackCategoryKeysFromChart = Object.values(chart ?? {}).flatMap((chartByCategory) => {
		const categoryKeys: string[] = []
		for (const categoryName in chartByCategory) {
			categoryKeys.push(categoryName)
		}
		return categoryKeys
	})
	const categoryKeys = Array.from(
		new Set(
			categoryKeysFromApi.length > 0
				? categoryKeysFromApi
				: [...fallbackCategoryKeysFromRows, ...fallbackCategoryKeysFromChart]
		)
	)
	for (const categoryName of categoryKeys) {
		if (!categoryRows.has(categoryName)) {
			categoryRows.set(categoryName, createCategoryAggregateRow(categoryName))
		}
	}

	const allColors = getNDistinctColors(categoryKeys.length)
	const categoryColors: Record<string, string> = {}
	for (const [index, categoryName] of categoryKeys.entries()) {
		categoryColors[categoryName] = allColors[index] ?? '#999999'
	}

	const tableData: Array<IProtocolsCategoriesTableRow> = []
	for (const categoryName of categoryKeys) {
		const categoryRow = categoryRows.get(categoryName)
		if (categoryRow == null) continue

		const tagRows = tagRowsByCategory.get(categoryName)
		const subRows: Array<IProtocolsCategoriesTableRow> = []
		for (const [tagName, tagRow] of tagRows?.entries() ?? []) {
			subRows.push(
				toCategoryTableRow({
					row: tagRow,
					description: categoryDescriptions.get(tagName) ?? ''
				})
			)
		}

		tableData.push(
			toCategoryTableRow({
				row: categoryRow,
				description: categoryDescriptions.get(categoryName) ?? '',
				subRows
			})
		)
	}

	const extraTvlCharts: IProtocolsCategoriesPageData['extraTvlCharts'] = {}
	for (const categoryName of categoryKeys) {
		extraTvlCharts[categoryName] = {}
		for (const extraTvlKey of CATEGORIES_PAGE_INCLUDED_EXTRA_TVL_KEYS) {
			extraTvlCharts[categoryName][extraTvlKey] = {}
		}
	}

	const chartSource: IProtocolsCategoriesPageData['chartSource'] = []
	for (const [date, chartByCategory] of Object.entries(chart ?? {})) {
		const timestamp = Number(date) * 1e3
		if (!Number.isFinite(timestamp)) continue

		const chartRow: IProtocolsCategoriesPageData['chartSource'][number] = { timestamp }
		for (const categoryName of categoryKeys) {
			const categoryChartMetrics = chartByCategory?.[categoryName]
			const tvlValue = categoryChartMetrics?.tvl
			chartRow[categoryName] = typeof tvlValue === 'number' ? tvlValue : null

			for (const extraTvlKey of CATEGORIES_PAGE_INCLUDED_EXTRA_TVL_KEYS) {
				const rawExtraValue = categoryChartMetrics?.[extraTvlKey]
				const extraValue = typeof rawExtraValue === 'number' ? rawExtraValue : 0
				const currentValue = extraTvlCharts[categoryName][extraTvlKey][timestamp] ?? 0
				extraTvlCharts[categoryName][extraTvlKey][timestamp] = currentValue + extraValue
			}
		}
		chartSource.push(chartRow)
	}
	chartSource.sort((a, b) => a.timestamp - b.timestamp)

	return {
		categories: categoryKeys,
		tableData: tableData.toSorted((a, b) => b.tvl - a.tvl),
		chartSource,
		categoryColors,
		extraTvlCharts
	}
}
