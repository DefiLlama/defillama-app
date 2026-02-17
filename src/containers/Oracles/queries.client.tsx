import { useQueries } from '@tanstack/react-query'
import * as React from 'react'
import type { OracleBreakdownItem } from './types'
import {
	fetchOracleChainProtocolBreakdownChart,
	fetchOracleProtocolBreakdownChart,
	fetchOracleProtocolChainBreakdownChart,
	fetchOracleProtocolChart
} from './api'

export function useOraclesByChainExtraBreakdowns({
	enabledExtraApiKeys,
	chain
}: {
	enabledExtraApiKeys: string[]
	chain: string | null
}) {
	const extraBreakdownQueries = useQueries({
		queries: enabledExtraApiKeys.map((apiKey) => ({
			queryKey: ['oracles', 'extra-breakdown', chain ?? 'all', apiKey],
			queryFn: () =>
				chain
					? fetchOracleChainProtocolBreakdownChart({ chain, key: apiKey })
					: fetchOracleProtocolBreakdownChart({ key: apiKey }),
			enabled: enabledExtraApiKeys.length > 0,
			staleTime: 5 * 60 * 1_000,
			refetchOnWindowFocus: false
		}))
	})

	const extraBreakdownsByApiKey = React.useMemo(() => {
		const result: Record<string, Array<OracleBreakdownItem>> = {}
		for (let index = 0; index < enabledExtraApiKeys.length; index++) {
			const apiKey = enabledExtraApiKeys[index]
			const chart = extraBreakdownQueries[index]?.data
			if (chart) {
				result[apiKey] = chart
			}
		}
		return result
	}, [enabledExtraApiKeys, extraBreakdownQueries])

	const isFetchingExtraBreakdowns = extraBreakdownQueries.some((query) => query.isLoading || query.isFetching)

	return {
		extraBreakdownsByApiKey,
		isFetchingExtraBreakdowns
	}
}

export function useOracleOverviewExtraSeries({
	enabledExtraApiKeys,
	oracle,
	chain
}: {
	enabledExtraApiKeys: string[]
	oracle: string | null
	chain: string | null
}) {
	const extraChartQueries = useQueries({
		queries: enabledExtraApiKeys.map((key) => ({
			queryKey: ['oracle', 'overview', 'chart', oracle ?? 'unknown', chain ?? 'all', key],
			queryFn: async () => {
				if (!oracle) return null
				if (chain) {
					const chainBreakdown = await fetchOracleProtocolChainBreakdownChart({
						protocol: oracle,
						key
					})
					const series: Array<[number, number]> = []
					for (const row of chainBreakdown) {
						const chainValue = row[chain]
						if (!Number.isFinite(row.timestamp) || !Number.isFinite(chainValue)) continue
						series.push([row.timestamp, chainValue])
					}
					return series
				}
				return fetchOracleProtocolChart({
					protocol: oracle,
					key
				})
			},
			enabled: Boolean(oracle),
			staleTime: 5 * 60 * 1_000,
			refetchOnWindowFocus: false
		}))
	})

	const isFetchingExtraSeries = extraChartQueries.some((query) => query.isLoading || query.isFetching)

	const extraTvsByTimestamp = React.useMemo(() => {
		const result = new Map<number, number>()
		for (const query of extraChartQueries) {
			if (!query.data) continue

			for (const [timestampInSeconds, value] of query.data) {
				if (!Number.isFinite(timestampInSeconds) || !Number.isFinite(value)) continue
				const current = result.get(timestampInSeconds) ?? 0
				result.set(timestampInSeconds, current + value)
			}
		}
		return result
	}, [extraChartQueries])

	return {
		isFetchingExtraSeries,
		extraTvsByTimestamp
	}
}
