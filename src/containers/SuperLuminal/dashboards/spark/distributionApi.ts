import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { assignColors } from './api'

interface ChartPayload {
	data: Array<Record<string, number>>
	keys: string[]
}

interface DistributionResponse {
	meta: { updatedAt: string }
	charts: {
		actualRevenue: ChartPayload
		revenueProjection: ChartPayload
		susdsTvl: ChartPayload
		xrSusds: ChartPayload
		xrSusdc: ChartPayload
		stakedUsdsTvl: ChartPayload
	}
}

interface ProcessedChart {
	chartData: Array<Record<string, number>>
	keys: string[]
	colors: Record<string, string>
}

export function useDistributionData() {
	const query = useQuery<DistributionResponse>({
		queryKey: ['spark-distribution-rewards'],
		queryFn: async () => {
			const res = await fetch('/api/spark/distribution-rewards')
			if (!res.ok) throw new Error(`Distribution API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		if (!query.data?.charts) {
			return { data: null, isLoading: query.isLoading || query.isPending }
		}

		const { charts } = query.data

		const processChart = (chart: ChartPayload, fallbackKey = 'USD'): ProcessedChart => {
			const needsRename = chart.keys.includes('undefined')
			const keys = needsRename ? chart.keys.map((k) => (k === 'undefined' ? fallbackKey : k)) : chart.keys
			const chartData = needsRename
				? chart.data.map((row) => {
						const next: Record<string, number> = {}
						for (const [k, v] of Object.entries(row)) {
							next[k === 'undefined' ? fallbackKey : k] = v
						}
						return next
					})
				: chart.data
			return { chartData, keys, colors: assignColors(keys) }
		}

		return {
			data: {
				actualRevenue: processChart(charts.actualRevenue),
				revenueProjection: processChart(charts.revenueProjection),
				susdsTvl: processChart(charts.susdsTvl),
				xrSusds: processChart(charts.xrSusds),
				xrSusdc: processChart(charts.xrSusdc),
				stakedUsdsTvl: processChart(charts.stakedUsdsTvl)
			},
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
