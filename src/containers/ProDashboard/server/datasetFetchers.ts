import { fetchAdapterChainMetrics } from '~/containers/AdapterMetrics/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { mergeMetricPeriods } from '~/containers/AdapterMetrics/metricPeriods'
import { getAdapterByChainPageData, getAdapterChainOverview } from '~/containers/AdapterMetrics/queries'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { slug } from '~/utils'
import { chainIconUrl } from '~/utils/icons'

interface DimensionDatasetOptions {
	adapterType: `${ADAPTER_TYPES}`
	route: string
	metricName: string
	chains?: string[]
	dataType?: string
	allCaseFetcher?: 'chainMetrics' | 'chainOverview'
	chainGuard?: string
	hasOpenInterestByChain?: boolean
	withChainBreakdown?: boolean
}

export async function fetchDimensionDataset({
	adapterType,
	route,
	metricName,
	chains,
	dataType,
	allCaseFetcher = 'chainMetrics',
	chainGuard,
	hasOpenInterestByChain,
	withChainBreakdown
}: DimensionDatasetOptions): Promise<any[]> {
	const chainList = chains ?? []
	const allChains = chainList.length === 0 || chainList.includes('All')

	if (allChains) {
		const data =
			allCaseFetcher === 'chainOverview'
				? await getAdapterChainOverview({ adapterType, chain: 'All', excludeTotalDataChart: true, dataType } as any)
				: await fetchAdapterChainMetrics({ adapterType, dataType, chain: 'All' } as any)
		return (data.protocols || [])
			.filter((p: any) => p.total24h > 0)
			.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const allProtocolsMap = new Map<string, any>()

	for (const chainName of chainList) {
		const chainSlug = slug(chainName)
		const chainData = metadataCache.chainMetadata[chainSlug]
		if (!chainData) continue
		if (chainGuard && !chainData[chainGuard]) continue

		const data = await getAdapterByChainPageData({
			adapterType,
			dataType,
			chain: chainData.name,
			route,
			metricName,
			...(hasOpenInterestByChain ? { hasOpenInterest: chainData.openInterest } : {})
		} as any).catch((e) => {
			console.info(`Chain page data not found ${adapterType} : chain:${chainName}`, e)
			return null
		})

		if (!data?.protocols) continue

		for (const protocol of data.protocols) {
			const key = protocol.defillamaId || protocol.name
			if (allProtocolsMap.has(key)) {
				const existing = allProtocolsMap.get(key)
				mergeMetricPeriods(existing, protocol)
				existing.chains = Array.from(new Set([...(existing.chains || []), chainName]))
				if (withChainBreakdown) {
					const normalizedChainKey = chainName.trim().toLowerCase()
					existing.chainBreakdown = existing.chainBreakdown || {}
					existing.chainBreakdown[normalizedChainKey] = {
						...protocol,
						change_7d: protocol.change_7d ?? protocol.change_7dover7d,
						chain: chainName
					}
				}
			} else {
				const entry: any = {
					...protocol,
					chains: [chainName],
					logo: protocol.logo,
					slug: protocol.slug
				}
				if (withChainBreakdown) {
					const normalizedChainKey = chainName.trim().toLowerCase()
					entry.chainBreakdown = {
						[normalizedChainKey]: {
							...protocol,
							change_7d: protocol.change_7d ?? protocol.change_7dover7d,
							chain: chainName
						}
					}
				}
				allProtocolsMap.set(key, entry)
			}
		}
	}

	return Array.from(allProtocolsMap.values())
		.filter((p: any) => p.total24h > 0)
		.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))
}

export interface DimensionDatasetSpec {
	datasetType: string
	hookPrefix: string
	keyChainsMode: 'raw' | 'filtered'
	options: Omit<DimensionDatasetOptions, 'chains'>
}

export const DIMENSION_DATASET_SPECS: DimensionDatasetSpec[] = [
	{
		datasetType: 'dexs',
		hookPrefix: 'dexs-overview',
		keyChainsMode: 'raw',
		options: { adapterType: ADAPTER_TYPES.DEXS, route: 'dexs', metricName: 'DEX Volume' }
	},
	{
		datasetType: 'perps',
		hookPrefix: 'perps-overview',
		keyChainsMode: 'raw',
		options: {
			adapterType: ADAPTER_TYPES.PERPS,
			route: 'perps',
			metricName: 'Perp Volume',
			hasOpenInterestByChain: true
		}
	},
	{
		datasetType: 'aggregators',
		hookPrefix: 'aggregators-overview',
		keyChainsMode: 'raw',
		options: {
			adapterType: ADAPTER_TYPES.AGGREGATORS,
			route: 'dex-aggregators',
			metricName: 'DEX Aggregator Volume',
			withChainBreakdown: true
		}
	},
	{
		datasetType: 'fees',
		hookPrefix: 'fees-overview',
		keyChainsMode: 'raw',
		options: { adapterType: ADAPTER_TYPES.FEES, route: 'fees', metricName: 'Fees' }
	},
	{
		datasetType: 'revenue',
		hookPrefix: 'revenue-overview',
		keyChainsMode: 'raw',
		options: {
			adapterType: ADAPTER_TYPES.FEES,
			route: 'revenue',
			metricName: 'Revenue',
			dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE
		}
	},
	{
		datasetType: 'earnings',
		hookPrefix: 'earnings-overview',
		keyChainsMode: 'raw',
		options: {
			adapterType: ADAPTER_TYPES.FEES,
			route: 'earnings',
			metricName: 'Earnings',
			dataType: ADAPTER_DATA_TYPES.DAILY_EARNINGS,
			allCaseFetcher: 'chainOverview',
			chainGuard: 'fees',
			withChainBreakdown: true
		}
	},
	{
		datasetType: 'holders-revenue',
		hookPrefix: 'holders-revenue-overview',
		keyChainsMode: 'raw',
		options: {
			adapterType: ADAPTER_TYPES.FEES,
			route: 'holders-revenue',
			metricName: 'Holders Revenue',
			dataType: ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE,
			chainGuard: 'fees'
		}
	},
	{
		datasetType: 'options',
		hookPrefix: 'options-overview',
		keyChainsMode: 'filtered',
		options: {
			adapterType: ADAPTER_TYPES.OPTIONS,
			route: 'options',
			metricName: 'Options Volume',
			withChainBreakdown: true
		}
	},
	{
		datasetType: 'bridge-aggregators',
		hookPrefix: 'bridge-aggregators-overview',
		keyChainsMode: 'raw',
		options: {
			adapterType: ADAPTER_TYPES.BRIDGE_AGGREGATORS,
			route: 'bridge-aggregators',
			metricName: 'Bridge Aggregator Volume',
			withChainBreakdown: true
		}
	}
]

export const DIMENSION_DATASET_SPEC_BY_TYPE: Record<string, DimensionDatasetSpec> = Object.fromEntries(
	DIMENSION_DATASET_SPECS.map((spec) => [spec.datasetType, spec])
)

export async function fetchChainsDatasetRows({
	category,
	limit
}: {
	category?: string
	limit?: number | null
}): Promise<any[]> {
	let categoryParam = typeof category === 'string' && category ? category : 'All'
	const normalizedLimit = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? limit : null

	if (categoryParam === 'Layer 2') {
		categoryParam = 'Rollup'
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const data = await getChainsByCategory({
		category: categoryParam,
		chainMetadata: metadataCache.chainMetadata,
		sampledChart: true
	})

	const chains = data.chains || []

	const formattedChains = chains.map((chain: any) => ({
		name: chain.name,
		icon: chainIconUrl(chain.name),
		protocols: chain.protocols || 0,
		users: chain.activeUsers24h ?? null,
		change_1d: chain.change_1d ?? null,
		change_7d: chain.change_7d ?? null,
		change_1m: chain.change_1m ?? null,
		tvl: chain.tvl ?? null,
		stablesMcap: chain.stablesMcap ?? null,
		totalVolume24h: chain.dexVolume24h ?? null,
		totalVolume7d: chain.dexVolume7d ?? null,
		totalVolume30d: chain.dexVolume30d ?? null,
		totalFees24h: chain.fees24h ?? null,
		totalFees7d: chain.fees7d ?? null,
		totalFees30d: chain.fees30d ?? null,
		totalRevenue24h: chain.revenue24h ?? null,
		totalRevenue7d: chain.revenue7d ?? null,
		totalRevenue30d: chain.revenue30d ?? null,
		totalAppRevenue24h: chain.appRevenue24h ?? null,
		totalAppRevenue7d: chain.appRevenue7d ?? null,
		totalAppRevenue30d: chain.appRevenue30d ?? null,
		bridgedTvl: chain.bridgedTvl ?? chain.chainAssets?.total?.total ?? null,
		mcaptvl: chain.mcaptvl ?? null,
		nftVolume: chain.nftVolume24h ?? null,
		mcap: chain.mcap ?? null,
		symbol: chain.symbol ?? null,
		extraTvl: chain.extraTvl ?? null
	}))

	const sortedChains = formattedChains
		.filter((chain: any) => chain.tvl > 0)
		.sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))

	return normalizedLimit !== null ? sortedChains.slice(0, normalizedLimit) : sortedChains
}
