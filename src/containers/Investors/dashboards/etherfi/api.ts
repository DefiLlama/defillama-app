import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchAdapterProtocolChartData, fetchAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api'
import { fetchProtocolTvlChart } from '~/containers/ProtocolOverview/api'

const PROTOCOL_SLUG = 'etherfi-cash-liquid'
const STALE_TIME = 10 * 60 * 1000

export function useEtherfiCashMetrics() {
	const fees = useQuery({
		queryKey: ['etherfi-cash-fees-metrics'],
		queryFn: () => fetchAdapterProtocolMetrics({ adapterType: 'fees', protocol: PROTOCOL_SLUG }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const revenue = useQuery({
		queryKey: ['etherfi-cash-revenue-metrics'],
		queryFn: () =>
			fetchAdapterProtocolMetrics({ adapterType: 'fees', protocol: PROTOCOL_SLUG, dataType: 'dailyRevenue' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return {
		fees: fees.data,
		revenue: revenue.data,
		isLoading: fees.isLoading || revenue.isLoading
	}
}

export function useEtherfiCashTvlChart() {
	const query = useQuery({
		queryKey: ['etherfi-cash-tvl-chart'],
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

export function useEtherfiCashFeesCharts() {
	const fees = useQuery({
		queryKey: ['etherfi-cash-fees-chart'],
		queryFn: () => fetchAdapterProtocolChartData({ adapterType: 'fees', protocol: PROTOCOL_SLUG }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const revenue = useQuery({
		queryKey: ['etherfi-cash-revenue-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({ adapterType: 'fees', protocol: PROTOCOL_SLUG, dataType: 'dailyRevenue' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const holdersRevenue = useQuery({
		queryKey: ['etherfi-cash-holders-revenue-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'fees',
				protocol: PROTOCOL_SLUG,
				dataType: 'dailyHoldersRevenue'
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
			holdersRevenueChart: toChart(holdersRevenue.data, 'Holders Revenue'),
			isLoading: fees.isLoading || revenue.isLoading || holdersRevenue.isLoading
		}
	}, [fees, revenue, holdersRevenue])
}
