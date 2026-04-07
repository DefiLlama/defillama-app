import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { assignColors } from '../spark/api'

interface FormattedValue {
	value: number
	formatted: string
}

export interface YieldPool {
	project: string
	symbol: string
	pool: string
	tvlUsd: number
	tvlFormatted: string
	apy: number
	apyFormatted: string
	apyBase: number | null
	apyReward: number | null
}

interface YieldsEmissionsAPIResponse {
	yields: {
		pools: YieldPool[]
		kpis: {
			totalPools: FormattedValue
			totalTvl: FormattedValue
			avgApy: FormattedValue
		}
	}
	emissions: {
		emissionsChart: {
			title: string
			dates: string[]
			categories: string[]
			series: Array<{ name: string; data: number[] }>
		}
		metadata: {
			total: number | null
			token: string | null
			name: string
		}
	}
}

function parseDateToUnix(dateStr: string): number {
	return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000)
}

function transformTimeSeries(
	dates: string[],
	series: Array<{ name: string; data: number[] }>
): Array<Record<string, number>> {
	return dates.map((dateStr, i) => {
		const point: Record<string, number> = { date: parseDateToUnix(dateStr) }
		for (const s of series) {
			const val = s.data[i]
			point[s.name] = typeof val === 'number' && Number.isFinite(val) ? val : 0
		}
		return point
	})
}

export function useYieldsEmissionsData() {
	const query = useQuery<YieldsEmissionsAPIResponse>({
		queryKey: ['sonic-yields-emissions'],
		queryFn: async () => {
			const res = await fetch('/api/sonic/yields-emissions')
			if (!res.ok) throw new Error(`Yields-Emissions API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		if (!query.data) {
			return { data: null, isLoading: query.isLoading || query.isPending }
		}

		const d = query.data

		// Emissions chart
		const emissionsData = transformTimeSeries(d.emissions.emissionsChart.dates, d.emissions.emissionsChart.series)
		const emissionsStacks = d.emissions.emissionsChart.series.map((s) => s.name)
		const emissionsColors = assignColors(emissionsStacks)

		return {
			data: {
				emissions: {
					data: emissionsData,
					stacks: emissionsStacks,
					colors: emissionsColors,
					title: d.emissions.emissionsChart.title,
					metadata: d.emissions.metadata
				},
				yields: {
					pools: d.yields.pools,
					kpis: d.yields.kpis
				}
			},
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
