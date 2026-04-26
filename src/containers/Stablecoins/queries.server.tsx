import { fetchBlockExplorers, fetchLlamaConfig } from '~/api'
import {
	formatPeggedAssetsData,
	formatPeggedChainsData,
	getPrevStablecoinTotalFromChart,
	buildStablecoinAreaChartData,
	buildStablecoinTotalChartData,
	getStablecoinDominance,
	getStablecoinMcapStatsFromTotals,
	getStablecoinTopTokenFromChartData,
	type StablecoinChartDataPoint
} from '~/containers/Stablecoins/utils'
import { formattedNum, getPercentChange, slug } from '~/utils'
import { formatRuntimeLog, postRuntimeLogs } from '~/utils/async'
import { getBlockExplorerNew } from '~/utils/blockExplorers'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'
import { parseExcludeParam, parseNumberQueryParam } from '~/utils/routerQuery'
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
import {
	buildAreaPayload,
	buildDominancePayload,
	buildStablecoinChartSummary,
	buildTokenInflowsPayload,
	buildTotalMcapPayload,
	buildUsdInflowsPayload,
	getTopStablecoinFromLatestPoints,
	type StablecoinAssetChartType,
	type StablecoinChartSeriesPayload,
	type StablecoinChainsChartType,
	type StablecoinOverviewChartType
} from './chartSeries'
import {
	stablecoinAttributeOptions,
	stablecoinBackingOptions,
	stablecoinPegTypeOptions,
	type StablecoinFilterOption
} from './Filters'
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
type QueryParamInput = string | string[] | undefined | null

async function withStablecoinsCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const cacheKey = `${STABLECOINS_CACHE_PREFIX}:${key}`

	try {
		const data = await fetcher()
		await setObjectCache(cacheKey, data, STABLECOINS_CACHE_TTL)
		return data
	} catch (error) {
		const cached = await getObjectCache(cacheKey)
		if (cached !== null) {
			postRuntimeLogs(
				formatRuntimeLog({
					event: 'stablecoinsCache',
					level: 'warn',
					status: 'fallback',
					target: cacheKey,
					message: 'Using cached data after fetch failure'
				}),
				{ level: 'warn' }
			)
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
	for (const key in record) {
		const value = record[key]
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
	const bridgesRecord = value as Record<string, unknown>
	let hasBridges = false

	for (const bridgeId in bridgesRecord) {
		const sourcesValue = bridgesRecord[bridgeId]
		if (sourcesValue == null || typeof sourcesValue !== 'object' || Array.isArray(sourcesValue)) continue

		const sourcesRecord = sourcesValue as Record<string, unknown>
		const normalizedSources: Record<string, { amount: number }> = {}
		let hasSources = false
		for (const sourceChain in sourcesRecord) {
			const sourceValue = sourcesRecord[sourceChain]
			if (sourceValue == null || typeof sourceValue !== 'object' || Array.isArray(sourceValue)) continue
			const amountRaw = (sourceValue as Record<string, unknown>).amount
			const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw)
			if (!Number.isFinite(amount)) continue
			normalizedSources[sourceChain] = { amount }
			hasSources = true
		}

		if (hasSources) {
			normalized[bridgeId] = normalizedSources
			hasBridges = true
		}
	}

	return hasBridges ? normalized : null
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

type StablecoinOverviewSource = StablecoinOverviewChartInputs & {
	chains: string[]
	filteredPeggedAssets: ReturnType<typeof formatPeggedAssetsData>
	chain: string
}

type StablecoinOverviewFilterQuery = {
	attribute?: QueryParamInput
	excludeAttribute?: QueryParamInput
	pegtype?: QueryParamInput
	excludePegtype?: QueryParamInput
	backing?: QueryParamInput
	excludeBacking?: QueryParamInput
	minMcap?: QueryParamInput
	maxMcap?: QueryParamInput
}

const hasQueryValue = (value: QueryParamInput): boolean => {
	if (value == null) return false
	if (Array.isArray(value)) return value.length > 0
	return value !== ''
}

const resolveSelectedFilterKeys = (
	includeParam: QueryParamInput,
	excludeParam: QueryParamInput,
	options: StablecoinFilterOption[]
): string[] => {
	const optionKeyByLower = new Map<string, string>()
	const allKeys: string[] = []
	for (const option of options) {
		optionKeyByLower.set(option.key.toLowerCase(), option.key)
		allKeys.push(option.key)
	}

	let selected: string[]
	if (!includeParam) {
		selected = allKeys
	} else if (includeParam === 'None' || (Array.isArray(includeParam) && includeParam.includes('None'))) {
		selected = []
	} else {
		const rawValues = Array.isArray(includeParam) ? includeParam : [includeParam]
		selected = []
		for (const raw of rawValues) {
			const key = optionKeyByLower.get(raw.toLowerCase())
			if (key) selected.push(key)
		}
	}

	const excludeSetRaw = parseExcludeParam(excludeParam)
	if (excludeSetRaw.size === 0) return selected
	const excludeSet = new Set<string>()
	for (const raw of excludeSetRaw) {
		const key = optionKeyByLower.get(raw.toLowerCase())
		if (key) excludeSet.add(key)
	}
	if (excludeSet.size === 0) return selected
	return selected.filter((key) => !excludeSet.has(key))
}

const matchesAnySelectedOption = (
	asset: ReturnType<typeof formatPeggedAssetsData>[number],
	selectedKeys: string[],
	optionsByKey: Map<string, StablecoinFilterOption>
): boolean => {
	if (selectedKeys.length === 0) return false
	for (const key of selectedKeys) {
		const option = optionsByKey.get(key)
		if (option?.filterFn(asset)) return true
	}
	return false
}

const stablecoinAttributeOptionsByKey = new Map(stablecoinAttributeOptions.map((option) => [option.key, option]))
const stablecoinPegTypeOptionsByKey = new Map(stablecoinPegTypeOptions.map((option) => [option.key, option]))
const stablecoinBackingOptionsByKey = new Map(stablecoinBackingOptions.map((option) => [option.key, option]))

const resolveStablecoinOverviewFilteredIndexes = (
	source: StablecoinOverviewSource,
	filters: StablecoinOverviewFilterQuery = {}
): number[] => {
	const hasActiveFilters =
		hasQueryValue(filters.attribute) ||
		hasQueryValue(filters.excludeAttribute) ||
		hasQueryValue(filters.pegtype) ||
		hasQueryValue(filters.excludePegtype) ||
		hasQueryValue(filters.backing) ||
		hasQueryValue(filters.excludeBacking) ||
		hasQueryValue(filters.minMcap) ||
		hasQueryValue(filters.maxMcap)

	const indexes: number[] = []
	const seen = new Set<number>()

	if (!hasActiveFilters) {
		for (const asset of source.filteredPeggedAssets) {
			const maybeIndex = source.peggedNameToChartDataIndex[asset.name]
			if (typeof maybeIndex !== 'number' || !Number.isFinite(maybeIndex) || seen.has(maybeIndex)) continue
			seen.add(maybeIndex)
			indexes.push(maybeIndex)
		}
		return indexes
	}

	const selectedAttributes = resolveSelectedFilterKeys(
		filters.attribute,
		filters.excludeAttribute,
		stablecoinAttributeOptions
	)
	const selectedPegTypes = resolveSelectedFilterKeys(filters.pegtype, filters.excludePegtype, stablecoinPegTypeOptions)
	const selectedBackings = resolveSelectedFilterKeys(filters.backing, filters.excludeBacking, stablecoinBackingOptions)
	const minMcap = parseNumberQueryParam(filters.minMcap)
	const maxMcap = parseNumberQueryParam(filters.maxMcap)

	for (const asset of source.filteredPeggedAssets) {
		if (!matchesAnySelectedOption(asset, selectedAttributes, stablecoinAttributeOptionsByKey)) continue
		if (!matchesAnySelectedOption(asset, selectedPegTypes, stablecoinPegTypeOptionsByKey)) continue
		if (!matchesAnySelectedOption(asset, selectedBackings, stablecoinBackingOptionsByKey)) continue

		const mcap = asset.mcap ?? 0
		if (minMcap != null && mcap < minMcap) continue
		if (maxMcap != null && mcap > maxMcap) continue

		const maybeIndex = source.peggedNameToChartDataIndex[asset.name]
		if (typeof maybeIndex !== 'number' || !Number.isFinite(maybeIndex) || seen.has(maybeIndex)) continue
		seen.add(maybeIndex)
		indexes.push(maybeIndex)
	}

	return indexes
}

const getStablecoinsOverviewSource = async (chain: string | null): Promise<StablecoinOverviewSource> => {
	const chainKey = chain ? slug(chain) : 'all'
	return withStablecoinsCache(`overview:${chainKey}`, async () => {
		const chainLabel = chain ?? 'all-llama-app' // custom key to fetch limited data to reduce page size
		const [{ peggedAssets, chains }, chainData, priceData, rateData] = await Promise.all([
			getStablecoinAssets(),
			fetchStablecoinChartApi(chainLabel),
			getStablecoinPrices().catch(() => null),
			getStablecoinRates().catch(() => null)
		])
		const breakdown = chainData.breakdown
		if (!breakdown) {
			throw new Error(`[getStablecoinsByChainPageData] [${chainLabel}] no breakdown`)
		}

		const chartInputs = buildOverviewChartInputs({
			peggedAssets,
			breakdown,
			doublecountedSourceIds: chainData.doublecountedIds
		})

		const filteredPeggedAssets = formatPeggedAssetsData({
			peggedAssets,
			chartDataByPeggedAsset: chartInputs.chartDataByPeggedAsset,
			priceData,
			rateData,
			peggedNameToChartDataIndex: chartInputs.peggedNameToChartDataIndex,
			chain: chain ?? undefined
		})

		return {
			chains: fetchGlobalData({ peggedAssets, chains }).chains,
			filteredPeggedAssets,
			...chartInputs,
			chain: chain ?? 'All'
		}
	})
}

const buildStablecoinOverviewChartSeries = (
	source: StablecoinOverviewSource,
	{
		chart,
		filters = {}
	}: {
		chart: StablecoinOverviewChartType
		filters?: StablecoinOverviewFilterQuery
	}
): StablecoinChartSeriesPayload => {
	const filteredIndexes = resolveStablecoinOverviewFilteredIndexes(source, filters)
	const baseParams = {
		chartDataByAssetOrChain: source.chartDataByPeggedAsset,
		assetsOrChainsList: source.peggedAssetNames,
		filteredIndexes,
		issuanceType: 'mcap',
		selectedChain: source.chain,
		doublecountedIds: source.doublecountedIds
	}
	const topToken = getTopStablecoinFromLatestPoints(baseParams)

	if (chart === 'totalMcap') {
		return buildTotalMcapPayload(baseParams, { summaryTopToken: topToken })
	}

	const { peggedAreaTotalData } = buildStablecoinTotalChartData(baseParams)
	const summary = buildStablecoinChartSummary(peggedAreaTotalData, topToken)

	if (chart === 'tokenMcaps') {
		const payload = buildAreaPayload(baseParams, { stackName: 'tokenMcaps' })
		return { ...payload, summary }
	}
	if (chart === 'dominance') {
		const payload = buildDominancePayload(baseParams, { stackName: 'dominance' })
		return { ...payload, summary }
	}
	if (chart === 'usdInflows') {
		const payload = buildUsdInflowsPayload(baseParams)
		return { ...payload, summary }
	}
	const payload = buildTokenInflowsPayload(baseParams)
	return { ...payload, summary }
}

export const getStablecoinOverviewChartSeries = async ({
	chain,
	chart,
	filters = {}
}: {
	chain: string | null
	chart: StablecoinOverviewChartType
	filters?: StablecoinOverviewFilterQuery
}): Promise<StablecoinChartSeriesPayload> => {
	const source = await getStablecoinsOverviewSource(chain)
	return buildStablecoinOverviewChartSeries(source, { chart, filters })
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
		const filteredIndexes: number[] = []
		for (const key in peggedNameToChartDataIndex) filteredIndexes.push(peggedNameToChartDataIndex[key])

		const chartParams = {
			chartDataByAssetOrChain: chartDataByPeggedAsset,
			assetsOrChainsList: peggedAssetNames,
			filteredIndexes,
			issuanceType: 'mcap',
			selectedChain: chain ?? 'All',
			doublecountedIds
		}
		const { peggedAreaChartData } = buildStablecoinAreaChartData(chartParams)
		const { peggedAreaTotalData } = buildStablecoinTotalChartData(chartParams)

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
	const source = await getStablecoinsOverviewSource(chain)
	const defaultChartData = buildStablecoinOverviewChartSeries(source, { chart: 'totalMcap' })
	return {
		chains: source.chains,
		filteredPeggedAssets: source.filteredPeggedAssets,
		chain: source.chain,
		defaultChartData
	}
}

type StablecoinChainsSource = {
	chainCirculatings: PeggedChainsPageData['chainCirculatings']
	chartData: StablecoinChartPoint[]
	peggedChartDataByChain: Array<Array<{ date: number; mcap: number | null }> | null>
	chainList: string[]
	chainsGroupbyParent: Record<string, Record<string, string[]>>
}

const toSignedChangeLabel = (value: string): string => {
	const numericValue = Number.parseFloat(value.replace(/[^0-9.+-]/g, ''))
	if (!Number.isNaN(numericValue) && numericValue === 0) return value
	const trimmedValue = value.trimStart()
	if (trimmedValue.startsWith('+') || trimmedValue.startsWith('-')) return value
	return `+${value}`
}

const getStablecoinChainsSource = async (): Promise<StablecoinChainsSource> => {
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
			return charts.flatMap((chart): Array<{ date: number; mcap: number | null }> => {
				const date = Number(chart.date)
				if (!Number.isFinite(date)) return []

				const rawMcap = chart.totalCirculatingUSD
				let mcap: number | null = null
				if (rawMcap && typeof rawMcap === 'object') {
					let total = 0
					let hasFinite = false
					for (const key in rawMcap) {
						const value = rawMcap[key]
						const numeric = Number(value)
						if (!Number.isFinite(numeric)) continue
						total += numeric
						hasFinite = true
					}
					mcap = hasFinite ? total : null
				}

				return [{ date, mcap }]
			})
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

export async function getStablecoinChainsPageData(): Promise<PeggedChainsPageData> {
	const source = await getStablecoinChainsSource()

	const totalMcapCurrent = getPrevStablecoinTotalFromChart(source.chartData, 0, 'totalCirculatingUSD')
	const totalMcapPrevDay = getPrevStablecoinTotalFromChart(source.chartData, 1, 'totalCirculatingUSD')
	const totalMcapPrevWeek = getPrevStablecoinTotalFromChart(source.chartData, 7, 'totalCirculatingUSD')
	const totalMcapPrevMonth = getPrevStablecoinTotalFromChart(source.chartData, 30, 'totalCirculatingUSD')

	const change1d = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2) ?? '0'
	const change7d = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2) ?? '0'
	const change30d = getPercentChange(totalMcapCurrent, totalMcapPrevMonth)?.toFixed(2) ?? '0'

	const change1d_nol = formattedNum(String((totalMcapCurrent ?? 0) - (totalMcapPrevDay ?? 0)), true)
	const change7d_nol = formattedNum(String((totalMcapCurrent ?? 0) - (totalMcapPrevWeek ?? 0)), true)
	const change30d_nol = formattedNum(String((totalMcapCurrent ?? 0) - (totalMcapPrevMonth ?? 0)), true)

	return {
		chainCirculatings: source.chainCirculatings,
		chainList: source.chainList,
		chainsGroupbyParent: source.chainsGroupbyParent,
		change1d: toSignedChangeLabel(change1d),
		change7d: toSignedChangeLabel(change7d),
		change30d: toSignedChangeLabel(change30d),
		totalMcapCurrent,
		change1d_nol: toSignedChangeLabel(change1d_nol),
		change7d_nol: toSignedChangeLabel(change7d_nol),
		change30d_nol: toSignedChangeLabel(change30d_nol)
	}
}

export const getStablecoinChainsChartSeries = async (
	chart: StablecoinChainsChartType,
	includeUnreleased = false
): Promise<StablecoinChartSeriesPayload> => {
	const source = await getStablecoinChainsSource()
	const baseParams = {
		chartDataByAssetOrChain: source.peggedChartDataByChain,
		assetsOrChainsList: source.chainList,
		issuanceType: 'mcap'
	}

	if (chart === 'totalMcap') {
		return buildTotalMcapPayload(baseParams)
	}
	if (chart === 'chainMcaps') {
		return buildAreaPayload(baseParams, {
			chartNames: source.chainList,
			stackName: 'chainMcap',
			valueSymbol: '$'
		})
	}
	return buildDominancePayload(baseParams, {
		chartNames: source.chainList,
		includeUnreleased,
		stackName: 'dominance'
	})
}

type StablecoinAssetSource = {
	peggedID: string
	res: NonNullable<Awaited<ReturnType<typeof fetchStablecoinAssetApi>>>
	chainCoingeckoIds: Record<string, { symbol?: string }>
	recentCoinsData: Awaited<ReturnType<typeof fetchStablecoinRecentCoinsDataApi>>
	bridgeInfo: Awaited<ReturnType<typeof getStablecoinBridgeInfo>>
	blockExplorersData: Awaited<ReturnType<typeof fetchBlockExplorers>>
}

const getStablecoinAssetSource = async (peggedasset: string): Promise<StablecoinAssetSource | null> => {
	const peggedNameToPeggedIDMapping = await getStablecoinPeggedConfigData()
	const peggedID = peggedNameToPeggedIDMapping[peggedasset]
	if (!peggedID) return null

	return withStablecoinsCache(`asset-source:${peggedID}`, async () => {
		const [res, { chainCoingeckoIds }, recentCoinsData, bridgeInfo, blockExplorersData] = await Promise.all([
			fetchStablecoinAssetApi(peggedID),
			getStablecoinConfigData().catch(() => ({ chainCoingeckoIds: {} })),
			fetchStablecoinRecentCoinsDataApi().catch(() => ({})),
			getStablecoinBridgeInfo().catch(() => null),
			fetchBlockExplorers().catch(() => [])
		])
		if (!res) return null
		return {
			peggedID,
			res,
			chainCoingeckoIds,
			recentCoinsData,
			bridgeInfo,
			blockExplorersData
		}
	})
}

const buildStablecoinAssetChartSeries = (
	source: StablecoinAssetSource,
	{
		chart,
		includeUnreleased
	}: {
		chart: StablecoinAssetChartType
		includeUnreleased: boolean
	}
): StablecoinChartSeriesPayload => {
	const chainsUnique: string[] = []
	for (const chainName in source.res.chainBalances ?? {}) {
		chainsUnique.push(chainName)
	}
	const chainsData: StablecoinChainBalanceToken[][] = chainsUnique.map(
		(elem) => source.res.chainBalances[elem]?.tokens ?? []
	)
	const baseParams = {
		chartDataByAssetOrChain: chainsData,
		assetsOrChainsList: chainsUnique,
		filteredIndexes: chainsUnique.map((_, index) => index),
		issuanceType: 'circulating',
		totalChartTooltipLabel: 'Circulating'
	}

	if (chart === 'totalCirc') {
		return buildTotalMcapPayload(baseParams, { totalName: 'Circulating', includeUnreleased })
	}
	if (chart === 'chainMcaps') {
		return buildAreaPayload(baseParams, {
			chartNames: chainsUnique,
			stackName: 'chains',
			valueSymbol: '$'
		})
	}
	return buildDominancePayload(baseParams, {
		chartNames: chainsUnique,
		includeUnreleased,
		stackName: 'dominance'
	})
}

export const getStablecoinAssetChartSeries = async ({
	peggedasset,
	chart,
	includeUnreleased = false
}: {
	peggedasset: string
	chart: StablecoinAssetChartType
	includeUnreleased?: boolean
}): Promise<StablecoinChartSeriesPayload | null> => {
	const source = await getStablecoinAssetSource(peggedasset)
	if (!source) return null
	return buildStablecoinAssetChartSeries(source, { chart, includeUnreleased })
}

export const getStablecoinAssetPageData = async (
	peggedasset: string
): Promise<{ props: PeggedAssetPageProps } | null> => {
	const source = await getStablecoinAssetSource(peggedasset)
	if (!source) return null
	return withStablecoinsCache(`asset:${source.peggedID}`, async () => {
		const { res, chainCoingeckoIds, recentCoinsData, bridgeInfo, blockExplorersData } = source

		const peggedChart: StablecoinChartDataPoint[] | undefined = recentCoinsData[source.peggedID]
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
				const chainUnreleased = readStablecoinNumericFromChart(chainsData[i], 0, 'unreleased', pegType)
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
					unreleased: chainUnreleased,
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

		const explorerResult = getBlockExplorerNew({
			apiResponse: blockExplorersData,
			address: res.address ?? '',
			urlType: 'token'
		})
		const {
			chainBalances: _chainBalances,
			currentChainBalances: _currentChainBalances,
			tokens: _tokens,
			...peggedAssetData
		} = res

		return {
			props: {
				chainsUnique,
				chainCirculatings,
				peggedAssetData,
				defaultChartData: buildStablecoinAssetChartSeries(source, {
					chart: 'totalCirc',
					includeUnreleased: false
				}),
				totalCirculating,
				unreleased,
				mcap,
				bridgeInfo,
				blockExplorerUrl: explorerResult?.url ?? null,
				blockExplorerName: explorerResult?.name ?? null
			}
		}
	})
}
