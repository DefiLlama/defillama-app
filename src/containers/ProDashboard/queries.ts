import { useQuery, useQueries } from '@tanstack/react-query'
import { CHAINS_API, PROTOCOLS_API } from '~/constants'
import { sluggify } from '~/utils/cache-client'
import ProtocolCharts from './services/ProtocolCharts'
import ChainCharts from './services/ChainCharts'
import { getProtocolChartTypes, getChainChartTypes } from './types'
import { TimePeriod } from './ProDashboardAPIContext'
import dayjs from 'dayjs'

function generateChartKey(
	type: string,
	itemType: 'chain' | 'protocol',
	item: string,
	geckoId?: string | null,
	timePeriod?: TimePeriod
): string {
	const baseKey = `${type}-${itemType}-${item}`
	const keyWithGecko =
		geckoId && ['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) ? `${baseKey}-${geckoId}` : baseKey
	return timePeriod ? `${keyWithGecko}-${timePeriod}` : keyWithGecko
}

function filterDataByTimePeriod(data: [number, number][], timePeriod: TimePeriod): [number, number][] {
	if (timePeriod === 'all' || !data.length) {
		return data
	}

	const now = dayjs()
	let cutoffDate: dayjs.Dayjs

	switch (timePeriod) {
		case '30d':
			cutoffDate = now.subtract(30, 'day')
			break
		case '90d':
			cutoffDate = now.subtract(90, 'day')
			break
		case '365d':
			cutoffDate = now.subtract(365, 'day')
			break
		default:
			return data
	}

	const cutoffTimestamp = cutoffDate.unix()
	return data.filter(([timestamp]) => timestamp >= cutoffTimestamp)
}

function getChartQueryKey(
	type: string,
	itemType: 'chain' | 'protocol',
	item: string,
	geckoId?: string | null,
	timePeriod?: TimePeriod
): (string | undefined)[] {
	if (itemType === 'protocol') {
		const tokenChartTypes = ['tokenMcap', 'tokenPrice', 'tokenVolume']
		const baseKey =
			tokenChartTypes.includes(type) && geckoId ? [type, undefined, item, geckoId] : [type, undefined, item]
		return timePeriod ? [...baseKey, timePeriod] : baseKey
	} else {
		const chainTokenChartTypes = ['chainMcap', 'chainPrice']
		const baseKey = chainTokenChartTypes.includes(type) && geckoId ? [type, item, geckoId] : [type, item]
		return timePeriod ? [...baseKey, timePeriod] : baseKey
	}
}

// Object maps for chart query functions
const protocolChartHandlers: Record<
	string,
	(item: string, geckoId?: string | null, timePeriod?: TimePeriod) => () => Promise<[number, number][]>
> = {
	tvl: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.tvl(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	volume: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.volume(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	fees: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.fees(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	revenue: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.revenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	tokenMcap: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.tokenMcap(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	tokenPrice: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.tokenPrice(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	tokenVolume: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.tokenVolume(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	medianApy: (item, geckoId, timePeriod) => async () => {
		const data = await ProtocolCharts.medianApy(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	}
}

const chainChartHandlers: Record<
	string,
	(item: string, geckoId?: string | null, timePeriod?: TimePeriod) => () => Promise<[number, number][]>
> = {
	tvl: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.tvl(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	volume: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.volume(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	fees: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.fees(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	users: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.users(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	txs: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.txs(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	aggregators: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.aggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	perps: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.perps(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	bridgeAggregators: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.bridgeAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	perpsAggregators: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.perpsAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	options: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.options(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	revenue: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.revenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	bribes: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.bribes(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	tokenTax: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.tokenTax(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	activeUsers: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.activeUsers(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	newUsers: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.newUsers(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	gasUsed: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.gasUsed(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	stablecoins: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.stablecoins(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	stablecoinInflows: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.stablecoinInflows(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	chainFees: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.chainFees(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	chainRevenue: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.chainRevenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	bridgedTvl: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.bridgedTvl(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	chainMcap: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.chainMcap(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	chainPrice: (item, geckoId, timePeriod) => async () => {
		const data = await ChainCharts.chainPrice(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	}
}

function getChartQueryFn(
	type: string,
	itemType: 'chain' | 'protocol',
	item: string,
	geckoId?: string | null,
	timePeriod?: TimePeriod
) {
	if (itemType === 'protocol') {
		const handler = protocolChartHandlers[type]
		if (handler) {
			return handler(item, geckoId, timePeriod)
		}
		console.error(`Unknown chart type for protocol: ${type}`)
		return () => Promise.resolve([])
	} else {
		const handler = chainChartHandlers[type]
		if (handler) {
			return handler(item, geckoId, timePeriod)
		}
		console.error(`Unknown chart type for chain: ${type}`)
		return async () => {
			const data = await ChainCharts.tvl(item)
			return filterDataByTimePeriod(data, timePeriod || 'all')
		}
	}
}

export function useChartData(
	type: string,
	itemType: 'chain' | 'protocol',
	item: string,
	geckoId?: string | null,
	timePeriod?: TimePeriod
) {
	return useQuery({
		queryKey: getChartQueryKey(type, itemType, item, geckoId, timePeriod),
		queryFn: getChartQueryFn(type, itemType, item, geckoId, timePeriod),
		enabled:
			!!item &&
			((itemType === 'protocol' && (!['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) || !!geckoId)) ||
				(itemType === 'chain' && (!['chainMcap', 'chainPrice'].includes(type) || !!geckoId)))
	})
}

export { generateChartKey, getChartQueryKey, getChartQueryFn }

export function useChains() {
	return useQuery({
		queryKey: ['chains'],
		queryFn: async () => {
			const response = await fetch(CHAINS_API)
			const data = await response.json()
			const transformedData = data.map((chain) => ({
				...chain,
				name: chain.name === 'Binance' ? 'BSC' : chain.name
			}))
			return transformedData.sort((a, b) => b.tvl - a.tvl)
		}
	})
}

export function useProtocolsAndChains() {
	return useQuery({
		queryKey: ['protocols-and-chains'],
		queryFn: async () => {
			// Fetch both protocols and chains data in parallel
			const [protocolsResponse, chainsResponse] = await Promise.all([fetch(PROTOCOLS_API), fetch(CHAINS_API)])

			if (!protocolsResponse.ok || !chainsResponse.ok) {
				throw new Error('Network response was not ok')
			}

			const protocolsData = await protocolsResponse.json()
			const chainsData = await chainsResponse.json()

			const transformedChains = chainsData.map((chain) => ({
				...chain,
				name: chain.name === 'Binance' ? 'BSC' : chain.name
			}))

			return {
				protocols: protocolsData.protocols.map((p) => ({ ...p, slug: sluggify(p.name), geckoId: p.geckoId || null })),
				chains: transformedChains.sort((a, b) => b.tvl - a.tvl)
			}
		}
	})
}

export function useChartsData(charts, timePeriod?: TimePeriod) {
	return useQueries({
		queries: charts.map((chart) => {
			const itemType = chart.protocol ? 'protocol' : 'chain'
			const item = chart.protocol || chart.chain

			return {
				queryKey: [...getChartQueryKey(chart.type, itemType, item, chart.geckoId, timePeriod), chart.id],
				queryFn: getChartQueryFn(chart.type, itemType, item, chart.geckoId, timePeriod),
				enabled:
					!!item &&
					((itemType === 'protocol' &&
						(!['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(chart.type) || !!chart.geckoId)) ||
						(itemType === 'chain' && (!['chainMcap', 'chainPrice'].includes(chart.type) || !!chart.geckoId)))
			}
		})
	})
}

export function useAvailableChartTypes(
	item: string | null,
	itemType: 'chain' | 'protocol',
	geckoId?: string | null,
	timePeriod?: TimePeriod
) {
	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()

	const chartTypes = itemType === 'chain' ? chainChartTypes : protocolChartTypes
	const charts = item
		? chartTypes.map((type) => ({
				type,
				[itemType]: item,
				...((itemType === 'protocol' &&
					geckoId &&
					['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) && { geckoId }) ||
					(itemType === 'chain' && geckoId && ['chainMcap', 'chainPrice'].includes(type) && { geckoId }))
		  }))
		: []

	const results = useChartsData(charts, timePeriod)

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
