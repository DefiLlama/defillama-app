import { fetchLlamaConfig } from '~/api'
import {
	formatPeggedAssetsData,
	formatPeggedChainsData,
	getPrevStablecoinTotalFromChart,
	buildStablecoinChartData,
	getStablecoinDominance,
	getStablecoinMcapStatsFromTotals,
	getStablecoinTopTokenFromChartData,
	type StablecoinChartDataPoint
} from '~/containers/Stablecoins/utils'
import { getPercentChange, slug } from '~/utils'
import { postRuntimeLogs } from '~/utils/async'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'
import {
	fetchStablecoinAssetApi,
	fetchStablecoinAssetsApi,
	fetchStablecoinBridgeInfoApi,
	fetchStablecoinChartAllApi,
	fetchStablecoinChartApi,
	fetchStablecoinDominanceAllApi,
	fetchStablecoinPeggedConfigApi,
	fetchStablecoinPricesApi,
	fetchStablecoinRatesApi,
	fetchStablecoinRecentCoinsDataApi
} from './api'
import type { StablecoinChainBalanceToken, StablecoinChartPoint, StablecoinListAsset } from './api.types'
import type {
	PeggedAssetPageProps,
	PeggedAssetsForChartInput,
	PeggedAssetsInput,
	PeggedChainMcapSummary,
	PeggedChainsPageData,
	PeggedOverviewPageData,
	StablecoinBridges,
	StablecoinOverviewChartInputs,
	StablecoinsGlobalDataCache
} from './types'

const STABLECOINS_CACHE_TTL = 60 * 60 * 24
const STABLECOINS_CACHE_PREFIX = 'stablecoins'
const ONE_DAY_SECONDS = 24 * 3600

async function withStablecoinsCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const cacheKey = `${STABLECOINS_CACHE_PREFIX}:${key}`

	try {
		const data = await fetcher()
		await setObjectCache(cacheKey, data, STABLECOINS_CACHE_TTL)
		return data
	} catch (error) {
		const cached = await getObjectCache(cacheKey)
		if (cached !== null) {
			postRuntimeLogs(`[stablecoins] [cache] [fallback] < ${cacheKey} >`)
			return cached as T
		}

		throw error
	}
}

const getStablecoinAssets = () =>
	withStablecoinsCache('pegged-assets', () =>
		fetchStablecoinAssetsApi().then(({ peggedAssets, chains }) => ({
			protocolsDict: peggedAssets.reduce(
				(acc, curr) => {
					acc[slug(curr.name)] = curr
					return acc
				},
				{} as Record<string, StablecoinListAsset>
			),
			peggedAssets,
			chains
		}))
	)

const getStablecoinPrices = () => withStablecoinsCache('pegged-prices', fetchStablecoinPricesApi)
const getStablecoinRates = () => withStablecoinsCache('pegged-rates', fetchStablecoinRatesApi)
const getStablecoinConfigData = () => withStablecoinsCache('config', fetchLlamaConfig)
const getStablecoinPeggedConfigData = () => withStablecoinsCache('pegged-config', fetchStablecoinPeggedConfigApi)

const getStablecoinBridgeInfo = () => withStablecoinsCache('bridge-info', fetchStablecoinBridgeInfoApi)

const sumRecordValues = (record: Record<string, number> | undefined): number => {
	if (!record) return 0
	let total = 0
	for (const value of Object.values(record)) {
		if (Number.isFinite(value)) total += value
	}
	return total
}

function fetchGlobalData({ peggedAssets, chains }: PeggedAssetsInput): StablecoinsGlobalDataCache {
	const tvlMap: Record<string, number> = {}
	for (const chain of chains) {
		tvlMap[chain.name] = sumRecordValues(chain.totalCirculatingUSD)
	}
	const chainList = chains
		.toSorted((a, b) => sumRecordValues(b.totalCirculatingUSD) - sumRecordValues(a.totalCirculatingUSD))
		.map((chain) => chain.name)
	const chainsSet = new Set<string>()
	const chainSet = new Set(chainList)
	for (const asset of peggedAssets) {
		for (const chain of asset.chains ?? []) {
			if (chain && chainSet.has(chain)) chainsSet.add(chain)
		}
	}
	return {
		chainList,
		chains: chainList.filter((chain) => chainsSet.has(chain)),
		chainsTVLData: chainList.map((chain) => tvlMap[chain])
	}
}

type StablecoinSeriesPoint = { date: number; mcap: Record<string, number> }

const toStablecoinSeriesPoint = (chart: StablecoinChartPoint): StablecoinSeriesPoint | null => {
	const mcap = chart.totalCirculatingUSD
	if (!mcap || typeof mcap !== 'object') return null
	const date = Number(chart.date)
	if (!Number.isFinite(date)) return null
	return { date, mcap }
}

const normalizeStablecoinSeries = (charts: StablecoinChartPoint[] | undefined): StablecoinSeriesPoint[] => {
	if (!charts?.length) return []
	const normalized: StablecoinSeriesPoint[] = []
	for (const chart of charts) {
		const point = toStablecoinSeriesPoint(chart)
		if (point) normalized.push(point)
	}
	return normalized
}

const getLastSeriesTimestamp = (series: StablecoinSeriesPoint[]): number => {
	if (series.length === 0) return 0
	return series[series.length - 1]?.date ?? 0
}

const padSeriesToTimestamp = (series: StablecoinSeriesPoint[], targetTimestamp: number): void => {
	if (series.length === 0) return
	const last = series[series.length - 1]
	if (!last) return

	let lastDate = Number(last.date)
	while (lastDate < targetTimestamp) {
		lastDate += ONE_DAY_SECONDS
		series.push({ ...last, date: lastDate })
	}
}

const readStablecoinNumericFromChart = (
	chart: StablecoinChartDataPoint[] | null | undefined,
	daysBefore: number,
	issuanceType: string,
	pegType?: string
): number | null => {
	const raw = getPrevStablecoinTotalFromChart(chart, daysBefore, issuanceType, pegType)
	return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

const normalizeStablecoinBridges = (value: unknown): StablecoinBridges => {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return null

	const normalized: NonNullable<StablecoinBridges> = {}

	for (const [bridgeId, sourcesValue] of Object.entries(value)) {
		if (sourcesValue == null || typeof sourcesValue !== 'object' || Array.isArray(sourcesValue)) continue

		const normalizedSources: Record<string, { amount: number }> = {}
		for (const [sourceChain, sourceValue] of Object.entries(sourcesValue)) {
			if (sourceValue == null || typeof sourceValue !== 'object' || Array.isArray(sourceValue)) continue
			const amountRaw = (sourceValue as Record<string, unknown>).amount
			const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw)
			if (!Number.isFinite(amount)) continue
			normalizedSources[sourceChain] = { amount }
		}

		let hasNormalizedSources = false
		for (const _sourceChain in normalizedSources) {
			hasNormalizedSources = true
			break
		}
		if (hasNormalizedSources) {
			normalized[bridgeId] = normalizedSources
		}
	}

	for (const _bridgeId in normalized) {
		return normalized
	}
	return null
}

const readStablecoinBridgesFromChart = (
	chart: StablecoinChartDataPoint[] | null | undefined,
	daysBefore: number,
	issuanceType: string
): StablecoinBridges => {
	// `getPrevStablecoinTotalFromChart` returns `unknown` for pegType='bridges';
	// normalize it to the `StablecoinBridges` runtime shape (bridgeId -> sourceChain -> { amount }).
	const bridges = getPrevStablecoinTotalFromChart(chart, daysBefore, issuanceType, 'bridges')
	return normalizeStablecoinBridges(bridges)
}

const buildOverviewChartInputs = ({
	peggedAssets,
	breakdown,
	doublecountedSourceIds
}: PeggedAssetsForChartInput): StablecoinOverviewChartInputs => {
	const chartDataByPeggedAsset: StablecoinSeriesPoint[][] = []
	const peggedAssetNamesSet = new Set<string>()
	const peggedNameToChartDataIndex: Record<string, number> = {}
	const doublecountedIds: number[] = []
	let lastTimestamp = 0

	for (let i = 0; i < peggedAssets.length; i++) {
		const asset = peggedAssets[i]
		let key = asset.symbol
		if (peggedAssetNamesSet.has(key)) key = asset.name
		if (!peggedAssetNamesSet.has(key)) peggedAssetNamesSet.add(key)
		else peggedAssetNamesSet.add(asset.gecko_id ?? `${asset.name}_${i}`)

		peggedNameToChartDataIndex[asset.name] = i
		const formattedCharts = normalizeStablecoinSeries(breakdown[asset.id])
		lastTimestamp = Math.max(lastTimestamp, getLastSeriesTimestamp(formattedCharts))

		if (doublecountedSourceIds?.includes(asset.id)) {
			doublecountedIds.push(i)
		}
		chartDataByPeggedAsset.push(formattedCharts)
	}

	for (const chart of chartDataByPeggedAsset) padSeriesToTimestamp(chart, lastTimestamp)

	return {
		chartDataByPeggedAsset,
		peggedAssetNames: [...peggedAssetNamesSet],
		peggedNameToChartDataIndex,
		doublecountedIds
	}
}

export async function getStablecoinChainMcapSummary(chain: string | null): Promise<PeggedChainMcapSummary | null> {
	const chainKey = chain != null ? slug(chain) : 'all'
	return withStablecoinsCache(`overview-summary:${chainKey}`, async () => {
		const chainLabel: string = chain ?? 'all-llama-app'
		const [{ peggedAssets }, chainData] = await Promise.all([
			getStablecoinAssets(),
			fetchStablecoinChartApi(chainLabel)
		])
		const breakdown = chainData.breakdown
		if (!breakdown) return null

		const { chartDataByPeggedAsset, peggedAssetNames, peggedNameToChartDataIndex, doublecountedIds } =
			buildOverviewChartInputs({
				peggedAssets,
				breakdown,
				doublecountedSourceIds: chainData.doublecountedIds
			})

		const { peggedAreaChartData, peggedAreaTotalData } = buildStablecoinChartData({
			chartDataByAssetOrChain: chartDataByPeggedAsset,
			assetsOrChainsList: peggedAssetNames,
			filteredIndexes: Object.values(peggedNameToChartDataIndex),
			issuanceType: 'mcap',
			selectedChain: chain ?? 'All',
			doublecountedIds
		})

		const mcapStats = getStablecoinMcapStatsFromTotals(peggedAreaTotalData)
		const topToken = getStablecoinTopTokenFromChartData(peggedAreaChartData)
		const dominanceValue = getStablecoinDominance(topToken, mcapStats.totalMcapCurrent)
		const dominance = dominanceValue == null ? null : String(dominanceValue)

		return {
			mcap: mcapStats.totalMcapCurrent ?? null,
			change7dUsd: mcapStats.change7dUsd ?? null,
			change7d: mcapStats.change7d ?? null,
			topToken,
			dominance: dominance ?? null,
			mcapChartData: mcapStats.mcapChartData14d
		}
	})
}

export async function getStablecoinsByChainPageData(chain: string | null): Promise<PeggedOverviewPageData> {
	const chainKey = chain ? slug(chain) : 'all'
	return withStablecoinsCache(`overview:${chainKey}`, async () => {
		const chainLabel = chain ?? 'all-llama-app' // custom key to fetch limited data to reduce page size
		const [{ peggedAssets, chains }, chainData, priceData, rateData] = await Promise.all([
			getStablecoinAssets(),
			fetchStablecoinChartApi(chainLabel),
			getStablecoinPrices(),
			getStablecoinRates()
		])
		const breakdown = chainData.breakdown
		if (!breakdown) {
			throw new Error(`[getStablecoinsByChainPageData] [${chainLabel}] no breakdown`)
		}

		const { chartDataByPeggedAsset, peggedAssetNames, peggedNameToChartDataIndex, doublecountedIds } =
			buildOverviewChartInputs({
				peggedAssets,
				breakdown,
				doublecountedSourceIds: chainData.doublecountedIds
			})

		const filteredPeggedAssets = formatPeggedAssetsData({
			peggedAssets,
			chartDataByPeggedAsset,
			priceData,
			rateData,
			peggedNameToChartDataIndex,
			chain: chain ?? undefined
		})

		return {
			chains: fetchGlobalData({ peggedAssets, chains }).chains,
			filteredPeggedAssets,
			peggedAssetNames,
			peggedNameToChartDataIndex,
			chartDataByPeggedAsset,
			doublecountedIds,
			chain: chain ?? 'All'
		}
	})
}

export async function getStablecoinChainsPageData(): Promise<PeggedChainsPageData> {
	return withStablecoinsCache('chains-page', async () => {
		const [
			{ peggedAssets, chains },
			{ chainCoingeckoIds },
			{ aggregated: chartData },
			{ dominanceMap, chainChartMap }
		] = await Promise.all([
			getStablecoinAssets(),
			getStablecoinConfigData(),
			fetchStablecoinChartAllApi(),
			fetchStablecoinDominanceAllApi()
		])
		const { chainList, chainsTVLData } = fetchGlobalData({ peggedAssets, chains })

		const chainsGroupbyParent: Record<string, Record<string, string[]>> = {}
		for (const chain of chainList) {
			const parent = chainCoingeckoIds[chain]?.parent
			if (parent) {
				if (!chainsGroupbyParent[parent.chain]) {
					chainsGroupbyParent[parent.chain] = {}
				}
				for (const type of parent.types) {
					if (!chainsGroupbyParent[parent.chain][type]) {
						chainsGroupbyParent[parent.chain][type] = []
					}
					chainsGroupbyParent[parent.chain][type].push(chain)
				}
			}
		}

		const peggedChartDataByChain = chainList.map((chain) => chainChartMap[chain] ?? null) as Array<
			StablecoinChartPoint[] | null
		>

		const peggedDomDataByChain = chainList.map((chain) => dominanceMap[chain])

		const chainDominances: Record<string, { symbol: string; mcap: number }> = {}
		for (let i = 0; i < peggedDomDataByChain.length; i++) {
			const charts = peggedDomDataByChain[i]
			if (!charts) continue
			const lastChart = charts[charts.length - 1]
			if (!lastChart) continue
			const greatestChainMcap = lastChart.greatestMcap
			if (!greatestChainMcap) continue
			const chainName = chainList[i]
			chainDominances[chainName] = greatestChainMcap
		}

		const chainCirculatings = formatPeggedChainsData({
			chainList,
			peggedChartDataByChain,
			chainDominances,
			chainsTVLData
		})

		const formattedPeggedChartDataByChain = peggedChartDataByChain.map((charts) => {
			if (!charts) return null
			return charts
				.map((chart): { date: number; mcap: number | null } | null => {
					const date = Number(chart.date)
					if (!Number.isFinite(date)) return null

					const rawMcap = chart.totalCirculatingUSD
					let mcap: number | null = null
					if (rawMcap && typeof rawMcap === 'object') {
						let total = 0
						let hasFinite = false
						for (const value of Object.values(rawMcap)) {
							const numeric = Number(value)
							if (!Number.isFinite(numeric)) continue
							total += numeric
							hasFinite = true
						}
						mcap = hasFinite ? total : null
					}

					return { date, mcap }
				})
				.filter((point): point is { date: number; mcap: number | null } => point != null)
		})

		return {
			chainCirculatings,
			chartData: chartData ?? [],
			peggedChartDataByChain: formattedPeggedChartDataByChain,
			chainList,
			chainsGroupbyParent
		}
	})
}

export const getStablecoinAssetPageData = async (
	peggedasset: string
): Promise<{ props: PeggedAssetPageProps } | null> => {
	const peggedNameToPeggedIDMapping = await getStablecoinPeggedConfigData()
	const peggedID = peggedNameToPeggedIDMapping[peggedasset]
	if (!peggedID) {
		return null
	}
	return withStablecoinsCache(`asset:${peggedID}`, async () => {
		const [res, { chainCoingeckoIds }, recentCoinsData, bridgeInfo] = await Promise.all([
			fetchStablecoinAssetApi(peggedID),
			getStablecoinConfigData(),
			fetchStablecoinRecentCoinsDataApi(),
			getStablecoinBridgeInfo()
		])
		if (!res) return null

		const peggedChart: StablecoinChartDataPoint[] | undefined = recentCoinsData[peggedID]
		const pegType = res.pegType ?? ''

		const totalCirculating = readStablecoinNumericFromChart(peggedChart, 0, 'totalCirculating', pegType)
		const unreleased = readStablecoinNumericFromChart(peggedChart, 0, 'totalUnreleased', pegType)
		const mcap = readStablecoinNumericFromChart(peggedChart, 0, 'totalCirculatingUSD', pegType)

		const chainsUnique: string[] = []
		for (const chainName in res.chainBalances ?? {}) {
			chainsUnique.push(chainName)
		}
		const chainsData: StablecoinChainBalanceToken[][] = chainsUnique.map(
			(elem) => res.chainBalances[elem]?.tokens ?? []
		)

		const chainCirculatings = chainsUnique
			.map((chainName, i) => {
				const circulating = readStablecoinNumericFromChart(chainsData[i], 0, 'circulating', pegType)
				const unreleased = readStablecoinNumericFromChart(chainsData[i], 0, 'unreleased', pegType)
				const bridgedTo = readStablecoinNumericFromChart(chainsData[i], 0, 'bridgedTo', pegType)
				const bridges = readStablecoinBridgesFromChart(chainsData[i], 0, 'bridgedTo')
				const circulatingPrevDay = readStablecoinNumericFromChart(chainsData[i], 1, 'circulating', pegType)
				const circulatingPrevWeek = readStablecoinNumericFromChart(chainsData[i], 7, 'circulating', pegType)
				const circulatingPrevMonth = readStablecoinNumericFromChart(chainsData[i], 30, 'circulating', pegType)
				const change_1d = getPercentChange(circulating, circulatingPrevDay)
				const change_7d = getPercentChange(circulating, circulatingPrevWeek)
				const change_1m = getPercentChange(circulating, circulatingPrevMonth)

				return {
					circulating,
					unreleased,
					change_1d,
					change_7d,
					change_1m,
					circulatingPrevDay,
					circulatingPrevWeek,
					circulatingPrevMonth,
					bridgedAmount: bridgedTo,
					bridges,
					name: chainName,
					symbol: chainCoingeckoIds[chainName]?.symbol ?? '-'
				}
			})
			.sort((a, b) => (b.circulating ?? 0) - (a.circulating ?? 0))

		return {
			props: {
				chainsUnique,
				chainCirculatings,
				peggedAssetData: res,
				totalCirculating,
				unreleased,
				mcap,
				bridgeInfo
			}
		}
	})
}
