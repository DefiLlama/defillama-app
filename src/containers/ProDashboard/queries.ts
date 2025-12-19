import { useMemo, useRef } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CHAINS_API, PROTOCOLS_API } from '~/constants'
import { sluggifyProtocol } from '~/utils/cache-client'
import { toDisplayName } from '~/utils/chainNormalizer'
import { CustomTimePeriod, TimePeriod } from './ProDashboardAPIContext'
import ChainCharts from './services/ChainCharts'
import ProtocolCharts from './services/ProtocolCharts'
import { CHART_TYPES, getChainChartTypes, getProtocolChartTypes } from './types'
import { groupData } from './utils'

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

export function useParentChildMapping() {
	const { data: protocolsData } = useProtocolsAndChains()
	const parentToChildren = useMemo(() => {
		const map = new Map<string, string[]>()
		if (protocolsData?.protocols?.length) {
			const parentIdToSlug = new Map<string, string>()
			for (const p of protocolsData.protocols) {
				if (!p.parentProtocol && p.id && p.slug) {
					parentIdToSlug.set(p.id, p.slug)
					if (!map.has(p.slug)) map.set(p.slug, [])
				}
			}
			for (const p of protocolsData.protocols) {
				if (p.parentProtocol) {
					const parentSlug = parentIdToSlug.get(p.parentProtocol)
					if (!parentSlug) continue
					const arr = map.get(parentSlug) || []
					arr.push(p.slug)
					map.set(parentSlug, arr)
				}
			}
		}
		return map
	}, [protocolsData])
	return { data: parentToChildren }
}

export function filterDataByTimePeriod(
	data: [number, number][],
	timePeriod: TimePeriod,
	customPeriod?: CustomTimePeriod | null
): [number, number][] {
	if (timePeriod === 'all' || !data.length) {
		return data
	}

	if (timePeriod === 'custom' && customPeriod) {
		if (customPeriod.type === 'relative' && customPeriod.relativeDays) {
			const cutoff = dayjs().subtract(customPeriod.relativeDays, 'day').unix()
			return data.filter(([ts]) => ts >= cutoff)
		}
		if (customPeriod.type === 'absolute' && customPeriod.startDate && customPeriod.endDate) {
			return data.filter(([ts]) => ts >= customPeriod.startDate! && ts <= customPeriod.endDate!)
		}
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
		case 'ytd':
			cutoffDate = now.startOf('year')
			break
		case '3y':
			cutoffDate = now.subtract(3, 'year')
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
	timePeriod?: TimePeriod,
	customPeriod?: CustomTimePeriod | null
): (string | undefined | number)[] {
	if (itemType === 'protocol') {
		const tokenChartTypes = ['tokenMcap', 'tokenPrice', 'tokenVolume']
		const baseKey =
			tokenChartTypes.includes(type) && geckoId ? [type, undefined, item, geckoId] : [type, undefined, item]
		if (timePeriod === 'custom' && customPeriod) {
			if (customPeriod.type === 'relative') {
				return [...baseKey, 'custom-relative', customPeriod.relativeDays]
			}
			return [...baseKey, 'custom-absolute', customPeriod.startDate, customPeriod.endDate]
		}
		return timePeriod ? [...baseKey, timePeriod] : baseKey
	} else {
		const chainTokenChartTypes = ['chainMcap', 'chainPrice']
		const baseKey = chainTokenChartTypes.includes(type) && geckoId ? [type, item, geckoId] : [type, item]
		if (timePeriod === 'custom' && customPeriod) {
			if (customPeriod.type === 'relative') {
				return [...baseKey, 'custom-relative', customPeriod.relativeDays]
			}
			return [...baseKey, 'custom-absolute', customPeriod.startDate, customPeriod.endDate]
		}
		return timePeriod ? [...baseKey, timePeriod] : baseKey
	}
}

// Object maps for chart query functions
const protocolChartHandlers: Record<
	string,
	(
		item: string,
		geckoId?: string | null,
		timePeriod?: TimePeriod,
		customPeriod?: CustomTimePeriod | null
	) => () => Promise<[number, number][]>
> = {
	tvl: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.tvl(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	volume: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.volume(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	fees: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.fees(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	liquidity: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.liquidity(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	treasury: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.treasury(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	incentives: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.incentives(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	revenue: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.revenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	holdersRevenue: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.holdersRevenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	bribes: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.bribes(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	tokenTax: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.tokenTax(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	perps: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.perps(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	openInterest: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.openInterest(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	aggregators: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.aggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	perpsAggregators: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.perpsAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	bridgeAggregators: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.bridgeAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	optionsPremium: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.optionsPremium(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	optionsNotional: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.optionsNotional(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	tokenMcap: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.tokenMcap(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	tokenPrice: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.tokenPrice(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	tokenVolume: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.tokenVolume(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	medianApy: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.medianApy(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	borrowed: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ProtocolCharts.borrowed(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	}
}

const chainChartHandlers: Record<
	string,
	(
		item: string,
		geckoId?: string | null,
		timePeriod?: TimePeriod,
		customPeriod?: CustomTimePeriod | null
	) => () => Promise<[number, number][]>
> = {
	tvl: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.tvl(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	volume: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.volume(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	fees: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.fees(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	users: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.users(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	txs: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.txs(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	aggregators: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.aggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	perps: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.perps(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	bridgeAggregators: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.bridgeAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	perpsAggregators: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.perpsAggregators(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	options: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.options(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	revenue: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.revenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	bribes: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.bribes(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	tokenTax: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.tokenTax(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	activeUsers: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.activeUsers(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	newUsers: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.newUsers(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	gasUsed: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.gasUsed(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	stablecoins: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.stablecoins(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	stablecoinInflows: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.stablecoinInflows(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	chainFees: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.chainFees(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	chainRevenue: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.chainRevenue(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	bridgedTvl: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.bridgedTvl(item)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	chainMcap: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.chainMcap(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	},
	chainPrice: (item, geckoId, timePeriod, customPeriod) => async () => {
		const data = await ChainCharts.chainPrice(item, geckoId)
		return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
	}
}

function getChartQueryFn(
	type: string,
	itemType: 'chain' | 'protocol',
	item: string,
	geckoId?: string | null,
	timePeriod?: TimePeriod,
	parentMapping?: Map<string, string[]>,
	customPeriod?: CustomTimePeriod | null
) {
	if (itemType === 'protocol') {
		const handler = protocolChartHandlers[type]
		if (!handler) {
			console.log(`Unknown chart type for protocol: ${type}`)
			return () => Promise.resolve([])
		}

		const tokenTypes = new Set(['tokenMcap', 'tokenPrice', 'tokenVolume'])

		return async () => {
			if (tokenTypes.has(type)) {
				return handler(item, geckoId, timePeriod, customPeriod)()
			}

			let direct: [number, number][] = []
			try {
				direct = await handler(item, geckoId, timePeriod, customPeriod)()
			} catch (e) {
				direct = []
			}
			if (Array.isArray(direct) && direct.length > 0) return direct

			const children = parentMapping?.get(item) || []
			if (children.length === 0) return direct

			const settled = await Promise.allSettled(
				children.map(async (childSlug) => {
					try {
						return await handler(childSlug, undefined, timePeriod, customPeriod)()
					} catch (e) {
						return [] as [number, number][]
					}
				})
			)
			const seriesList = settled
				.map((res) => (res.status === 'fulfilled' ? res.value : ([] as [number, number][])))
				.filter((arr) => Array.isArray(arr))

			const acc = new Map<number, number>()
			for (const series of seriesList) {
				for (const [ts, val] of series || []) {
					acc.set(ts, (acc.get(ts) || 0) + (val || 0))
				}
			}
			return Array.from(acc.entries()).sort((a, b) => a[0] - b[0]) as [number, number][]
		}
	} else {
		const handler = chainChartHandlers[type]
		if (handler) {
			return handler(item, geckoId, timePeriod, customPeriod)
		}
		console.log(`Unknown chart type for chain: ${type}`)
		return async () => {
			const data = await ChainCharts.tvl(item)
			return filterDataByTimePeriod(data, timePeriod || 'all', customPeriod)
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
	const { data: parentMapping } = useParentChildMapping()
	return useQuery({
		queryKey: getChartQueryKey(type, itemType, item, geckoId, timePeriod),
		queryFn: getChartQueryFn(type, itemType, item, geckoId, timePeriod, parentMapping),
		staleTime: 1000 * 60 * 5,
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
				name: toDisplayName(chain.name)
			}))
			return transformedData.sort((a, b) => b.tvl - a.tvl)
		},
		staleTime: 1000 * 60 * 60
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
				name: toDisplayName(chain.name)
			}))
			const parentProtocols = Array.isArray(protocolsData.parentProtocols) ? protocolsData.parentProtocols : []

			const baseProtocols = (protocolsData.protocols || []).map((p) => ({
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
				const key = p.slug
				if (!mergedBySlug.has(key)) mergedBySlug.set(key, p)
			}

			const mergedProtocols = Array.from(mergedBySlug.values())

			return {
				protocols: mergedProtocols,
				chains: transformedChains.sort((a, b) => b.tvl - a.tvl)
			}
		},
		staleTime: 1000 * 60 * 60
	})
}

function computeGrouped(
	groupingCache: Map<string, { data: any; grouping: any; result: any }>,
	id: string,
	data: any,
	grouping: any
) {
	const prev = groupingCache.get(id)
	if (prev && prev.data === data && prev.grouping === grouping) return prev.result
	const result = groupData(data, grouping)
	groupingCache.set(id, { data, grouping, result })
	return result
}

export function useChartsData(charts, timePeriod?: TimePeriod, customPeriod?: CustomTimePeriod | null) {
	const { data: parentMapping } = useParentChildMapping()
	const groupingCacheRef = useRef<Map<string, { data: any; grouping: any; result: any }>>(new Map())
	return useQueries({
		queries: charts.map((chart) => {
			const itemType = chart.protocol ? 'protocol' : 'chain'
			const item = chart.protocol || chart.chain

			return {
				queryKey: [
					...getChartQueryKey(chart.type, itemType, item, chart.geckoId, timePeriod, customPeriod),
					chart.grouping,
					chart.id
				],
				queryFn: getChartQueryFn(chart.type, itemType, item, chart.geckoId, timePeriod, parentMapping, customPeriod),
				keepPreviousData: true,
				placeholderData: (prev) => prev,
				select: (data) => {
					const chartTypeDetails = CHART_TYPES[chart.type]
					if (chartTypeDetails?.groupable && chart.grouping && chart.grouping !== 'day') {
						return computeGrouped(groupingCacheRef.current, chart.id, data, chart.grouping)
					}
					return data
				},
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
