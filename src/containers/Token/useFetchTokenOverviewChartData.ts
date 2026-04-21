import { useQuery } from '@tanstack/react-query'
import type { CgChartResponse } from '~/api/coingecko.types'
import { fetchJson } from '~/utils/async'
import { buildTokenOverviewRawChartData, type TokenOverviewChartLabel, type TokenOverviewData } from './tokenOverview'

async function fetchTokenOverviewChart(geckoId: string): Promise<CgChartResponse | null> {
	return fetchJson<CgChartResponse | null>(`/api/charts/coingecko/${encodeURIComponent(geckoId)}?fullChart=true`)
}

async function fetchTokenOverviewTotalSupply(geckoId: string): Promise<number | null> {
	return fetchJson<{ totalSupply: number | null }>(
		`/api/charts/coingecko/${encodeURIComponent(geckoId)}?kind=supply`
	).then((response) => response?.totalSupply ?? null)
}

export function useFetchTokenOverviewChartData({
	geckoId,
	overview,
	activeCharts,
	enabled
}: {
	geckoId: string | null
	overview: TokenOverviewData
	activeCharts: TokenOverviewChartLabel[]
	enabled: boolean
}) {
	const missingCharts = activeCharts.filter((chart) => !overview.rawChartData[chart]?.length)
	const shouldFetchChart = Boolean(geckoId) && enabled && missingCharts.length > 0
	const shouldFetchTotalSupply =
		Boolean(geckoId) &&
		enabled &&
		missingCharts.includes('FDV') &&
		overview.marketData.maxSupply == null &&
		overview.marketData.totalSupply == null

	const { data: chartData = null, isLoading: loadingChartData } = useQuery({
		queryKey: ['token-overview', 'chart', geckoId],
		queryFn: () => fetchTokenOverviewChart(geckoId!),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: shouldFetchChart
	})

	const { data: totalSupply = null, isLoading: loadingTotalSupply } = useQuery({
		queryKey: ['token-overview', 'total-supply', geckoId],
		queryFn: () => fetchTokenOverviewTotalSupply(geckoId!),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: shouldFetchTotalSupply
	})

	return {
		rawChartData: chartData
			? {
					...overview.rawChartData,
					...buildTokenOverviewRawChartData({
						chart: chartData,
						totalSupply: overview.marketData.maxSupply ?? overview.marketData.totalSupply ?? totalSupply,
						includeCharts: missingCharts
					})
				}
			: overview.rawChartData,
		isLoading: loadingChartData || loadingTotalSupply
	}
}
