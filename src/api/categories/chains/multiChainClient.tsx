import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { PROTOCOLS_API } from '~/constants'
import { fetchApi, fetchJson } from '~/utils/async'
import {
	getDexVolumeByChain,
	getFeesAndRevenueProtocolsByChain,
	getOpenInterestByChain,
	getPerpsVolumeByChain
} from '../adaptors'
import { basicPropertiesToKeep, formatProtocolsData } from '../protocols/utils'

type WeightedAccumulator = { numerator: number; denominator: number }
type WeightedStore = Record<string, WeightedAccumulator>

const WEIGHTED_ACC_SYMBOL: unique symbol = Symbol('weightedAccumulators')

const toFiniteNumber = (value: unknown): number | null => {
	if (value === null || value === undefined) return null
	const num = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(num) ? num : null
}

const ensureWeightedStore = (target: Record<string | symbol, any>): WeightedStore => {
	if (!target[WEIGHTED_ACC_SYMBOL]) {
		Object.defineProperty(target, WEIGHTED_ACC_SYMBOL, {
			value: {} as WeightedStore,
			enumerable: false,
			writable: true,
			configurable: true
		})
	}
	return target[WEIGHTED_ACC_SYMBOL] as WeightedStore
}

const applyWeightedChange = (target: Record<string | symbol, any>, key: string, weight: unknown, change: unknown) => {
	const numericChange = toFiniteNumber(change)
	const numericWeight = toFiniteNumber(weight)
	if (numericChange === null || numericWeight === null || numericWeight <= 0) return

	const store = ensureWeightedStore(target)
	const accumulator = store[key] ?? { numerator: 0, denominator: 0 }
	accumulator.numerator += numericChange * numericWeight
	accumulator.denominator += numericWeight
	store[key] = accumulator
	target[key] = accumulator.denominator > 0 ? accumulator.numerator / accumulator.denominator : undefined
}

const finalizeAggregatedProtocol = (entry: Record<string | symbol, any>, options?: { computeRatios?: boolean }) => {
	const result = { ...entry }
	const store = entry[WEIGHTED_ACC_SYMBOL] as WeightedStore | undefined
	if (store) {
		Object.entries(store).forEach(([key, accumulator]) => {
			result[key] = accumulator.denominator > 0 ? accumulator.numerator / accumulator.denominator : undefined
		})
		delete result[WEIGHTED_ACC_SYMBOL]
	}

	if (options?.computeRatios) {
		const mcap = toFiniteNumber(result.mcap ?? result.marketCap)
		if (mcap !== null) {
			const fees24h = toFiniteNumber(result.total24h)
			if (fees24h !== null && fees24h > 0) {
				result.pf = mcap / fees24h
			}
			const revenue24h = toFiniteNumber(result.revenue24h)
			if (revenue24h !== null && revenue24h > 0) {
				result.ps = mcap / revenue24h
			}
		}
	}

	return result
}

export function useGetProtocolsListMultiChain(chains: string[]) {
	const { data: allProtocolsData, isLoading: isLoadingAll } = useQuery({
		queryKey: [PROTOCOLS_API],
		queryFn: () => fetchApi(PROTOCOLS_API),
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { fullProtocolsList, parentProtocols } = useMemo(() => {
		if (!allProtocolsData) {
			return { fullProtocolsList: [], parentProtocols: [] }
		}

		const { protocols, parentProtocols } = allProtocolsData

		if (chains.length === 0 || chains.includes('All')) {
			return {
				fullProtocolsList: formatProtocolsData({
					chain: null,
					protocols,
					removeBridges: true,
					protocolProps: [...basicPropertiesToKeep, 'extraTvl', 'oracles', 'oraclesByChain']
				}),
				parentProtocols
			}
		}

		const protocolsMap = new Map<string, any>()

		chains.forEach((chain) => {
			const chainProtocols = formatProtocolsData({
				chain,
				protocols,
				removeBridges: true,
				protocolProps: [...basicPropertiesToKeep, 'extraTvl', 'oracles', 'oraclesByChain']
			})

			chainProtocols.forEach((protocol) => {
				const existing = protocolsMap.get(protocol.name)
				if (existing) {
					existing.tvl = (existing.tvl || 0) + (protocol.tvl || 0)
					existing.tvlPrevDay = (existing.tvlPrevDay || 0) + (protocol.tvlPrevDay || 0)
					existing.tvlPrevWeek = (existing.tvlPrevWeek || 0) + (protocol.tvlPrevWeek || 0)
					existing.tvlPrevMonth = (existing.tvlPrevMonth || 0) + (protocol.tvlPrevMonth || 0)

					if (protocol.chains && Array.isArray(protocol.chains)) {
						existing.chains = [...new Set([...existing.chains, ...protocol.chains])]
					}
					if (Array.isArray(protocol.oracles)) {
						const merged = new Set([...(existing.oracles || []), ...protocol.oracles])
						existing.oracles = Array.from(merged)
					}
					if (protocol.oraclesByChain) {
						existing.oraclesByChain = existing.oraclesByChain || {}
						for (const k of Object.keys(protocol.oraclesByChain)) {
							const cur = new Set([...(existing.oraclesByChain[k] || []), ...protocol.oraclesByChain[k]])
							existing.oraclesByChain[k] = Array.from(cur)
						}
					}
				} else {
					protocolsMap.set(protocol.name, { ...protocol })
				}
			})
		})

		return {
			fullProtocolsList: Array.from(protocolsMap.values()),
			parentProtocols
		}
	}, [allProtocolsData, chains])

	return {
		fullProtocolsList,
		parentProtocols,
		isLoading: isLoadingAll
	}
}

export function useGetProtocolsVolumeByMultiChain(chains: string[]) {
	const shouldFetchAll = chains.length === 0 || chains.includes('All')
	const chainsToFetch = shouldFetchAll ? ['All'] : chains

	const queries = useQueries({
		queries: chainsToFetch.map((chain) => ({
			queryKey: [`protocolsVolumeByChain/${chain}`],
			queryFn: () =>
				getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
					(data) => ({ chain, protocols: data?.protocols ?? [] })
				),
			staleTime: 60 * 60 * 1000
		}))
	})

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const queryDatas = queries.map((q) => q.data)

	const data = useMemo(() => {
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		queryDatas.forEach((payload) => {
			if (!payload?.protocols) return
			payload.protocols.forEach((protocol: any) => {
				const existing = protocolsMap.get(protocol.name)
				const change7d = protocol.change_7d ?? protocol.change_7dover7d
				const chainName = payload.chain
				const normalizedChainKey = typeof chainName === 'string' ? chainName.trim().toLowerCase() : ''
				const chainEntry = {
					...protocol,
					change_7d: change7d,
					chain: chainName
				}

				if (existing) {
					existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
					existing.total7d = (existing.total7d || 0) + (protocol.total7d || 0)
					existing.total30d = (existing.total30d || 0) + (protocol.total30d || 0)
					existing.totalAllTime = (existing.totalAllTime || 0) + (protocol.totalAllTime || 0)

					applyWeightedChange(existing, 'change_1d', protocol.total24h, protocol.change_1d)
					applyWeightedChange(existing, 'change_7d', protocol.total7d, change7d)
					applyWeightedChange(existing, 'change_1m', protocol.total30d, protocol.change_1m)

					if (!existing.chains) existing.chains = []
					if (chainName && !existing.chains.includes(chainName)) existing.chains.push(chainName)
					if (normalizedChainKey) {
						existing.chainBreakdown = existing.chainBreakdown || {}
						existing.chainBreakdown[normalizedChainKey] = chainEntry
					}
				} else {
					const newEntry: any = {
						...protocol,
						chains: chainName ? [chainName] : [],
						chainBreakdown: normalizedChainKey ? { [normalizedChainKey]: chainEntry } : undefined
					}
					applyWeightedChange(newEntry, 'change_1d', protocol.total24h, protocol.change_1d)
					applyWeightedChange(newEntry, 'change_7d', protocol.total7d, change7d)
					applyWeightedChange(newEntry, 'change_1m', protocol.total30d, protocol.change_1m)
					protocolsMap.set(protocol.name, newEntry)
				}
			})
		})

		return Array.from(protocolsMap.values()).map((protocol) => finalizeAggregatedProtocol(protocol))
	}, [shouldFetchAll, ...queryDatas])

	return { data, isLoading, error }
}

export function useGetProtocolsFeesAndRevenueByMultiChain(chains: string[]) {
	const shouldFetchAll = chains.length === 0 || chains.includes('All')
	const chainsToFetch = shouldFetchAll ? ['All'] : chains

	const queries = useQueries({
		queries: chainsToFetch.map((chain) => ({
			queryKey: [`protocolsFeesAndRevenueByChain/${chain}`],
			queryFn: () => getFeesAndRevenueProtocolsByChain({ chain }).then((data) => ({ chain, protocols: data ?? [] })),
			staleTime: 60 * 60 * 1000
		}))
	})

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const queryDatas = queries.map((q) => q.data)

	const data = useMemo(() => {
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		queryDatas.forEach((payload) => {
			if (!payload?.protocols) return
			payload.protocols.forEach((protocol: any) => {
				const key = protocol.name
				const existing = protocolsMap.get(key)
				const chainName = payload.chain
				const normalizedChainKey = typeof chainName === 'string' ? chainName.trim().toLowerCase() : ''
				const chainEntry = {
					...protocol,
					chain: chainName
				}

				if (existing) {
					existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
					existing.total7d = (existing.total7d || 0) + (protocol.total7d || 0)
					existing.total30d = (existing.total30d || 0) + (protocol.total30d || 0)
					existing.totalAllTime = (existing.totalAllTime || 0) + (protocol.totalAllTime || 0)
					existing.revenue24h = (existing.revenue24h || 0) + (protocol.revenue24h || 0)
					existing.revenue7d = (existing.revenue7d || 0) + (protocol.revenue7d || 0)
					existing.revenue30d = (existing.revenue30d || 0) + (protocol.revenue30d || 0)
					existing.revenue1y = (existing.revenue1y || 0) + (protocol.revenue1y || 0)
					existing.holdersRevenue24h = (existing.holdersRevenue24h || 0) + (protocol.holdersRevenue24h || 0)
					existing.holdersRevenue30d = (existing.holdersRevenue30d || 0) + (protocol.holdersRevenue30d || 0)

					applyWeightedChange(existing, 'feesChange_1d', protocol.total24h, protocol.feesChange_1d)
					applyWeightedChange(existing, 'feesChange_7d', protocol.total7d, protocol.feesChange_7d)
					applyWeightedChange(existing, 'feesChange_1m', protocol.total30d, protocol.feesChange_1m)
					applyWeightedChange(existing, 'revenueChange_1d', protocol.revenue24h, protocol.revenueChange_1d)
					applyWeightedChange(existing, 'revenueChange_7d', protocol.revenue7d, protocol.revenueChange_7d)
					applyWeightedChange(existing, 'revenueChange_1m', protocol.revenue30d, protocol.revenueChange_1m)

					if (!existing.chains) existing.chains = []
					if (chainName && !existing.chains.includes(chainName)) existing.chains.push(chainName)
					if (existing.feesChange_7dover7d == null && protocol.feesChange_7dover7d != null)
						existing.feesChange_7dover7d = protocol.feesChange_7dover7d
					if (existing.feesChange_30dover30d == null && protocol.feesChange_30dover30d != null)
						existing.feesChange_30dover30d = protocol.feesChange_30dover30d
					if (existing.revenueChange_7dover7d == null && protocol.revenueChange_7dover7d != null)
						existing.revenueChange_7dover7d = protocol.revenueChange_7dover7d
					if (existing.revenueChange_30dover30d == null && protocol.revenueChange_30dover30d != null)
						existing.revenueChange_30dover30d = protocol.revenueChange_30dover30d
					if (existing.holdersRevenueChange_7dover7d == null && protocol.holdersRevenueChange_7dover7d != null)
						existing.holdersRevenueChange_7dover7d = protocol.holdersRevenueChange_7dover7d
					if (existing.holdersRevenueChange_30dover30d == null && protocol.holdersRevenueChange_30dover30d != null)
						existing.holdersRevenueChange_30dover30d = protocol.holdersRevenueChange_30dover30d
					if (normalizedChainKey) {
						existing.chainBreakdown = existing.chainBreakdown || {}
						existing.chainBreakdown[normalizedChainKey] = chainEntry
					}
				} else {
					const newEntry: any = {
						...protocol,
						chains: chainName ? [chainName] : [],
						chainBreakdown: normalizedChainKey ? { [normalizedChainKey]: chainEntry } : undefined
					}
					applyWeightedChange(newEntry, 'feesChange_1d', protocol.total24h, protocol.feesChange_1d)
					applyWeightedChange(newEntry, 'feesChange_7d', protocol.total7d, protocol.feesChange_7d)
					applyWeightedChange(newEntry, 'feesChange_1m', protocol.total30d, protocol.feesChange_1m)
					applyWeightedChange(newEntry, 'revenueChange_1d', protocol.revenue24h, protocol.revenueChange_1d)
					applyWeightedChange(newEntry, 'revenueChange_7d', protocol.revenue7d, protocol.revenueChange_7d)
					applyWeightedChange(newEntry, 'revenueChange_1m', protocol.revenue30d, protocol.revenueChange_1m)
					protocolsMap.set(key, newEntry)
				}
			})
		})

		return Array.from(protocolsMap.values()).map((protocol) =>
			finalizeAggregatedProtocol(protocol, { computeRatios: true })
		)
	}, [shouldFetchAll, ...queryDatas])

	return { data, isLoading, error }
}

export function useGetProtocolsPerpsVolumeByMultiChain(chains: string[]) {
	const shouldFetchAll = chains.length === 0 || chains.includes('All')
	const chainsToFetch = shouldFetchAll ? ['All'] : chains

	const queries = useQueries({
		queries: chainsToFetch.map((chain) => ({
			queryKey: [`protocolsPerpsVolumeByChain/${chain}`],
			queryFn: () =>
				getPerpsVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
					(data) => ({ chain, protocols: data?.protocols ?? [] })
				),
			staleTime: 60 * 60 * 1000
		}))
	})

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const queryDatas = queries.map((q) => q.data)

	const data = useMemo(() => {
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		queryDatas.forEach((payload) => {
			if (!payload?.protocols) return
			payload.protocols.forEach((protocol: any) => {
				const existing = protocolsMap.get(protocol.name)
				const chainName = payload.chain
				const normalizedChainKey = typeof chainName === 'string' ? chainName.trim().toLowerCase() : ''
				const chainEntry = {
					...protocol,
					chain: chainName
				}

				if (existing) {
					existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
					existing.total7d = (existing.total7d || 0) + (protocol.total7d || 0)
					existing.total30d = (existing.total30d || 0) + (protocol.total30d || 0)
					existing.totalAllTime = (existing.totalAllTime || 0) + (protocol.totalAllTime || 0)
					applyWeightedChange(existing, 'change_1d', protocol.total24h, protocol.change_1d)
					applyWeightedChange(existing, 'change_7d', protocol.total7d, protocol.change_7d ?? protocol.change_7dover7d)
					applyWeightedChange(existing, 'change_1m', protocol.total30d, protocol.change_1m)
					if (!existing.chains) existing.chains = []
					if (chainName && !existing.chains.includes(chainName)) existing.chains.push(chainName)
					if (normalizedChainKey) {
						existing.chainBreakdown = existing.chainBreakdown || {}
						existing.chainBreakdown[normalizedChainKey] = chainEntry
					}
				} else {
					const newEntry: any = {
						...protocol,
						chains: chainName ? [chainName] : [],
						chainBreakdown: normalizedChainKey ? { [normalizedChainKey]: chainEntry } : undefined
					}
					applyWeightedChange(newEntry, 'change_1d', protocol.total24h, protocol.change_1d)
					applyWeightedChange(newEntry, 'change_7d', protocol.total7d, protocol.change_7d ?? protocol.change_7dover7d)
					applyWeightedChange(newEntry, 'change_1m', protocol.total30d, protocol.change_1m)
					protocolsMap.set(protocol.name, newEntry)
				}
			})
		})

		return Array.from(protocolsMap.values()).map((protocol) => finalizeAggregatedProtocol(protocol))
	}, [shouldFetchAll, ...queryDatas])

	return { data, isLoading, error }
}

export function useGetProtocolsOpenInterestByMultiChain(chains: string[]) {
	const shouldFetchAll = chains.length === 0 || chains.includes('All')
	const chainsToFetch = shouldFetchAll ? ['All'] : chains

	const queries = useQueries({
		queries: chainsToFetch.map((chain) => ({
			queryKey: [`protocolsOpenInterestByChain/${chain}`],
			queryFn: () => getOpenInterestByChain({ chain }).then((data) => ({ chain, protocols: data?.protocols ?? [] })),
			staleTime: 60 * 60 * 1000
		}))
	})

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const queryDatas = queries.map((q) => q.data)

	const data = useMemo(() => {
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		queryDatas.forEach((payload) => {
			if (!payload?.protocols) return
			payload.protocols.forEach((protocol: any) => {
				const existing = protocolsMap.get(protocol.name)
				const chainName = payload.chain
				const normalizedChainKey = typeof chainName === 'string' ? chainName.trim().toLowerCase() : ''
				const chainEntry = {
					...protocol,
					chain: chainName
				}

				if (existing) {
					existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
					if (!existing.chains) existing.chains = []
					if (chainName && !existing.chains.includes(chainName)) existing.chains.push(chainName)
					if (normalizedChainKey) {
						existing.chainBreakdown = existing.chainBreakdown || {}
						existing.chainBreakdown[normalizedChainKey] = chainEntry
					}
				} else {
					const entry: any = {
						...protocol,
						chains: chainName ? [chainName] : [],
						chainBreakdown: normalizedChainKey ? { [normalizedChainKey]: chainEntry } : undefined
					}
					protocolsMap.set(protocol.name, entry)
				}
			})
		})

		return Array.from(protocolsMap.values())
	}, [shouldFetchAll, ...queryDatas])

	return { data, isLoading, error }
}

const buildChainsQuery = (chains: string[]) => {
	if (!chains || chains.length === 0 || chains.includes('All')) return ''
	const uniq = Array.from(new Set(chains)).sort((a, b) => a.localeCompare(b))
	if (uniq.length === 0) return ''
	return `?${uniq.map((chain) => `chains=${encodeURIComponent(chain)}`).join('&')}`
}

export function useGetProtocolsEarningsByMultiChain(chains: string[]) {
	const queryKey = [
		'protocols-earnings-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/earnings${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000
	})
}

export function useGetProtocolsAggregatorsByMultiChain(chains: string[]) {
	const queryKey = [
		'protocols-aggregators-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/aggregators${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000
	})
}

export function useGetProtocolsBridgeAggregatorsByMultiChain(chains: string[]) {
	const queryKey = [
		'protocols-bridge-aggregators-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/bridge-aggregators${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000
	})
}

export function useGetProtocolsOptionsVolumeByMultiChain(chains: string[]) {
	const queryKey = [
		'protocols-options-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/options${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000
	})
}
