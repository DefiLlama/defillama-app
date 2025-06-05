import { useQuery, useQueries } from '@tanstack/react-query'
import { CHAINS_API, PROTOCOLS_API } from '~/constants'
import { sluggify } from '~/utils/cache-client'
import ProtocolCharts from './services/ProtocolCharts'
import ChainCharts from './services/ChainCharts'
import { getProtocolChartTypes, getChainChartTypes } from './types'

function generateChartKey(type: string, itemType: 'chain' | 'protocol', item: string, geckoId?: string | null): string {
	const baseKey = `${type}-${itemType}-${item}`
	return geckoId && ['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) ? `${baseKey}-${geckoId}` : baseKey
}

function getChartQueryKey(
	type: string,
	itemType: 'chain' | 'protocol',
	item: string,
	geckoId?: string | null
): (string | undefined)[] {
	if (itemType === 'protocol') {
		const tokenChartTypes = ['tokenMcap', 'tokenPrice', 'tokenVolume']
		return tokenChartTypes.includes(type) && geckoId ? [type, undefined, item, geckoId] : [type, undefined, item]
	} else {
		return [type, item]
	}
}

// Object maps for chart query functions
const protocolChartHandlers: Record<string, (item: string, geckoId?: string | null) => () => Promise<[number, number][]>> = {
	tvl: (item) => () => ProtocolCharts.tvl(item),
	volume: (item) => () => ProtocolCharts.volume(item),
	fees: (item) => () => ProtocolCharts.fees(item),
	revenue: (item) => () => ProtocolCharts.revenue(item),
	tokenMcap: (item, geckoId) => () => ProtocolCharts.tokenMcap(item, geckoId),
	tokenPrice: (item, geckoId) => () => ProtocolCharts.tokenPrice(item, geckoId),
	tokenVolume: (item, geckoId) => () => ProtocolCharts.tokenVolume(item, geckoId),
	medianApy: (item) => () => ProtocolCharts.medianApy(item)
}

const chainChartHandlers: Record<string, (item: string) => () => Promise<[number, number][]>> = {
	tvl: (item) => () => ChainCharts.tvl(item),
	volume: (item) => () => ChainCharts.volume(item),
	fees: (item) => () => ChainCharts.fees(item),
	users: (item) => () => ChainCharts.users(item),
	txs: (item) => () => ChainCharts.txs(item),
	aggregators: (item) => () => ChainCharts.aggregators(item),
	perps: (item) => () => ChainCharts.perps(item),
	bridgeAggregators: (item) => () => ChainCharts.bridgeAggregators(item),
	perpsAggregators: (item) => () => ChainCharts.perpsAggregators(item),
	options: (item) => () => ChainCharts.options(item),
	revenue: (item) => () => ChainCharts.revenue(item),
	bribes: (item) => () => ChainCharts.bribes(item),
	tokenTax: (item) => () => ChainCharts.tokenTax(item),
	activeUsers: (item) => () => ChainCharts.activeUsers(item),
	newUsers: (item) => () => ChainCharts.newUsers(item),
	gasUsed: (item) => () => ChainCharts.gasUsed(item)
}

function getChartQueryFn(type: string, itemType: 'chain' | 'protocol', item: string, geckoId?: string | null) {
	if (itemType === 'protocol') {
		const handler = protocolChartHandlers[type]
		if (handler) {
			return handler(item, geckoId)
		}
		console.error(`Unknown chart type for protocol: ${type}`)
		return () => Promise.resolve([])
	} else {
		const handler = chainChartHandlers[type]
		if (handler) {
			return handler(item)
		}
		console.error(`Unknown chart type for chain: ${type}`)
		return () => ChainCharts.tvl(item)
	}
}

export function useChartData(type: string, itemType: 'chain' | 'protocol', item: string, geckoId?: string | null) {
	return useQuery({
		queryKey: getChartQueryKey(type, itemType, item, geckoId),
		queryFn: getChartQueryFn(type, itemType, item, geckoId),
		enabled:
			!!item && (itemType !== 'protocol' || !['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) || !!geckoId)
	})
}

export { generateChartKey, getChartQueryKey, getChartQueryFn }

export function useChains() {
	return useQuery({
		queryKey: ['chains'],
		queryFn: async () => {
			const response = await fetch(CHAINS_API)
			const data = await response.json()
			return data.sort((a, b) => b.tvl - a.tvl)
		}
	})
}

export function useProtocolsAndChains() {
	return useQuery({
		queryKey: ['protocols'],
		queryFn: async () => {
			const response = await fetch(PROTOCOLS_API)
			if (!response.ok) {
				throw new Error('Network response was not ok')
			}
			const data = await response.json()
			return {
				protocols: data.protocols.map((p) => ({ ...p, slug: sluggify(p.name), geckoId: p.geckoId || null })),
				chains: data.chains.map((name) => ({ name, slug: sluggify(name) }))
			}
		}
	})
}

export function useChartsData(charts) {
	return useQueries({
		queries: charts.map((chart) => {
			const itemType = chart.protocol ? 'protocol' : 'chain'
			const item = chart.protocol || chart.chain

			return {
				queryKey: getChartQueryKey(chart.type, itemType, item, chart.geckoId),
				queryFn: getChartQueryFn(chart.type, itemType, item, chart.geckoId),
				enabled:
					!!item &&
					(itemType !== 'protocol' ||
						!['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(chart.type) ||
						!!chart.geckoId)
			}
		})
	})
}

export function useAvailableChartTypes(item: string | null, itemType: 'chain' | 'protocol', geckoId?: string | null) {
	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()

	const chartTypes = itemType === 'chain' ? chainChartTypes : protocolChartTypes
	const charts = item
		? chartTypes.map((type) => ({
				type,
				[itemType]: item,
				...(itemType === 'protocol' &&
					geckoId &&
					['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) && { geckoId })
		  }))
		: []

	const results = useChartsData(charts)

	const availableTypes = charts
		.filter((_, index) => {
			const result = results[index]
			if (!result || result.isError) return false
			const data = result.data
			return Array.isArray(data) && data.length > 0
		})
		.map((chart) => chart.type)

	const isLoading = availableTypes.length === 0 && results.some((result) => result.isLoading)

	return {
		availableChartTypes: availableTypes,
		isLoading,
		hasData: availableTypes.length > 0
	}
}
