import { useQueries } from '@tanstack/react-query'
import * as React from 'react'
import { fetchForkProtocolBreakdownChart, fetchForkProtocolChart } from './api'

export function useForksOverviewExtraSeries({ enabledExtraApiKeys }: { enabledExtraApiKeys: string[] }) {
	const extraChartQueries = useQueries({
		queries: enabledExtraApiKeys.map((key) => ({
			queryKey: ['forks', 'overview', 'chart', key],
			queryFn: () => fetchForkProtocolBreakdownChart({ key }),
			staleTime: 5 * 60 * 1_000,
			refetchOnWindowFocus: false
		}))
	})

	const isFetchingExtraSeries = extraChartQueries.some((query) => query.isLoading || query.isFetching)

	const extraBreakdownByTimestamp = React.useMemo(() => {
		const shouldSubtractOverlapSeries =
			enabledExtraApiKeys.includes('doublecounted') && enabledExtraApiKeys.includes('liquidstaking')
		const result = new Map<number, Record<string, number>>()

		for (let index = 0; index < extraChartQueries.length; index++) {
			const query = extraChartQueries[index]
			const apiKey = enabledExtraApiKeys[index]
			if (!apiKey) continue
			const data = query.data ?? []

			const normalizedApiKey = apiKey.toLowerCase()
			const shouldSubtract = normalizedApiKey === 'dcandlsoverlap' && shouldSubtractOverlapSeries
			const sign = shouldSubtract ? -1 : 1

			for (const row of data) {
				if (!Number.isFinite(row.timestamp)) continue
				const current = result.get(row.timestamp) ?? {}

				for (const key in row) {
					if (key === 'timestamp') continue
					const value = row[key]
					if (!Number.isFinite(value)) continue
					current[key] = (current[key] ?? 0) + value * sign
				}

				result.set(row.timestamp, current)
			}
		}

		return result
	}, [enabledExtraApiKeys, extraChartQueries])

	return {
		isFetchingExtraSeries,
		extraBreakdownByTimestamp
	}
}

export function useForkByProtocolExtraSeries({
	enabledExtraApiKeys,
	protocol
}: {
	enabledExtraApiKeys: string[]
	protocol: string | null
}) {
	const extraChartQueries = useQueries({
		queries: enabledExtraApiKeys.map((key) => ({
			queryKey: ['forks', 'protocol', 'chart', protocol ?? 'unknown', key],
			queryFn: async () => {
				if (!protocol) return []
				return fetchForkProtocolChart({ protocol, key })
			},
			enabled: Boolean(protocol),
			staleTime: 5 * 60 * 1_000,
			refetchOnWindowFocus: false
		}))
	})

	const isFetchingExtraSeries = extraChartQueries.some((query) => query.isLoading || query.isFetching)

	const extraTvsByTimestamp = React.useMemo(() => {
		const shouldSubtractOverlapSeries =
			enabledExtraApiKeys.includes('doublecounted') && enabledExtraApiKeys.includes('liquidstaking')
		const result = new Map<number, number>()

		for (let index = 0; index < extraChartQueries.length; index++) {
			const query = extraChartQueries[index]
			const apiKey = enabledExtraApiKeys[index]
			if (!apiKey) continue
			const data = query.data ?? []

			const normalizedApiKey = apiKey.toLowerCase()
			const shouldSubtract = normalizedApiKey === 'dcandlsoverlap' && shouldSubtractOverlapSeries
			const sign = shouldSubtract ? -1 : 1

			for (const [timestampInSeconds, value] of data) {
				if (!Number.isFinite(timestampInSeconds) || !Number.isFinite(value)) continue
				const current = result.get(timestampInSeconds) ?? 0
				result.set(timestampInSeconds, current + value * sign)
			}
		}

		return result
	}, [enabledExtraApiKeys, extraChartQueries])

	return {
		isFetchingExtraSeries,
		extraTvsByTimestamp
	}
}
