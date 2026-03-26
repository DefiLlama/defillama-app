import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { assignColors } from '../spark/api'

interface FormattedValue {
	value: number
	formatted: string
}

interface TimeSeriesData {
	title: string
	dates: string[]
	series: Array<{ name: string; data: number[] }>
}

interface OverviewKpis {
	total24h: FormattedValue
	total7d: FormattedValue
	total30d: FormattedValue
	totalAllTime: FormattedValue
	change1d: FormattedValue
	change7d: FormattedValue
	change1m: FormattedValue
}

export interface TopProtocolEntry {
	name: string
	logo: string | null
	category: string | null
	total24h: number
	total24hFormatted: string
	total7d: number
	total30d: number
	totalAllTime: number
}

interface AssetCategory {
	name: string
	value: number
	formatted: string
	pct: number
	breakdown: Record<string, number>
}

interface EcosystemAPIResponse {
	tvl: {
		tvl: {
			title: string
			current: number
			currentFormatted: string
			dates: string[]
			series: Array<{ name: string; data: number[] }>
		}
	}
	fees: {
		feesChart: TimeSeriesData
		kpis: OverviewKpis
		topProtocols: TopProtocolEntry[]
	}
	dexVolume: {
		volumeChart: TimeSeriesData
		kpis: OverviewKpis
		topDexes: TopProtocolEntry[]
	}
	stablecoins: {
		stablecoinChart: TimeSeriesData
		kpis: {
			currentCirculating: FormattedValue
			currentMinted: FormattedValue
			currentBridged: FormattedValue
		}
	}
	chainAssets: {
		assetBreakdown: {
			title: string
			total: number
			totalFormatted: string
			categories: AssetCategory[]
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

export type { AssetCategory }

export function useEcosystemData() {
	const query = useQuery<EcosystemAPIResponse>({
		queryKey: ['sonic-ecosystem'],
		queryFn: async () => {
			const res = await fetch('/api/sonic/ecosystem')
			if (!res.ok) throw new Error(`Ecosystem API error: ${res.status}`)
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

		// TVL
		const tvlData = transformTimeSeries(d.tvl.tvl.dates, d.tvl.tvl.series)
		const tvlStacks = d.tvl.tvl.series.map((s) => s.name)

		// Fees
		const feesData = transformTimeSeries(d.fees.feesChart.dates, d.fees.feesChart.series)
		const feesStacks: Record<string, string> = {}
		for (const s of d.fees.feesChart.series) feesStacks[s.name] = 'a'

		// DEX Volume
		const volumeData = transformTimeSeries(d.dexVolume.volumeChart.dates, d.dexVolume.volumeChart.series)
		const volumeStacks: Record<string, string> = {}
		for (const s of d.dexVolume.volumeChart.series) volumeStacks[s.name] = 'a'

		// Stablecoins — stack only Minted + Bridged (Total = their sum)
		const stableSeries = d.stablecoins.stablecoinChart.series.filter((s) => s.name !== 'Total Circulating')
		const stableData = transformTimeSeries(d.stablecoins.stablecoinChart.dates, stableSeries)
		const stableStacks = stableSeries.map((s) => s.name)
		const stableColors = assignColors(stableStacks)

		// Chain Assets — skip "total" category
		const assetCategories = d.chainAssets.assetBreakdown.categories.filter((c) => c.name !== 'total')
		const assetPieData = assetCategories.map((c) => ({ name: c.name, value: c.value }))
		const assetPieColors = assignColors(assetCategories.map((c) => c.name))

		return {
			data: {
				tvl: {
					data: tvlData,
					stacks: tvlStacks,
					title: d.tvl.tvl.title,
					currentFormatted: d.tvl.tvl.currentFormatted
				},
				fees: {
					data: feesData,
					stacks: feesStacks,
					kpis: d.fees.kpis,
					topProtocols: d.fees.topProtocols,
					title: d.fees.feesChart.title
				},
				dexVolume: {
					data: volumeData,
					stacks: volumeStacks,
					kpis: d.dexVolume.kpis,
					topDexes: d.dexVolume.topDexes,
					title: d.dexVolume.volumeChart.title
				},
				stablecoins: {
					data: stableData,
					stacks: stableStacks,
					colors: stableColors,
					kpis: d.stablecoins.kpis,
					title: d.stablecoins.stablecoinChart.title
				},
				chainAssets: {
					categories: assetCategories,
					pieData: assetPieData,
					pieColors: assetPieColors,
					total: d.chainAssets.assetBreakdown.total,
					totalFormatted: d.chainAssets.assetBreakdown.totalFormatted,
					title: d.chainAssets.assetBreakdown.title
				}
			},
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
