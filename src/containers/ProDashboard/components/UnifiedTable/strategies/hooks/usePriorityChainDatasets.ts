import { useCallback, useMemo } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export type PriorityMetric = 'volume' | 'fees' | 'perps' | 'open-interest'

const MAX_CHAIN_REQUESTS = 50

interface ChainMetricEntry {
	chain: string
	normalized: string
	protocols: any[]
	error?: boolean
}

interface ChainMetricResponse {
	metric: PriorityMetric
	chains: ChainMetricEntry[]
}

interface PriorityChainDatasetResult {
	breakdowns: Map<string, Record<string, any>>
	loadingChains: Set<string>
	prefetchChains: (chains: string[]) => void
}

const sanitizeChains = (chains: string[]): string[] => {
	if (!chains?.length) return []
	const seen = new Set<string>()
	const result: string[] = []
	for (const chain of chains) {
		if (typeof chain !== 'string') continue
		const trimmed = chain.trim()
		if (!trimmed || trimmed.toLowerCase() === 'all' || trimmed.toLowerCase() === 'all chains') continue
		const normalized = trimmed.toLowerCase()
		if (seen.has(normalized)) continue
		seen.add(normalized)
		result.push(trimmed)
		if (result.length >= MAX_CHAIN_REQUESTS) {
			break
		}
	}
	return result
}

const toProtocolKey = (payload: any): string | null => {
	const id = payload?.defillamaId ?? payload?.id ?? payload?.slug ?? payload?.name ?? payload?.displayName
	if (!id) return null
	return String(id).toLowerCase()
}

const sanitizeSingleChain = (chain: string) => chain.trim().toLowerCase()

const fetchChainDataset = async (metric: PriorityMetric, chain: string): Promise<ChainMetricEntry | null> => {
	const trimmed = chain.trim()
	if (!trimmed) return null
	const query = `?chains=${encodeURIComponent(trimmed)}`
	const payload = (await fetchJson(`/api/datasets/chain-metrics/${metric}${query}`)) as ChainMetricResponse
	const entry = payload?.chains?.[0]
	if (entry) {
		return entry
	}
	return {
		chain: trimmed,
		normalized: trimmed.toLowerCase(),
		protocols: [],
		error: true
	}
}

export function usePriorityChainDatasets(
	metric: PriorityMetric,
	chains: string[] | undefined,
	enabled: boolean
): PriorityChainDatasetResult {
	const sanitizedChains = useMemo(() => sanitizeChains(chains ?? []), [chains])
	const queryClient = useQueryClient()

	const queries = useQueries({
		queries: sanitizedChains.map((chain) => {
			const normalized = sanitizeSingleChain(chain)
			return {
				queryKey: ['priority-chain-dataset', metric, normalized],
				queryFn: () => fetchChainDataset(metric, chain),
				enabled: enabled && sanitizedChains.length > 0,
				staleTime: 5 * 60 * 1000,
				refetchInterval: 5 * 60 * 1000,
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
				keepPreviousData: true
			}
		})
	})

	const breakdowns = useMemo(() => {
		const map = new Map<string, Record<string, any>>()
		queries.forEach((query, index) => {
			const chain = sanitizedChains[index]
			if (!chain) return
			const normalized = sanitizeSingleChain(chain)
			const entry = query.data
			if (!entry || entry.error || !entry.protocols?.length || !normalized) return
			for (const protocol of entry.protocols ?? []) {
				const key = toProtocolKey(protocol)
				if (!key) continue
				const existing = map.get(key) ?? {}
				existing[normalized] = { ...protocol, chain: entry.chain }
				map.set(key, existing)
			}
		})
		return map
	}, [queries, sanitizedChains])

	const loadingChains = useMemo(() => {
		const set = new Set<string>()
		queries.forEach((query, index) => {
			const chain = sanitizedChains[index]
			if (!chain) return
			const normalized = sanitizeSingleChain(chain)
			if (!normalized) return
			const hasData = Boolean(query.data && !query.data.error && Array.isArray(query.data.protocols))
			if ((!hasData && query.isFetching) || query.isLoading) {
				set.add(normalized)
			}
		})
		return set
	}, [queries, sanitizedChains])

	const prefetchChains = useCallback(
		(chainsToPrefetch: string[]) => {
			const targets = sanitizeChains(chainsToPrefetch)
			targets.forEach((chain) => {
				const normalized = sanitizeSingleChain(chain)
				if (!normalized) return
				queryClient.prefetchQuery({
					queryKey: ['priority-chain-dataset', metric, normalized],
					queryFn: () => fetchChainDataset(metric, chain),
					staleTime: 5 * 60 * 1000
				})
			})
		},
		[metric, queryClient]
	)

	return {
		breakdowns,
		loadingChains,
		prefetchChains
	}
}
