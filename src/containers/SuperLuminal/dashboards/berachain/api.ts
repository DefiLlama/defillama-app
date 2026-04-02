import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchAdapterProtocolChartData } from '~/containers/DimensionAdapters/api'
import ChainCharts from '~/containers/ProDashboard/services/ChainCharts'

const STALE_TIME = 10 * 60 * 1000

export interface HoneyRevenueKpi {
	value: number
	formatted: string
}

export interface HoneyRevenueData {
	honeySupply: HoneyRevenueKpi
	susdeYield: {
		current: HoneyRevenueKpi
		avg30d: HoneyRevenueKpi
		avgFromInception: HoneyRevenueKpi
		lastUpdated: string
	}
	kpis: {
		annualRevenueCurrent: HoneyRevenueKpi
		annualRevenue30d: HoneyRevenueKpi
		annualRevenueInception: HoneyRevenueKpi
	}
}

export function useHoneyRevenueData() {
	return useQuery<HoneyRevenueData>({
		queryKey: ['berachain-honey-revenue'],
		queryFn: () => fetch('/api/berachain/revenue').then((r) => r.json()),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})
}

export interface BerachainIncomeServerData {
	chainFees: [number, number][]
	bribes: [number, number][]
	bexRevenue: [number, number][]
	bexVolume: [number, number][]
	bendFees: [number, number][]
	bendRevenue: [number, number][]
}

export async function fetchBerachainIncomeServerData(): Promise<BerachainIncomeServerData> {
	const [chainFees, bribes, bexRevenue, bexVolume, bendFees, bendRevenue] = await Promise.all([
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
		}).catch(() => [] as [number, number][]),
		fetchAdapterProtocolChartData({
			adapterType: 'dexs',
			protocol: 'bex'
		}).catch(() => [] as [number, number][]),
		fetchAdapterProtocolChartData({
			adapterType: 'fees',
			protocol: 'bend',
			dataType: 'dailyFees'
		}).catch(() => [] as [number, number][]),
		fetchAdapterProtocolChartData({
			adapterType: 'fees',
			protocol: 'bend',
			dataType: 'dailyRevenue'
		}).catch(() => [] as [number, number][])
	])

	return { chainFees, bribes, bexRevenue, bexVolume, bendFees, bendRevenue }
}

function buildTimeSeries(data: [number, number][], label: string) {
	return data.map(([ts, value]) => ({ date: ts, [label]: value ?? 0 }))
}

function aggregateMonthly(daily: { date: number; [k: string]: number }[], keys: string[]) {
	const monthMap = new Map<string, { date: number; [k: string]: number }>()
	for (const entry of daily) {
		const d = new Date(entry.date * 1000)
		const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
		let month = monthMap.get(key)
		if (!month) {
			const firstOfMonth = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000
			month = { date: firstOfMonth }
			for (const k of keys) month[k] = 0
			monthMap.set(key, month)
		}
		for (const k of keys) month[k] += entry[k] ?? 0
	}
	return Array.from(monthMap.values()).sort((a, b) => a.date - b.date)
}

function buildCumulative(daily: { date: number; [k: string]: number }[], keys: string[]) {
	const cumulative: Record<string, number> = {}
	for (const k of keys) cumulative[k] = 0
	return daily.map((entry) => {
		const result: { date: number; [k: string]: number } = { date: entry.date }
		for (const k of keys) {
			cumulative[k] += entry[k] ?? 0
			result[k] = cumulative[k]
		}
		return result
	})
}

function mergeSeries(series: { data: [number, number][]; label: string }[]): { date: number; [k: string]: number }[] {
	const dateMap = new Map<number, Record<string, number>>()
	const keys = series.map((s) => s.label)

	for (const { data, label } of series) {
		for (const [ts, value] of data) {
			let entry = dateMap.get(ts)
			if (!entry) {
				entry = {}
				for (const k of keys) entry[k] = 0
				dateMap.set(ts, entry)
			}
			entry[label] = value ?? 0
		}
	}

	return Array.from(dateMap.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([date, values]) => ({ date, ...values }))
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

	const bexVolume = useQuery({
		queryKey: ['berachain-bex-volume-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'dexs',
				protocol: 'bex'
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		initialData: serverData?.bexVolume
	})

	const bendFees = useQuery({
		queryKey: ['berachain-bend-fees-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'fees',
				protocol: 'bend',
				dataType: 'dailyFees'
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		initialData: serverData?.bendFees
	})

	const bendRevenue = useQuery({
		queryKey: ['berachain-bend-revenue-chart'],
		queryFn: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'fees',
				protocol: 'bend',
				dataType: 'dailyRevenue'
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		initialData: serverData?.bendRevenue
	})

	return useMemo(() => {
		const isLoading =
			chainFees.isLoading ||
			bribes.isLoading ||
			bexRevenue.isLoading ||
			bexVolume.isLoading ||
			bendFees.isLoading ||
			bendRevenue.isLoading

		const chainFeesData = chainFees.data ?? []
		const bribesData = bribes.data ?? []
		const bexRevenueData = bexRevenue.data ?? []
		const bexVolumeData = bexVolume.data ?? []
		const bendFeesData = bendFees.data ?? []
		const bendRevenueData = bendRevenue.data ?? []

		// Berachain section: Chain Fees + Bribes
		const berachainKeys = ['Chain Fees', 'Bribes']
		const berachainDaily = mergeSeries([
			{ data: chainFeesData, label: 'Chain Fees' },
			{ data: bribesData, label: 'Bribes' }
		])
		const berachainMonthly = aggregateMonthly(berachainDaily, berachainKeys)
		const berachainCumulative = buildCumulative(berachainDaily, berachainKeys)

		// BEX section
		const bexKeys = ['Revenue']
		const bexDaily = buildTimeSeries(bexRevenueData, 'Revenue')
		const bexMonthly = aggregateMonthly(bexDaily, bexKeys)
		const bexCumulative = buildCumulative(bexDaily, bexKeys)

		// BEX volume
		const bexVolumeDaily = buildTimeSeries(bexVolumeData, 'Volume')
		const bexVolumeCumulative = buildCumulative(bexVolumeDaily, ['Volume'])

		// Bend section: Fees + Revenue
		const bendKeys = ['Fees', 'Revenue']
		const bendDaily = mergeSeries([
			{ data: bendFeesData, label: 'Fees' },
			{ data: bendRevenueData, label: 'Revenue' }
		])
		const bendMonthly = aggregateMonthly(bendDaily, bendKeys)
		const bendCumulative = buildCumulative(bendDaily, bendKeys)

		return {
			isLoading,
			berachain: { monthly: berachainMonthly, cumulative: berachainCumulative },
			bex: { monthly: bexMonthly, cumulative: bexCumulative, volumeCumulative: bexVolumeCumulative },
			bend: { monthly: bendMonthly, cumulative: bendCumulative }
		}
	}, [chainFees, bribes, bexRevenue, bexVolume, bendFees, bendRevenue])
}
