import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { PROTOCOLS_API } from '~/constants'
import { fetchApi } from '~/utils/async'
import { getDexVolumeByChain, getFeesAndRevenueProtocolsByChain } from '../adaptors'
import { formatProtocolsData } from '../protocols/utils'

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
					removeBridges: true
				}),
				parentProtocols
			}
		}

		const protocolsMap = new Map<string, any>()

		chains.forEach((chain) => {
			const chainProtocols = formatProtocolsData({
				chain,
				protocols,
				removeBridges: true
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
				if (existing) {
					existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
					existing.total7d = (existing.total7d || 0) + (protocol.total7d || 0)
					existing.total30d = (existing.total30d || 0) + (protocol.total30d || 0)
					existing.totalAllTime = (existing.totalAllTime || 0) + (protocol.totalAllTime || 0)
					if (!existing.chains) existing.chains = []
					if (!existing.chains.includes(payload.chain)) existing.chains.push(payload.chain)
				} else {
					protocolsMap.set(protocol.name, { ...protocol, chains: [payload.chain] })
				}
			})
		})

		return Array.from(protocolsMap.values())
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
					if (!existing.chains) existing.chains = []
					if (!existing.chains.includes(payload.chain)) existing.chains.push(payload.chain)
					if (existing.feesChange_7dover7d == null && protocol.feesChange_7dover7d != null)
						existing.feesChange_7dover7d = protocol.feesChange_7dover7d
					if (existing.feesChange_30dover30d == null && protocol.feesChange_30dover30d != null)
						existing.feesChange_30dover30d = protocol.feesChange_30dover30d
					if (existing.revenueChange_7dover7d == null && protocol.revenueChange_7dover7d != null)
						existing.revenueChange_7dover7d = protocol.revenueChange_7dover7d
					if (existing.revenueChange_30dover30d == null && protocol.revenueChange_30dover30d != null)
						existing.revenueChange_30dover30d = protocol.revenueChange_30dover30d
				} else {
					protocolsMap.set(key, { ...protocol, chains: [payload.chain] })
				}
			})
		})
		return Array.from(protocolsMap.values())
	}, [shouldFetchAll, ...queryDatas])

	return { data, isLoading, error }
}
