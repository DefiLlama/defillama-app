import { CONFIG_API, FEATURES_SERVER } from '~/constants'
import { fetchChainsList } from '~/containers/Chains/api'
import { fetchProtocols } from '~/containers/ProtocolLists/api'
import type { ChainMetrics } from '~/server/unifiedTable/protocols'
import { sluggifyProtocol } from '~/utils/cache-client'
import { toDisplayName } from '~/utils/chainNormalizer'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import type { NormalizedRow } from './components/UnifiedTable/types'
import type { CustomTimePeriod, TimePeriod } from './dashboardReducer'
import { filterDataByTimePeriod } from './queries'
import { createServerAuthorizedFetch } from './server/auth'
import { fetchPfPsChartData, fetchPfPsProtocols } from './server/pfPsQueries'
import type { TableServerData } from './server/tableQueries'
import ChainCharts from './services/ChainCharts'
import type { Dashboard } from './services/DashboardAPI'
import ProtocolCharts from './services/ProtocolCharts'
import type { ChartConfig, DashboardItemConfig, YieldsChartConfig } from './types'

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

export async function fetchDashboardConfig(dashboardId: string, authToken: string | null): Promise<Dashboard | null> {
	try {
		const url = `${FEATURES_SERVER}/dashboards/${dashboardId}`
		const fetchFn = authToken ? createServerAuthorizedFetch(authToken) : fetch
		const response = await fetchFn(url)
		if (!response.ok) return null
		return response.json()
	} catch {
		return null
	}
}

export async function fetchDashboardConfigWithStatus(
	dashboardId: string,
	authToken: string | null
): Promise<{ dashboard: Dashboard | null; status: number }> {
	try {
		const url = `${FEATURES_SERVER}/dashboards/${dashboardId}`
		const fetchFn = authToken ? createServerAuthorizedFetch(authToken) : fetch
		const response = await fetchFn(url)
		if (!response.ok) return { dashboard: null, status: response.status }
		return { dashboard: await response.json(), status: response.status }
	} catch {
		return { dashboard: null, status: 500 }
	}
}

export async function fetchProtocolsAndChains(): Promise<{ protocols: any[]; chains: any[] } | null> {
	try {
		const [protocolsData, chainsData] = await Promise.all([fetchProtocols(), fetchChainsList()])

		const transformedChains = chainsData.map((chain: any) => ({
			...chain,
			name: toDisplayName(chain.name)
		}))

		const parentProtocols = Array.isArray(protocolsData.parentProtocols) ? protocolsData.parentProtocols : []
		const parentGeckoIds = new Map(parentProtocols.map((pp: any) => [pp.id, pp.gecko_id || null]))

		const baseProtocols = (protocolsData.protocols || []).map((p: any) => ({
			...p,
			slug: sluggifyProtocol(p.name),
			geckoId: p.geckoId || parentGeckoIds.get(p.parentProtocol) || null,
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

		const syntheticParents = parentProtocols.map((pp: any) => {
			const nameSlug = sluggifyProtocol(pp.name ?? '')
			return {
				id: pp.id ?? null,
				name: pp.name ?? null,
				logo: pp.logo ?? null,
				slug: nameSlug || `id-${pp.id}`,
				tvl: parentTotals.get(pp.id) || 0,
				geckoId: pp.gecko_id || null,
				parentProtocol: null
			}
		})

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

export async function fetchAppMetadata(): Promise<ProDashboardServerProps['appMetadata']> {
	try {
		const [protocols, chains, pfPs] = await Promise.all([
			fetchWithPoolingOnServer(`${CONFIG_API}/smol/appMetadata-protocols.json`).then((r) => (r.ok ? r.json() : null)),
			fetchWithPoolingOnServer(`${CONFIG_API}/smol/appMetadata-chains.json`).then((r) => (r.ok ? r.json() : null)),
			fetchPfPsProtocols().catch(() => ({ pf: [] as string[], ps: [] as string[] }))
		])

		if (!protocols || !chains) return null
		return { protocols, chains, pfPs }
	} catch {
		return null
	}
}

export function extractChartItems(items: DashboardItemConfig[]): ChartConfig[] {
	const chartItems: ChartConfig[] = []
	for (const item of items) {
		if (item.kind === 'chart') chartItems.push(item)
		else if (item.kind === 'multi') chartItems.push(...item.items)
	}
	return chartItems
}

export function extractYieldsItems(items: DashboardItemConfig[]): YieldsChartConfig[] {
	return items.filter((item): item is YieldsChartConfig => item.kind === 'yields')
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

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

export async function fetchSingleChartData(
	chart: ChartConfig,
	timePeriod: TimePeriod,
	customTimePeriod: CustomTimePeriod | null
): Promise<[number, number][]> {
	const tokenTypes = new Set(['tokenMcap', 'tokenPrice', 'tokenVolume'])
	const itemType = chart.protocol ? 'protocol' : 'chain'
	const item = chart.protocol || chart.chain

	if (tokenTypes.has(chart.type) && chart.geckoId) {
		const fetcher = protocolChartFetchers[chart.type]
		if (!fetcher) return []
		const data = await fetcher(item ?? '', chart.geckoId, chart.dataType)
		return filterDataByTimePeriod(data, timePeriod || 'all', customTimePeriod)
	}

	if (!item) return []

	let data: [number, number][]

	if (itemType === 'protocol') {
		const fetcher = protocolChartFetchers[chart.type]
		if (!fetcher) return []

		if (tokenTypes.has(chart.type) && !chart.geckoId) return []

		data = await fetcher(item, chart.geckoId, chart.dataType)
	} else {
		data = await ChainCharts.getData(chart.type, item, chart.geckoId)
	}

	return filterDataByTimePeriod(data, timePeriod || 'all', customTimePeriod)
}
