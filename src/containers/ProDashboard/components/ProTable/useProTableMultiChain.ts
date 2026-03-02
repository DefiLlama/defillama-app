'use no memo'

import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo, useRef } from 'react'
import { fetchProtocols } from '~/containers/Protocols/api'
import { basicPropertiesToKeep, formatProtocolsData } from '~/containers/Protocols/utils.old'
import { fetchJson } from '~/utils/async'
import {
	getDexVolumeByChain,
	getFeesAndRevenueProtocolsByChain,
	getOpenInterestByChain,
	getPerpsVolumeByChain
} from './proTable.api'

type WeightedAccumulator = { numerator: number; denominator: number }
type WeightedStore = Record<string, WeightedAccumulator>

const WEIGHTED_ACC_SYMBOL: unique symbol = Symbol('weightedAccumulators')

const toFiniteNumber = (value: unknown): number | null => {
	if (value == null) return null
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
		for (const key in store) {
			const accumulator = store[key]
			result[key] = accumulator.denominator > 0 ? accumulator.numerator / accumulator.denominator : undefined
		}
		delete result[WEIGHTED_ACC_SYMBOL]
	}

	if (options?.computeRatios) {
		const mcap = toFiniteNumber(result.mcap ?? result.marketCap)
		if (mcap !== null) {
			const fees30d = toFiniteNumber(result.total30d)
			if (fees30d !== null && fees30d > 0) {
				result.pf = Number((mcap / (fees30d * 12)).toFixed(2))
			}
			const revenue30d = toFiniteNumber(result.revenue30d)
			if (revenue30d !== null && revenue30d > 0) {
				result.ps = Number((mcap / (revenue30d * 12)).toFixed(2))
			}
		}
	}

	return result
}

export function useGetProtocolsListMultiChain(chains: string[]) {
	const { data: allProtocolsData, isLoading: isLoadingAll } = useQuery({
		queryKey: ['protocols-lite'],
		queryFn: () => fetchProtocols(),
		staleTime: Infinity,
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

		for (const chain of chains) {
			const chainProtocols = formatProtocolsData({
				chain,
				protocols,
				removeBridges: true,
				protocolProps: [...basicPropertiesToKeep, 'extraTvl', 'oracles', 'oraclesByChain']
			})

			for (const protocol of chainProtocols) {
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
						for (const k in protocol.oraclesByChain) {
							const cur = new Set([...(existing.oraclesByChain[k] || []), ...protocol.oraclesByChain[k]])
							existing.oraclesByChain[k] = Array.from(cur)
						}
					}
				} else {
					protocolsMap.set(protocol.name, { ...protocol })
				}
			}
		}

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
			queryKey: ['pro-dashboard', 'protocols-volume-by-chain', chain],
			queryFn: () =>
				getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
					(data) => ({ chain, protocols: data?.protocols ?? [] })
				),
			staleTime: Infinity,
			retry: 1
		}))
	})

	const queriesRef = useRef(queries)
	queriesRef.current = queries

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const dataKey = queries.map((q) => q.dataUpdatedAt).join(',')

	const data = useMemo(() => {
		const queryDatas = queriesRef.current.map((q) => q.data)
		// dataKey is intentionally read only to retrigger memo when query data timestamps change.
		void dataKey
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		for (const payload of queryDatas) {
			if (!payload?.protocols) continue
			for (const protocol of payload.protocols as any[]) {
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
			}
		}

		return Array.from(protocolsMap.values()).map((protocol) => finalizeAggregatedProtocol(protocol))
	}, [shouldFetchAll, dataKey])

	return { data, isLoading, error }
}

export function useGetProtocolsFeesAndRevenueByMultiChain(chains: string[]) {
	const shouldFetchAll = chains.length === 0 || chains.includes('All')
	const chainsToFetch = shouldFetchAll ? ['All'] : chains

	const queries = useQueries({
		queries: chainsToFetch.map((chain) => ({
			queryKey: ['pro-dashboard', 'protocols-fees-revenue-by-chain', chain],
			queryFn: () => getFeesAndRevenueProtocolsByChain({ chain }).then((data) => ({ chain, protocols: data ?? [] })),
			staleTime: Infinity,
			retry: 1
		}))
	})

	const queriesRef = useRef(queries)
	queriesRef.current = queries

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const dataKey = queries.map((q) => q.dataUpdatedAt).join(',')

	const data = useMemo(() => {
		const queryDatas = queriesRef.current.map((q) => q.data)
		// dataKey is intentionally read only to retrigger memo when query data timestamps change.
		void dataKey
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		for (const payload of queryDatas) {
			if (!payload?.protocols) continue
			for (const protocol of payload.protocols as any[]) {
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
			}
		}

		return Array.from(protocolsMap.values()).map((protocol) =>
			finalizeAggregatedProtocol(protocol, { computeRatios: true })
		)
	}, [shouldFetchAll, dataKey])

	return { data, isLoading, error }
}

export function useGetProtocolsPerpsVolumeByMultiChain(chains: string[]) {
	const shouldFetchAll = chains.length === 0 || chains.includes('All')
	const chainsToFetch = shouldFetchAll ? ['All'] : chains

	const queries = useQueries({
		queries: chainsToFetch.map((chain) => ({
			queryKey: ['pro-dashboard', 'protocols-perps-volume-by-chain', chain],
			queryFn: () =>
				getPerpsVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
					(data) => ({ chain, protocols: data?.protocols ?? [] })
				),
			staleTime: Infinity,
			retry: 1
		}))
	})

	const queriesRef = useRef(queries)
	queriesRef.current = queries

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const dataKey = queries.map((q) => q.dataUpdatedAt).join(',')

	const data = useMemo(() => {
		const queryDatas = queriesRef.current.map((q) => q.data)
		// dataKey is intentionally read only to retrigger memo when query data timestamps change.
		void dataKey
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		for (const payload of queryDatas) {
			if (!payload?.protocols) continue
			for (const protocol of payload.protocols as any[]) {
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
			}
		}

		return Array.from(protocolsMap.values()).map((protocol) => finalizeAggregatedProtocol(protocol))
	}, [shouldFetchAll, dataKey])

	return { data, isLoading, error }
}

export function useGetProtocolsOpenInterestByMultiChain(chains: string[]) {
	const shouldFetchAll = chains.length === 0 || chains.includes('All')
	const chainsToFetch = shouldFetchAll ? ['All'] : chains

	const queries = useQueries({
		queries: chainsToFetch.map((chain) => ({
			queryKey: ['pro-dashboard', 'protocols-open-interest-by-chain', chain],
			queryFn: () => getOpenInterestByChain({ chain }).then((data) => ({ chain, protocols: data?.protocols ?? [] })),
			staleTime: Infinity,
			retry: 1
		}))
	})

	const queriesRef = useRef(queries)
	queriesRef.current = queries

	const isLoading = queries.some((q) => q.isLoading)
	const error = queries.find((q) => q.error)?.error

	const dataKey = queries.map((q) => q.dataUpdatedAt).join(',')

	const data = useMemo(() => {
		const queryDatas = queriesRef.current.map((q) => q.data)
		// dataKey is intentionally read only to retrigger memo when query data timestamps change.
		void dataKey
		if (shouldFetchAll && queryDatas[0]) return queryDatas[0].protocols

		const protocolsMap = new Map<string, any>()

		for (const payload of queryDatas) {
			if (!payload?.protocols) continue
			for (const protocol of payload.protocols as any[]) {
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
			}
		}

		return Array.from(protocolsMap.values())
	}, [shouldFetchAll, dataKey])

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
		'pro-dashboard',
		'protocols-earnings-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/earnings${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: Infinity,
		retry: 1
	})
}

export function useGetProtocolsAggregatorsByMultiChain(chains: string[]) {
	const queryKey = [
		'pro-dashboard',
		'protocols-aggregators-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/aggregators${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: Infinity,
		retry: 1
	})
}

export function useGetProtocolsBridgeAggregatorsByMultiChain(chains: string[]) {
	const queryKey = [
		'pro-dashboard',
		'protocols-bridge-aggregators-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/bridge-aggregators${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: Infinity,
		retry: 1
	})
}

export function useGetProtocolsOptionsVolumeByMultiChain(chains: string[]) {
	const queryKey = [
		'pro-dashboard',
		'protocols-options-multi-chain',
		...(chains.includes('All') || chains.length === 0 ? ['All'] : [...chains].sort())
	]
	return useQuery({
		queryKey,
		queryFn: () => fetchJson(`/api/datasets/options${buildChainsQuery(chains)}`) as Promise<any[]>,
		staleTime: Infinity,
		retry: 1
	})
}
