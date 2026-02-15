import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { PROTOCOL_API, YIELD_POOLS_API } from '~/constants'
import {
	fetchAdapterProtocolChartData,
	fetchAdapterProtocolChartDataByBreakdownType,
	fetchAdapterProtocolMetrics
} from '~/containers/DimensionAdapters/api'
import { fetchProtocolTvlChart } from '~/containers/ProtocolOverview/api'
import { fetchJson } from '~/utils/async'

const PROTOCOL_SLUG = 'sparklend'
const STALE_TIME = 10 * 60 * 1000

export function useSparklendMetrics() {
	const fees = useQuery({
		queryKey: ['sparklend-fees-metrics'],
		queryFn: () => fetchAdapterProtocolMetrics({ adapterType: 'fees', protocol: PROTOCOL_SLUG }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const revenue = useQuery({
		queryKey: ['sparklend-revenue-metrics'],
		queryFn: () =>
			fetchAdapterProtocolMetrics({ adapterType: 'fees', protocol: PROTOCOL_SLUG, dataType: 'dailyRevenue' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const supplySideRevenue = useQuery({
		queryKey: ['sparklend-supply-side-revenue-metrics'],
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

export function useSparklendTvlChart() {
	const query = useQuery({
		queryKey: ['sparklend-tvl-chart'],
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

export function useSparklendBorrowedChart() {
	const query = useQuery({
		queryKey: ['sparklend-borrowed-chart'],
		queryFn: async () => {
			const res = await fetch(`${PROTOCOL_API}/${PROTOCOL_SLUG}`)
			if (!res.ok) return { chart: [], current: null }
			const data = await res.json()
			const chainTvls = data?.chainTvls || {}
			const store: Record<number, number> = {}
			for (const key in chainTvls) {
				if (!key.endsWith('-borrowed')) continue
				const arr = chainTvls[key]?.tvl || []
				for (const item of arr) {
					const d = Number(item?.date)
					const v = Number(item?.totalLiquidityUSD ?? 0)
					if (!Number.isFinite(d) || !Number.isFinite(v)) continue
					store[d] = (store[d] ?? 0) + v
				}
			}
			const chart = Object.entries(store)
				.map(([d, v]) => ({ date: Number(d), Borrowed: v }))
				.sort((a, b) => a.date - b.date)
			const current = data?.currentChainTvls?.borrowed ?? null
			return { chart, current }
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(
		() => ({
			borrowedChart: query.data?.chart ?? [],
			currentBorrowed: query.data?.current ?? null,
			isLoading: query.isLoading
		}),
		[query.data, query.isLoading]
	)
}

export function useSparklendFeesCharts() {
	const fees = useQuery({
		queryKey: ['sparklend-fees-chart'],
		queryFn: () => fetchAdapterProtocolChartData({ adapterType: 'fees', protocol: PROTOCOL_SLUG }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const revenue = useQuery({
		queryKey: ['sparklend-revenue-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({ adapterType: 'fees', protocol: PROTOCOL_SLUG, dataType: 'dailyRevenue' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const supplySideRevenue = useQuery({
		queryKey: ['sparklend-supply-side-revenue-chart'],
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

interface YieldPool {
	pool: string
	chain: string
	symbol: string
	tvlUsd: number
	apy: number | null
	apyBase: number | null
	apyReward: number | null
	poolMeta: string | null
}

export function useSparklendYieldPools() {
	const query = useQuery({
		queryKey: ['sparklend-yield-pools'],
		queryFn: async () => {
			const data = await fetchJson<{ data: Array<Record<string, unknown>> }>(YIELD_POOLS_API)
			return (data?.data ?? [])
				.filter((p) => p.project === 'sparklend')
				.map(
					(p): YieldPool => ({
						pool: String(p.pool ?? ''),
						chain: String(p.chain ?? ''),
						symbol: String(p.symbol ?? ''),
						tvlUsd: Number(p.tvlUsd ?? 0),
						apy: typeof p.apy === 'number' ? p.apy : null,
						apyBase: typeof p.apyBase === 'number' ? p.apyBase : null,
						apyReward: typeof p.apyReward === 'number' ? p.apyReward : null,
						poolMeta: typeof p.poolMeta === 'string' ? p.poolMeta : null
					})
				)
				.sort((a, b) => b.tvlUsd - a.tvlUsd)
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return { pools: query.data ?? [], isLoading: query.isLoading }
}

function breakdownToChart(data: Array<[number, Record<string, number>]> | null | undefined) {
	if (!data || data.length === 0) return { chart: [], stacks: [] }

	const lastEntry = data[data.length - 1]?.[1] ?? {}
	const stacks = Object.keys(lastEntry).sort((a, b) => (lastEntry[b] ?? 0) - (lastEntry[a] ?? 0))

	const chart = data.map(([ts, values]) => ({ date: ts, ...values }))

	return { chart, stacks }
}

export function useSparklendChainBreakdown() {
	const tvlByChainQuery = useQuery({
		queryKey: ['sparklend-tvl-chain-breakdown'],
		queryFn: () => fetchProtocolTvlChart({ protocol: PROTOCOL_SLUG, breakdownType: 'chain-breakdown' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const feesByChainQuery = useQuery({
		queryKey: ['sparklend-fees-chain-breakdown'],
		queryFn: () =>
			fetchAdapterProtocolChartDataByBreakdownType({ adapterType: 'fees', protocol: PROTOCOL_SLUG, type: 'chain' }),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const tvl = breakdownToChart(tvlByChainQuery.data)
		const fees = breakdownToChart(feesByChainQuery.data)

		return {
			tvlByChain: tvl.chart,
			tvlByChainStacks: tvl.stacks,
			feesByChain: fees.chart,
			feesByChainStacks: fees.stacks,
			isLoading: tvlByChainQuery.isLoading || feesByChainQuery.isLoading
		}
	}, [tvlByChainQuery.data, tvlByChainQuery.isLoading, feesByChainQuery.data, feesByChainQuery.isLoading])
}
