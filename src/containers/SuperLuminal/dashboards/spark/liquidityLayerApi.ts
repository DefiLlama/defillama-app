import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchAdapterProtocolChartData, fetchAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api'
import { fetchProtocolTvlChart } from '~/containers/ProtocolOverview/api'

const PROTOCOL_SLUG = 'spark-liquidity-layer'
const STALE_TIME = 10 * 60 * 1000

export function useLiquidityLayerMetrics() {
	const fees = useQuery({
		queryKey: ['spark-ll-fees-metrics'],
		queryFn: () => fetchAdapterProtocolMetrics({ adapterType: 'fees', protocol: PROTOCOL_SLUG }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const revenue = useQuery({
		queryKey: ['spark-ll-revenue-metrics'],
		queryFn: () =>
			fetchAdapterProtocolMetrics({ adapterType: 'fees', protocol: PROTOCOL_SLUG, dataType: 'dailyRevenue' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const supplySideRevenue = useQuery({
		queryKey: ['spark-ll-supply-side-revenue-metrics'],
		queryFn: () =>
			fetchAdapterProtocolMetrics({
				adapterType: 'fees',
				protocol: PROTOCOL_SLUG,
				dataType: 'dailySupplySideRevenue'
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return {
		fees: fees.data,
		revenue: revenue.data,
		supplySideRevenue: supplySideRevenue.data,
		isLoading: fees.isLoading || revenue.isLoading || supplySideRevenue.isLoading
	}
}

export function useLiquidityLayerTvlChart() {
	const query = useQuery({
		queryKey: ['spark-ll-tvl-chart'],
		queryFn: () => fetchProtocolTvlChart({ protocol: PROTOCOL_SLUG }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const raw = query.data
		if (!raw || !Array.isArray(raw) || raw.length === 0) {
			return { ...query, tvlChart: [], inflowsChart: [] }
		}

		const tvlChart = raw.map(([ts, value]: [number, number]) => ({
			date: Math.floor(ts / 1e3),
			TVL: value
		}))

		const inflowsChart: Array<{ date: number; 'USD Inflows': number }> = []
		for (let i = 1; i < raw.length; i++) {
			const [ts, value] = raw[i]
			const prevValue = raw[i - 1][1]
			if (value == null || prevValue == null || !Number.isFinite(value) || !Number.isFinite(prevValue)) continue
			inflowsChart.push({
				date: Math.floor(ts / 1e3),
				'USD Inflows': value - prevValue
			})
		}

		return { ...query, tvlChart, inflowsChart }
	}, [query])
}

export function useLiquidityLayerFeesCharts() {
	const fees = useQuery({
		queryKey: ['spark-ll-fees-chart'],
		queryFn: () => fetchAdapterProtocolChartData({ adapterType: 'fees', protocol: PROTOCOL_SLUG }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const revenue = useQuery({
		queryKey: ['spark-ll-revenue-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({ adapterType: 'fees', protocol: PROTOCOL_SLUG, dataType: 'dailyRevenue' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const supplySideRevenue = useQuery({
		queryKey: ['spark-ll-supply-side-revenue-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'fees',
				protocol: PROTOCOL_SLUG,
				dataType: 'dailySupplySideRevenue'
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const toChart = (data: Array<[number, number]> | undefined, key: string) =>
			(data ?? []).map(([ts, value]) => ({ date: ts, [key]: value }))

		return {
			feesChart: toChart(fees.data, 'Fees'),
			revenueChart: toChart(revenue.data, 'Revenue'),
			supplySideRevenueChart: toChart(supplySideRevenue.data, 'Supply Side Revenue'),
			isLoading: fees.isLoading || revenue.isLoading || supplySideRevenue.isLoading
		}
	}, [fees, revenue, supplySideRevenue])
}

export function useLiquidityLayerChainBreakdown() {
	const query = useQuery({
		queryKey: ['spark-ll-tvl-chain-breakdown'],
		queryFn: () => fetchProtocolTvlChart({ protocol: PROTOCOL_SLUG, breakdownType: 'chain-breakdown' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const data = query.data
		if (!data || data.length === 0) return { tvlByChain: [], tvlByChainStacks: [], isLoading: query.isLoading }

		const lastEntry = data[data.length - 1]?.[1] ?? {}
		const stacks = Object.keys(lastEntry).sort((a, b) => (lastEntry[b] ?? 0) - (lastEntry[a] ?? 0))
		const chart = data.map(([ts, values]) => ({ date: ts, ...values }))

		return { tvlByChain: chart, tvlByChainStacks: stacks, isLoading: query.isLoading }
	}, [query.data, query.isLoading])
}
