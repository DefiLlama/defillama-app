import { AUTH_SERVER, CONFIG_API, YIELD_CHART_API, YIELD_CHART_LEND_BORROW_API } from '~/constants'
import { fetchChainsList } from '~/containers/Chains/api'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { fetchProtocols } from '~/containers/Protocols/api'
import {
	fetchStablecoinAssetsApi,
	fetchStablecoinChartApi,
	fetchStablecoinPricesApi,
	fetchStablecoinRatesApi
} from '~/containers/Stablecoins/api'
import { formatPeggedAssetsData } from '~/containers/Stablecoins/utils'
import { getProtocolEmissionsPieData, getProtocolEmissionsScheduleData } from '~/containers/Unlocks/queries'
import { fetchProtocolsTable, type ChainMetrics } from '~/server/unifiedTable/protocols'
import { slug } from '~/utils'
import { sluggifyProtocol } from '~/utils/cache-client'
import { toDisplayName } from '~/utils/chainNormalizer'
import type { NormalizedRow } from './components/UnifiedTable/types'
import { sanitizeRowHeaders } from './components/UnifiedTable/utils/rowHeaders'
import type { CustomTimePeriod, TimePeriod } from './dashboardReducer'
import { filterDataByTimePeriod } from './queries'
import { createServerAuthorizedFetch } from './server/auth'
import { fetchPfPsChartData, fetchPfPsProtocols } from './server/pfPsQueries'
import { fetchTableServerData, type TableServerData } from './server/tableQueries'
import ChainCharts from './services/ChainCharts'
import type { Dashboard } from './services/DashboardAPI'
import ProtocolCharts from './services/ProtocolCharts'
import type {
	AdvancedTvlChartConfig,
	ChartConfig,
	DashboardItemConfig,
	MetricConfig,
	StablecoinsChartConfig,
	UnifiedTableConfig,
	UnlocksPieConfig,
	UnlocksScheduleConfig,
	YieldsChartConfig
} from './types'

export interface ProDashboardServerProps {
	dashboard: Dashboard | null
	chartData: Record<string, [number, number][]>
	protocolsAndChains: { protocols: any[]; chains: any[] } | null
	appMetadata: {
		protocols: Record<string, any>
		chains: Record<string, any>
		pfPs: { pf: string[]; ps: string[] }
	} | null
	tableData: TableServerData | null
	yieldsChartData: Record<string, { chart: any; lendBorrow: any }>
	protocolFullData: Record<string, any>
	metricData: Record<string, [number, number][]>
	advancedTvlBasicData: Record<string, [number, number][]>
	unifiedTableData: Record<string, { rows: NormalizedRow[]; chainMetrics?: Record<string, ChainMetrics> }>
	stablecoinsChartData: Record<string, any>
	emissionData: Record<string, any>
}

async function fetchDashboardConfig(dashboardId: string, authToken: string | null): Promise<Dashboard | null> {
	try {
		const url = `${AUTH_SERVER}/dashboards/${dashboardId}`
		const fetchFn = authToken ? createServerAuthorizedFetch(authToken) : fetch
		const response = await fetchFn(url)
		if (!response.ok) return null
		return response.json()
	} catch {
		return null
	}
}

async function fetchProtocolsAndChains(): Promise<{ protocols: any[]; chains: any[] } | null> {
	try {
		const [protocolsData, chainsData] = await Promise.all([fetchProtocols(), fetchChainsList()])

		const transformedChains = chainsData.map((chain: any) => ({
			...chain,
			name: toDisplayName(chain.name)
		}))

		const parentProtocols = Array.isArray(protocolsData.parentProtocols) ? protocolsData.parentProtocols : []

		const baseProtocols = (protocolsData.protocols || []).map((p: any) => ({
			...p,
			slug: sluggifyProtocol(p.name),
			geckoId: p.geckoId || null,
			parentProtocol: p.parentProtocol || null
		}))

		const parentTotals = new Map<string, number>()
		for (const p of protocolsData.protocols || []) {
			if (p.parentProtocol) {
				parentTotals.set(
					p.parentProtocol,
					(parentTotals.get(p.parentProtocol) || 0) + (typeof p.tvl === 'number' ? p.tvl : 0)
				)
			}
		}

		const syntheticParents = parentProtocols.map((pp: any) => ({
			id: pp.id,
			name: pp.name,
			logo: pp.logo,
			slug: sluggifyProtocol(pp.name),
			tvl: parentTotals.get(pp.id) || 0,
			geckoId: null,
			parentProtocol: null
		}))

		const mergedBySlug = new Map<string, any>()
		for (const p of [...baseProtocols, ...syntheticParents]) {
			if (!mergedBySlug.has(p.slug)) mergedBySlug.set(p.slug, p)
		}

		return {
			protocols: Array.from(mergedBySlug.values()),
			chains: transformedChains.sort((a: any, b: any) => b.tvl - a.tvl)
		}
	} catch {
		return null
	}
}

async function fetchAppMetadata(): Promise<ProDashboardServerProps['appMetadata']> {
	try {
		const [protocols, chains, pfPs] = await Promise.all([
			fetch(`${CONFIG_API}/smol/appMetadata-protocols.json`).then((r) => (r.ok ? r.json() : null)),
			fetch(`${CONFIG_API}/smol/appMetadata-chains.json`).then((r) => (r.ok ? r.json() : null)),
			fetchPfPsProtocols().catch(() => ({ pf: [] as string[], ps: [] as string[] }))
		])

		if (!protocols || !chains) return null
		return { protocols, chains, pfPs }
	} catch {
		return null
	}
}

function extractChartItems(items: DashboardItemConfig[]): ChartConfig[] {
	const chartItems: ChartConfig[] = []
	for (const item of items) {
		if (item.kind === 'chart') chartItems.push(item)
		else if (item.kind === 'multi') chartItems.push(...item.items)
	}
	return chartItems
}

function extractYieldsItems(items: DashboardItemConfig[]): YieldsChartConfig[] {
	return items.filter((item): item is YieldsChartConfig => item.kind === 'yields')
}

async function fetchAllYieldsChartData(
	items: DashboardItemConfig[]
): Promise<Record<string, { chart: any; lendBorrow: any }>> {
	const yieldsItems = extractYieldsItems(items)
	if (yieldsItems.length === 0) return {}

	const CHART_FETCH_TIMEOUT = 10_000

	const uniquePoolIds = new Set<string>()
	for (const item of yieldsItems) {
		uniquePoolIds.add(item.poolConfigId)
	}

	const results = await Promise.allSettled(
		Array.from(uniquePoolIds).map(async (poolConfigId) => {
			const [chartResult, lendBorrowResult] = await Promise.allSettled([
				withTimeout(
					fetch(`${YIELD_CHART_API}/${poolConfigId}`).then((r) => (r.ok ? r.json() : null)),
					CHART_FETCH_TIMEOUT
				),
				withTimeout(
					fetch(`${YIELD_CHART_LEND_BORROW_API}/${poolConfigId}`).then((r) => (r.ok ? r.json() : null)),
					CHART_FETCH_TIMEOUT
				)
			])

			return {
				poolConfigId,
				chart: chartResult.status === 'fulfilled' ? chartResult.value : null,
				lendBorrow: lendBorrowResult.status === 'fulfilled' ? lendBorrowResult.value : null
			}
		})
	)

	const yieldsChartData: Record<string, { chart: any; lendBorrow: any }> = {}
	for (const result of results) {
		if (result.status === 'fulfilled') {
			yieldsChartData[result.value.poolConfigId] = {
				chart: result.value.chart,
				lendBorrow: result.value.lendBorrow
			}
		}
	}

	return yieldsChartData
}

async function fetchProtocolFullData(items: DashboardItemConfig[]): Promise<Record<string, any>> {
	const protocols = new Set<string>()
	for (const item of items) {
		if (item.kind === 'advanced-tvl') protocols.add(item.protocol)
		else if (item.kind === 'advanced-borrowed') protocols.add(item.protocol)
	}
	if (protocols.size === 0) return {}

	const results = await Promise.allSettled(
		Array.from(protocols).map(async (protocol) => ({
			protocol,
			data: await withTimeout(
				fetchProtocolBySlug(protocol).catch(() => null),
				15_000
			)
		}))
	)

	const protocolData: Record<string, any> = {}
	for (const result of results) {
		if (result.status === 'fulfilled' && result.value.data) {
			protocolData[result.value.protocol] = result.value.data
		}
	}
	return protocolData
}

async function fetchMetricData(
	items: DashboardItemConfig[],
	timePeriod: TimePeriod,
	customTimePeriod: CustomTimePeriod | null
): Promise<Record<string, [number, number][]>> {
	const metricItems = items.filter((item): item is MetricConfig => item.kind === 'metric')
	if (metricItems.length === 0) return {}

	const results = await Promise.allSettled(
		metricItems.map(async (metric) => {
			const item = metric.subject.itemType === 'protocol' ? metric.subject.protocol || '' : metric.subject.chain || ''
			if (!item) return { key: '', data: [] as [number, number][] }

			const chartConfig: ChartConfig = {
				id: `metric-${metric.id}`,
				kind: 'chart',
				type: metric.type,
				protocol: metric.subject.itemType === 'protocol' ? item : '',
				chain: metric.subject.itemType === 'chain' ? item : '',
				geckoId: metric.subject.geckoId || null
			}

			const data = await withTimeout(fetchSingleChartData(chartConfig, 'all', null), 15_000)

			const keyParts = ['metric', metric.type, undefined, item]
			return { key: JSON.stringify(keyParts), data }
		})
	)

	const metricData: Record<string, [number, number][]> = {}
	for (const result of results) {
		if (result.status === 'fulfilled' && result.value.key && result.value.data?.length) {
			metricData[result.value.key] = result.value.data
		}
	}
	return metricData
}

const protocolChartFetchers: Record<
	string,
	(item: string, geckoId?: string | null, dataType?: string) => Promise<[number, number][]>
> = {
	tvl: (item) => ProtocolCharts.tvl(item),
	volume: (item) => ProtocolCharts.volume(item),
	fees: (item) => ProtocolCharts.fees(item),
	revenue: (item) => ProtocolCharts.revenue(item),
	holdersRevenue: (item) => ProtocolCharts.holdersRevenue(item),
	bribes: (item) => ProtocolCharts.bribes(item),
	tokenTax: (item) => ProtocolCharts.tokenTax(item),
	perps: (item) => ProtocolCharts.perps(item),
	openInterest: (item) => ProtocolCharts.openInterest(item),
	aggregators: (item) => ProtocolCharts.aggregators(item),
	perpsAggregators: (item) => ProtocolCharts.perpsAggregators(item),
	bridgeAggregators: (item) => ProtocolCharts.bridgeAggregators(item),
	optionsPremium: (item) => ProtocolCharts.optionsPremium(item),
	optionsNotional: (item) => ProtocolCharts.optionsNotional(item),
	liquidity: (item) => ProtocolCharts.liquidity(item),
	treasury: (item) => ProtocolCharts.treasury(item),
	incentives: (item) => ProtocolCharts.incentives(item),
	unlocks: (item, _, dataType) => ProtocolCharts.unlocks(item, (dataType as 'documented' | 'realtime') || 'documented'),
	tokenMcap: (item, geckoId) => ProtocolCharts.tokenMcap(item, geckoId!),
	tokenPrice: (item, geckoId) => ProtocolCharts.tokenPrice(item, geckoId!),
	tokenVolume: (item, geckoId) => ProtocolCharts.tokenVolume(item, geckoId!),
	medianApy: (item) => ProtocolCharts.medianApy(item),
	borrowed: (item) => ProtocolCharts.borrowed(item),
	pfRatio: (item) => fetchPfPsChartData(item, 'pf'),
	psRatio: (item) => fetchPfPsChartData(item, 'ps')
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

async function fetchSingleChartData(
	chart: ChartConfig,
	timePeriod: TimePeriod,
	customTimePeriod: CustomTimePeriod | null
): Promise<[number, number][]> {
	const itemType = chart.protocol ? 'protocol' : 'chain'
	const item = chart.protocol || chart.chain

	if (!item) return []

	let data: [number, number][]

	if (itemType === 'protocol') {
		const fetcher = protocolChartFetchers[chart.type]
		if (!fetcher) return []

		const tokenTypes = new Set(['tokenMcap', 'tokenPrice', 'tokenVolume'])
		if (tokenTypes.has(chart.type) && !chart.geckoId) return []

		data = await fetcher(item, chart.geckoId, chart.dataType)
	} else {
		data = await ChainCharts.getData(chart.type, item, chart.geckoId)
	}

	return filterDataByTimePeriod(data, timePeriod || 'all', customTimePeriod)
}

async function fetchAllChartData(
	items: DashboardItemConfig[],
	timePeriod: TimePeriod,
	customTimePeriod: CustomTimePeriod | null
): Promise<Record<string, [number, number][]>> {
	const chartItems = extractChartItems(items)
	if (chartItems.length === 0) return {}

	const CHART_FETCH_TIMEOUT = 10_000

	const results = await Promise.allSettled(
		chartItems.map((chart) =>
			withTimeout(fetchSingleChartData(chart, timePeriod, customTimePeriod), CHART_FETCH_TIMEOUT)
		)
	)

	const chartData: Record<string, [number, number][]> = {}
	chartItems.forEach((chart, i) => {
		const result = results[i]
		chartData[chart.id] = result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
	})

	return chartData
}

async function fetchAdvancedTvlBasicData(items: DashboardItemConfig[]): Promise<Record<string, [number, number][]>> {
	const protocols = new Set<string>()
	for (const item of items) {
		if (item.kind === 'advanced-tvl' && (item as AdvancedTvlChartConfig).chartType === 'tvl') {
			protocols.add((item as AdvancedTvlChartConfig).protocol)
		}
	}
	if (protocols.size === 0) return {}

	const results = await Promise.allSettled(
		Array.from(protocols).map(async (protocol) => ({
			protocol,
			data: await withTimeout(ProtocolCharts.tvl(protocol), 10_000)
		}))
	)

	const data: Record<string, [number, number][]> = {}
	for (const result of results) {
		if (result.status === 'fulfilled') {
			data[result.value.protocol] = result.value.data ?? []
		}
	}
	return data
}

async function fetchUnifiedTableServerData(
	items: DashboardItemConfig[]
): Promise<Record<string, { rows: NormalizedRow[]; chainMetrics?: Record<string, ChainMetrics> }>> {
	const unifiedTableItems = items.filter((item): item is UnifiedTableConfig => item.kind === 'unified-table')
	if (unifiedTableItems.length === 0) return {}

	const results = await Promise.allSettled(
		unifiedTableItems.map(async (config) => {
			const headers = sanitizeRowHeaders(config.rowHeaders)
			const paramsChains = config.params?.chains ?? []
			const paramsKey = JSON.stringify({ chains: paramsChains })
			const headersKey = headers.join('|')
			const cacheKey = JSON.stringify(['unified-table', paramsKey, headersKey])
			const data = await withTimeout(fetchProtocolsTable({ config, rowHeaders: headers }), 15_000)
			return { cacheKey, data }
		})
	)

	const data: Record<string, { rows: NormalizedRow[]; chainMetrics?: Record<string, ChainMetrics> }> = {}
	for (const result of results) {
		if (result.status === 'fulfilled' && result.value.data) {
			data[result.value.cacheKey] = result.value.data
		}
	}
	return data
}

async function fetchStablecoinsChartData(items: DashboardItemConfig[]): Promise<Record<string, any>> {
	const stablecoinsItems = items.filter((item): item is StablecoinsChartConfig => item.kind === 'stablecoins')
	if (stablecoinsItems.length === 0) return {}

	const uniqueChains = new Set<string>()
	for (const item of stablecoinsItems) {
		uniqueChains.add(item.chain)
	}

	const FETCH_TIMEOUT = 10_000

	try {
		const [peggedData, priceData, rateData] = await Promise.all([
			withTimeout(fetchStablecoinAssetsApi(), FETCH_TIMEOUT),
			withTimeout(fetchStablecoinPricesApi(), FETCH_TIMEOUT),
			withTimeout(fetchStablecoinRatesApi(), FETCH_TIMEOUT)
		])

		const { peggedAssets } = peggedData

		const chainResults = await Promise.allSettled(
			Array.from(uniqueChains).map(async (chain) => {
				const chainLabel = chain === 'All' ? 'all-llama-app' : chain
				const chainData = await withTimeout(fetchStablecoinChartApi(chainLabel), FETCH_TIMEOUT)
				const breakdown = chainData?.breakdown

				if (!breakdown) return { chain, data: null }

				let chartDataByPeggedAsset: any[] = []
				let peggedNameToChartDataIndex: Record<string, number> = {}
				let lastTimestamp = 0

				chartDataByPeggedAsset = peggedAssets.map((elem: any, i: number) => {
					peggedNameToChartDataIndex[elem.name] = i
					const charts = breakdown[elem.id] ?? []
					const formattedCharts = charts
						.map((chart: any) => ({
							date: chart.date,
							mcap: chart.totalCirculatingUSD
						}))
						.filter((i: any) => i.mcap !== undefined)

					if (formattedCharts.length > 0) {
						lastTimestamp = Math.max(lastTimestamp, formattedCharts[formattedCharts.length - 1].date)
					}

					return formattedCharts
				})

				for (const chart of chartDataByPeggedAsset) {
					const last = chart[chart.length - 1]
					if (!last) continue

					let lastDate = Number(last.date)
					while (lastDate < lastTimestamp) {
						lastDate += 24 * 3600
						chart.push({
							...last,
							date: lastDate
						})
					}
				}

				const peggedAssetNames = peggedAssets.map((p: any) => p.name)

				const filteredPeggedAssets = formatPeggedAssetsData({
					peggedAssets,
					chartDataByPeggedAsset,
					priceData,
					rateData,
					peggedNameToChartDataIndex,
					chain: chain === 'All' ? null : chain
				})

				const doublecountedIds: number[] = []
				for (let idx = 0; idx < peggedAssets.length; idx++) {
					const asset = peggedAssets[idx]
					if ((asset as unknown as { doublecounted?: boolean }).doublecounted) {
						doublecountedIds.push(idx)
					}
				}

				return {
					chain,
					data: {
						chartDataByPeggedAsset,
						peggedAssetNames,
						peggedNameToChartDataIndex,
						filteredPeggedAssets,
						doublecountedIds
					}
				}
			})
		)

		const result: Record<string, any> = {}
		for (const r of chainResults) {
			if (r.status === 'fulfilled' && r.value.data) {
				result[r.value.chain] = r.value.data
			}
		}
		return result
	} catch {
		return {}
	}
}

async function fetchEmissionData(items: DashboardItemConfig[]): Promise<Record<string, any>> {
	const FETCH_TIMEOUT = 10_000
	const tasks: Array<{ key: string; fn: () => Promise<any> }> = []

	const seenPieKeys = new Set<string>()
	const seenScheduleKeys = new Set<string>()

	for (const item of items) {
		if (item.kind === 'unlocks-pie') {
			const config = item as UnlocksPieConfig
			const cacheKey = JSON.stringify(['unlocks-pie', config.protocol])
			if (!seenPieKeys.has(cacheKey)) {
				seenPieKeys.add(cacheKey)
				tasks.push({
					key: cacheKey,
					fn: () => withTimeout(getProtocolEmissionsPieData(slug(config.protocol)), FETCH_TIMEOUT)
				})
			}
		} else if (item.kind === 'unlocks-schedule') {
			const config = item as UnlocksScheduleConfig
			const resolvedDataType = config.dataType === 'realtime' ? 'documented' : config.dataType
			const cacheKey = JSON.stringify(['unlocks-schedule', config.protocol, resolvedDataType])
			if (!seenScheduleKeys.has(cacheKey)) {
				seenScheduleKeys.add(cacheKey)
				tasks.push({
					key: cacheKey,
					fn: () => withTimeout(getProtocolEmissionsScheduleData(slug(config.protocol)), FETCH_TIMEOUT)
				})
			}
		}
	}

	if (tasks.length === 0) return {}

	const results = await Promise.allSettled(tasks.map((t) => t.fn()))
	const data: Record<string, any> = {}
	for (let i = 0; i < tasks.length; i++) {
		const result = results[i]
		if (result.status === 'fulfilled' && result.value) {
			data[tasks[i].key] = result.value
		}
	}
	return data
}

export async function getProDashboardServerData({
	dashboardId,
	authToken
}: {
	dashboardId: string
	authToken: string | null
}): Promise<ProDashboardServerProps> {
	const [dashboard, protocolsAndChains, appMetadata] = await Promise.all([
		fetchDashboardConfig(dashboardId, authToken),
		fetchProtocolsAndChains(),
		fetchAppMetadata()
	])

	let chartData: Record<string, [number, number][]> = {}
	let tableData: TableServerData | null = null
	let yieldsChartData: Record<string, { chart: any; lendBorrow: any }> = {}
	let protocolFullData: Record<string, any> = {}
	let metricData: Record<string, [number, number][]> = {}
	let advancedTvlBasicData: Record<string, [number, number][]> = {}
	let unifiedTableData: Record<string, { rows: NormalizedRow[]; chainMetrics?: Record<string, ChainMetrics> }> = {}
	let stablecoinsChartData: Record<string, any> = {}
	let emissionData: Record<string, any> = {}

	if (dashboard?.data?.items?.length) {
		const timePeriod = (dashboard.data.timePeriod || '365d') as TimePeriod
		const customTimePeriod = dashboard.data.customTimePeriod || null
		const [
			chartResult,
			tableResult,
			yieldsResult,
			protocolResult,
			metricResult,
			advTvlResult,
			unifiedResult,
			stablecoinsResult,
			emissionResult
		] = await Promise.allSettled([
			fetchAllChartData(dashboard.data.items, timePeriod, customTimePeriod),
			fetchTableServerData(dashboard.data.items),
			fetchAllYieldsChartData(dashboard.data.items),
			fetchProtocolFullData(dashboard.data.items),
			fetchMetricData(dashboard.data.items, timePeriod, customTimePeriod),
			fetchAdvancedTvlBasicData(dashboard.data.items),
			fetchUnifiedTableServerData(dashboard.data.items),
			fetchStablecoinsChartData(dashboard.data.items),
			fetchEmissionData(dashboard.data.items)
		])
		if (chartResult.status === 'fulfilled') chartData = chartResult.value
		if (tableResult.status === 'fulfilled') tableData = tableResult.value
		if (yieldsResult.status === 'fulfilled') yieldsChartData = yieldsResult.value
		if (protocolResult.status === 'fulfilled') protocolFullData = protocolResult.value
		if (metricResult.status === 'fulfilled') metricData = metricResult.value
		if (advTvlResult.status === 'fulfilled') advancedTvlBasicData = advTvlResult.value
		if (unifiedResult.status === 'fulfilled') unifiedTableData = unifiedResult.value
		if (stablecoinsResult.status === 'fulfilled') stablecoinsChartData = stablecoinsResult.value
		if (emissionResult.status === 'fulfilled') emissionData = emissionResult.value
	}

	return {
		dashboard,
		chartData,
		protocolsAndChains,
		appMetadata,
		tableData,
		yieldsChartData,
		protocolFullData,
		metricData,
		advancedTvlBasicData,
		unifiedTableData,
		stablecoinsChartData,
		emissionData
	}
}
