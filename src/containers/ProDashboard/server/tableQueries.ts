import { PROTOCOLS_API } from '~/constants'
import { fetchProtocolsByToken } from '~/containers/TokenUsage/api'
import { fetchAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { slug } from '~/utils'
import { fetchApi } from '~/utils/async'
import {
	getDexVolumeByChain,
	getFeesAndRevenueProtocolsByChain,
	getOpenInterestByChain,
	getPerpsVolumeByChain
} from '../components/ProTable/proTable.api'
import type { DashboardItemConfig, ProtocolsTableConfig, UnifiedTableConfig } from '../types'

export interface TableServerData {
	protocolsList?: any
	volumeByChain: Record<string, any>
	feesByChain: Record<string, any>
	perpsByChain: Record<string, any>
	openInterestByChain: Record<string, any>
	datasetsByQueryKey: Record<string, any[]>
	tokenUsageByQueryKey: Record<string, any[]>
}

function extractTableChains(items: DashboardItemConfig[]): { chains: string[]; chainSets: string[][] } {
	const allChains = new Set<string>()
	const chainSets: string[][] = []

	for (const item of items) {
		let itemChains: string[] = []

		if (item.kind === 'table' && (item as ProtocolsTableConfig).tableType === 'protocols') {
			itemChains = (item as ProtocolsTableConfig).chains || []
		} else if (item.kind === 'unified-table') {
			itemChains = (item as UnifiedTableConfig).params?.chains || []
		}

		if (itemChains.length > 0) {
			chainSets.push(itemChains)
			for (const chain of itemChains) allChains.add(chain)
		}
	}

	return { chains: Array.from(allChains), chainSets }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

const FETCH_TIMEOUT = 10_000

interface DatasetConfig {
	queryKeyPrefix: string
	adapterType: `${(typeof ADAPTER_TYPES)[keyof typeof ADAPTER_TYPES]}`
	dataType?: string
	route: string
	metricName: string
	chainGuard?: string
}

const DATASET_CONFIGS: DatasetConfig[] = [
	{
		queryKeyPrefix: 'protocols-earnings-multi-chain',
		adapterType: ADAPTER_TYPES.FEES,
		dataType: ADAPTER_DATA_TYPES.DAILY_EARNINGS,
		route: 'earnings',
		metricName: 'Earnings',
		chainGuard: 'fees'
	},
	{
		queryKeyPrefix: 'protocols-aggregators-multi-chain',
		adapterType: ADAPTER_TYPES.AGGREGATORS,
		route: 'dex-aggregators',
		metricName: 'DEX Aggregator Volume'
	},
	{
		queryKeyPrefix: 'protocols-bridge-aggregators-multi-chain',
		adapterType: ADAPTER_TYPES.BRIDGE_AGGREGATORS,
		route: 'bridge-aggregators',
		metricName: 'Bridge Aggregator Volume'
	},
	{
		queryKeyPrefix: 'protocols-options-multi-chain',
		adapterType: ADAPTER_TYPES.OPTIONS,
		route: 'options',
		metricName: 'Options Volume'
	}
]

async function fetchDatasetForChains(config: DatasetConfig, chains: string[]): Promise<any[]> {
	if (chains.length === 0 || chains.includes('All')) {
		const data = await fetchAdapterChainMetrics({
			adapterType: config.adapterType as `${ADAPTER_TYPES}`,
			dataType: config.dataType as any,
			chain: 'All'
		})
		return (data.protocols || [])
			.filter((p: any) => p.total24h > 0)
			.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const allProtocolsMap = new Map<string, any>()

	for (const chainName of chains) {
		const chainSlug = slug(chainName)
		const chainData = metadataCache.chainMetadata[chainSlug]

		if (!chainData) continue
		if (config.chainGuard && !chainData[config.chainGuard]) continue

		const data = await getAdapterByChainPageData({
			adapterType: config.adapterType as `${ADAPTER_TYPES}`,
			dataType: config.dataType as any,
			chain: chainData.name,
			route: config.route,
			metricName: config.metricName
		}).catch(() => null)

		if (!data?.protocols) continue

		for (const protocol of data.protocols) {
			const key = protocol.defillamaId || protocol.name
			const normalizedChainKey = chainName.trim().toLowerCase()

			if (allProtocolsMap.has(key)) {
				const existing = allProtocolsMap.get(key)
				existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
				existing.total7d = (existing.total7d || 0) + (protocol.total7d || 0)
				existing.total30d = (existing.total30d || 0) + (protocol.total30d || 0)
				if (protocol.total1y != null) {
					existing.total1y = (existing.total1y || 0) + (protocol.total1y || 0)
				}
				existing.chains = Array.from(new Set([...(existing.chains || []), chainName]))
				existing.chainBreakdown = existing.chainBreakdown || {}
				existing.chainBreakdown[normalizedChainKey] = { ...protocol, chain: chainName }
			} else {
				allProtocolsMap.set(key, {
					...protocol,
					chains: [chainName],
					chainBreakdown: { [normalizedChainKey]: { ...protocol, chain: chainName } },
					logo: protocol.logo,
					slug: protocol.slug
				})
			}
		}
	}

	return Array.from(allProtocolsMap.values())
		.filter((p: any) => p.total24h > 0)
		.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))
}

interface TokenUsageConfig {
	tokenSymbols: string[]
	includeCex: boolean
}

function extractTokenUsageConfigs(items: DashboardItemConfig[]): TokenUsageConfig[] {
	const configs: TokenUsageConfig[] = []
	for (const item of items) {
		if (item.kind === 'table') {
			const tableItem = item as ProtocolsTableConfig
			if (tableItem.datasetType === 'token-usage' && tableItem.tokenSymbols?.length) {
				configs.push({
					tokenSymbols: tableItem.tokenSymbols,
					includeCex: tableItem.includeCex ?? false
				})
			}
		}
	}
	return configs
}

async function fetchTokenUsageData(tokenSymbols: string[], includeCex: boolean): Promise<any[]> {
	const promises = tokenSymbols.map(async (symbol) => {
		const data = await fetchProtocolsByToken(symbol)
		return { symbol, data }
	})

	const results = await Promise.all(promises)
	const protocolMap = new Map<string, any>()

	for (const { symbol, data } of results) {
		if (data) {
			for (const p of data as any[]) {
				const key = p.name
				if (protocolMap.has(key)) {
					const existing = protocolMap.get(key)!
					existing.tokens = existing.tokens || {}
					existing.tokens[symbol] = Object.values(p.amountUsd as Record<string, number>).reduce(
						(s: number, a: number) => s + a,
						0
					)
					existing.amountUsd += existing.tokens[symbol]
				} else {
					const tokenAmount = Object.values(p.amountUsd as Record<string, number>).reduce(
						(s: number, a: number) => s + a,
						0
					)
					protocolMap.set(key, {
						...p,
						amountUsdByChain: p.amountUsd,
						amountUsd: tokenAmount,
						tokens: { [symbol]: tokenAmount }
					})
				}
			}
		}
	}

	return Array.from(protocolMap.values()).filter(
		(protocol: any) =>
			!protocol.misrepresentedTokens && (protocol.category?.toLowerCase() === 'cex' ? includeCex : true)
	)
}

function buildTokenUsageCacheKey(tokenSymbols: string[], includeCex: boolean): string {
	return JSON.stringify(['token-usage', tokenSymbols.map((t) => t?.toUpperCase()).sort(), includeCex])
}

function buildDatasetCacheKey(prefix: string, chains: string[]): string {
	const sortedChains = chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort()
	return JSON.stringify([prefix, ...sortedChains])
}

export async function fetchTableServerData(items: DashboardItemConfig[]): Promise<TableServerData | null> {
	const { chains, chainSets } = extractTableChains(items)
	const tokenUsageConfigs = extractTokenUsageConfigs(items)
	if (chains.length === 0 && tokenUsageConfigs.length === 0) return null

	const tableData: TableServerData = {
		protocolsList: undefined,
		volumeByChain: {},
		feesByChain: {},
		perpsByChain: {},
		openInterestByChain: {},
		datasetsByQueryKey: {},
		tokenUsageByQueryKey: {}
	}

	if (chains.length > 0) {
		const chainsToFetch = chains.includes('All') ? ['All'] : chains

		const results = await Promise.allSettled([
			withTimeout(fetchApi(PROTOCOLS_API), FETCH_TIMEOUT),
			...chainsToFetch.flatMap((chain) => [
				withTimeout(
					getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						(data) => ({ type: 'volume' as const, chain, data: { chain, protocols: data?.protocols ?? [] } })
					),
					FETCH_TIMEOUT
				),
				withTimeout(
					getFeesAndRevenueProtocolsByChain({ chain }).then((data) => ({
						type: 'fees' as const,
						chain,
						data: { chain, protocols: data ?? [] }
					})),
					FETCH_TIMEOUT
				),
				withTimeout(
					getPerpsVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						(data) => ({ type: 'perps' as const, chain, data: { chain, protocols: data?.protocols ?? [] } })
					),
					FETCH_TIMEOUT
				),
				withTimeout(
					getOpenInterestByChain({ chain }).then((data) => ({
						type: 'openInterest' as const,
						chain,
						data: { chain, protocols: data?.protocols ?? [] }
					})),
					FETCH_TIMEOUT
				)
			])
		])

		const [protocolsResult, ...overviewResults] = results

		if (protocolsResult.status === 'fulfilled') {
			tableData.protocolsList = protocolsResult.value
		}

		for (const result of overviewResults) {
			if (result.status !== 'fulfilled') continue
			const { type, chain, data } = result.value
			switch (type) {
				case 'volume':
					tableData.volumeByChain[chain] = data
					break
				case 'fees':
					tableData.feesByChain[chain] = data
					break
				case 'perps':
					tableData.perpsByChain[chain] = data
					break
				case 'openInterest':
					tableData.openInterestByChain[chain] = data
					break
			}
		}

		const uniqueChainSets = new Map<string, string[]>()
		for (const cs of chainSets) {
			const key = [...cs].sort().join(',')
			if (!uniqueChainSets.has(key)) uniqueChainSets.set(key, cs)
		}

		const datasetFetches: Promise<{ cacheKey: string; data: any[] }>[] = []
		for (const [, chainSet] of uniqueChainSets) {
			for (const config of DATASET_CONFIGS) {
				const cacheKey = buildDatasetCacheKey(config.queryKeyPrefix, chainSet)
				datasetFetches.push(
					withTimeout(fetchDatasetForChains(config, chainSet), FETCH_TIMEOUT * 3).then((data) => ({
						cacheKey,
						data
					}))
				)
			}
		}

		const datasetResults = await Promise.allSettled(datasetFetches)
		for (const result of datasetResults) {
			if (result.status !== 'fulfilled') continue
			tableData.datasetsByQueryKey[result.value.cacheKey] = result.value.data
		}
	}

	if (tokenUsageConfigs.length > 0) {
		const tokenUsageFetches: Promise<{ cacheKey: string; data: any[] }>[] = []
		for (const config of tokenUsageConfigs) {
			const cacheKey = buildTokenUsageCacheKey(config.tokenSymbols, config.includeCex)
			tokenUsageFetches.push(
				withTimeout(fetchTokenUsageData(config.tokenSymbols, config.includeCex), FETCH_TIMEOUT).then((data) => ({
					cacheKey,
					data
				}))
			)
		}

		const tokenUsageResults = await Promise.allSettled(tokenUsageFetches)
		for (const result of tokenUsageResults) {
			if (result.status !== 'fulfilled') continue
			tableData.tokenUsageByQueryKey[result.value.cacheKey] = result.value.data
		}
	}

	return tableData
}
