import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchAdapterProtocolChartData } from '~/containers/DimensionAdapters/api'
import ChainCharts from '~/containers/ProDashboard/services/ChainCharts'

const STALE_TIME = 10 * 60 * 1000

export interface BerachainIncomeServerData {
	chainFees: [number, number][]
	bribes: [number, number][]
	bexRevenue: [number, number][]
}

export async function fetchBerachainIncomeServerData(): Promise<BerachainIncomeServerData> {
	const [chainFees, bribes, bexRevenue] = await Promise.all([
		ChainCharts.chainFees('Berachain').catch(() => [] as [number, number][]),
		fetchAdapterProtocolChartData({
			adapterType: 'fees',
			protocol: 'berachain-incentive-buys',
			dataType: 'dailyBribesRevenue'
		}).catch(() => [] as [number, number][]),
		fetchAdapterProtocolChartData({
			adapterType: 'fees',
			protocol: 'bex',
			dataType: 'dailyRevenue'
		}).catch(() => [] as [number, number][])
	])

	return { chainFees, bribes, bexRevenue }
}

export function useBerachainIncomeData(serverData?: BerachainIncomeServerData) {
	const chainFees = useQuery({
		queryKey: ['berachain-chain-fees-chart'],
		queryFn: () => ChainCharts.chainFees('Berachain'),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		initialData: serverData?.chainFees
	})

	const bribes = useQuery({
		queryKey: ['berachain-bribes-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'fees',
				protocol: 'berachain-incentive-buys',
				dataType: 'dailyBribesRevenue'
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		initialData: serverData?.bribes
	})

	const bexRevenue = useQuery({
		queryKey: ['berachain-bex-revenue-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'fees',
				protocol: 'bex',
				dataType: 'dailyRevenue'
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		initialData: serverData?.bexRevenue
	})

	return useMemo(() => {
		const isLoading = chainFees.isLoading || bribes.isLoading || bexRevenue.isLoading

		const chainFeesData = chainFees.data ?? []
		const bribesData = bribes.data ?? []
		const bexRevenueData = bexRevenue.data ?? []

		// Merge all three series by date
		const dateMap = new Map<number, { 'Chain Fees': number; Bribes: number; 'BEX Revenue': number }>()

		const getOrCreate = (date: number) => {
			let entry = dateMap.get(date)
			if (!entry) {
				entry = { 'Chain Fees': 0, Bribes: 0, 'BEX Revenue': 0 }
				dateMap.set(date, entry)
			}
			return entry
		}

		for (const [ts, value] of chainFeesData) {
			getOrCreate(ts)['Chain Fees'] = value ?? 0
		}
		for (const [ts, value] of bribesData) {
			getOrCreate(ts)['Bribes'] = value ?? 0
		}
		for (const [ts, value] of bexRevenueData) {
			getOrCreate(ts)['BEX Revenue'] = value ?? 0
		}

		const dailyData = Array.from(dateMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([date, values]) => ({ date, ...values }))

		// Monthly aggregation
		const monthMap = new Map<string, { date: number; 'Chain Fees': number; Bribes: number; 'BEX Revenue': number }>()
		for (const entry of dailyData) {
			const d = new Date(entry.date * 1000)
			const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
			let month = monthMap.get(key)
			if (!month) {
				const firstOfMonth = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000
				month = { date: firstOfMonth, 'Chain Fees': 0, Bribes: 0, 'BEX Revenue': 0 }
				monthMap.set(key, month)
			}
			month['Chain Fees'] += entry['Chain Fees']
			month['Bribes'] += entry['Bribes']
			month['BEX Revenue'] += entry['BEX Revenue']
		}
		const monthlyData = Array.from(monthMap.values()).sort((a, b) => a.date - b.date)

		// Cumulative
		let cumFees = 0
		let cumBribes = 0
		let cumBex = 0
		const cumulativeData = dailyData.map((entry) => {
			cumFees += entry['Chain Fees']
			cumBribes += entry['Bribes']
			cumBex += entry['BEX Revenue']
			return { date: entry.date, 'Chain Fees': cumFees, Bribes: cumBribes, 'BEX Revenue': cumBex }
		})

		return { dailyData, monthlyData, cumulativeData, isLoading }
	}, [chainFees, bribes, bexRevenue])
}
