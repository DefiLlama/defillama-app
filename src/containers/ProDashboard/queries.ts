import { useQuery, useQueries } from '@tanstack/react-query'
import { CHAINS_API, PROTOCOLS_API } from '~/constants'
import { sluggify } from '~/utils/cache-client'
import ProtocolCharts from './services/ProtocolCharts'
import ChainCharts from './services/ChainCharts'
import { getProtocolChartTypes, getChainChartTypes } from './types'
import { TimePeriod } from './ProDashboardAPIContext'
import dayjs from 'dayjs'

function generateChartKey(type: string, itemType: 'chain' | 'protocol', item: string, geckoId?: string | null, timePeriod?: TimePeriod): string {
	const baseKey = `${type}-${itemType}-${item}`
	const keyWithGecko = geckoId && ['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) ? `${baseKey}-${geckoId}` : baseKey
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
		const baseKey = tokenChartTypes.includes(type) && geckoId ? [type, undefined, item, geckoId] : [type, undefined, item]
		return timePeriod ? [...baseKey, timePeriod] : baseKey
	} else {
		const baseKey = [type, item]
		return timePeriod ? [...baseKey, timePeriod] : baseKey
	}
}

// Object maps for chart query functions
const protocolChartHandlers: Record<string, (item: string, geckoId?: string | null, timePeriod?: TimePeriod) => () => Promise<[number, number][]>> = {
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

const chainChartHandlers: Record<string, (item: string, timePeriod?: TimePeriod) => () => Promise<[number, number][]>> = {
	tvl: (item, timePeriod) => async () => {
		const data = await ChainCharts.tvl(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	volume: (item, timePeriod) => async () => {
		const data = await ChainCharts.volume(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	fees: (item, timePeriod) => async () => {
		const data = await ChainCharts.fees(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	users: (item, timePeriod) => async () => {
		const data = await ChainCharts.users(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	txs: (item, timePeriod) => async () => {
		const data = await ChainCharts.txs(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	aggregators: (item, timePeriod) => async () => {
		const data = await ChainCharts.aggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	perps: (item, timePeriod) => async () => {
		const data = await ChainCharts.perps(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	bridgeAggregators: (item, timePeriod) => async () => {
		const data = await ChainCharts.bridgeAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	perpsAggregators: (item, timePeriod) => async () => {
		const data = await ChainCharts.perpsAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	options: (item, timePeriod) => async () => {
		const data = await ChainCharts.options(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	revenue: (item, timePeriod) => async () => {
		const data = await ChainCharts.revenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	bribes: (item, timePeriod) => async () => {
		const data = await ChainCharts.bribes(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	tokenTax: (item, timePeriod) => async () => {
		const data = await ChainCharts.tokenTax(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	activeUsers: (item, timePeriod) => async () => {
		const data = await ChainCharts.activeUsers(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	newUsers: (item, timePeriod) => async () => {
		const data = await ChainCharts.newUsers(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	},
	gasUsed: (item, timePeriod) => async () => {
		const data = await ChainCharts.gasUsed(item)
		return filterDataByTimePeriod(data, timePeriod || 'all')
	}
}

function getChartQueryFn(type: string, itemType: 'chain' | 'protocol', item: string, geckoId?: string | null, timePeriod?: TimePeriod) {
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
			return handler(item, timePeriod)
		}
		console.error(`Unknown chart type for chain: ${type}`)
		return async () => {
			const data = await ChainCharts.tvl(item)
			return filterDataByTimePeriod(data, timePeriod || 'all')
		}
	}
}

export function useChartData(type: string, itemType: 'chain' | 'protocol', item: string, geckoId?: string | null, timePeriod?: TimePeriod) {
	return useQuery({
		queryKey: getChartQueryKey(type, itemType, item, geckoId, timePeriod),
		queryFn: getChartQueryFn(type, itemType, item, geckoId, timePeriod),
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
					(itemType !== 'protocol' ||
						!['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(chart.type) ||
						!!chart.geckoId)
			}
		})
	})
}

export function useAvailableChartTypes(item: string | null, itemType: 'chain' | 'protocol', geckoId?: string | null, timePeriod?: TimePeriod) {
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
