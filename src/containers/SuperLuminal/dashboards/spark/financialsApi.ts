import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { assignColors } from './api'

const API_URL = '/api/spark/financials'

interface FormattedValue {
	value: number
	formatted: string
}

interface KpiItem {
	label: string
	value: number
	formatted: string
}

interface PieSeriesItem {
	name: string
	value: number
	formatted: string
	pct: number
}

interface ProjectedBreakdown {
	title: string
	total: number
	totalFormatted: string
	series: PieSeriesItem[]
}

interface TimeSeriesItem {
	name: string
	data: number[]
}

interface TimeSeriesData {
	title: string
	dates: string[]
	series: TimeSeriesItem[]
	products?: string[]
	chains?: string[]
}

interface AllocatedAssetsEntry {
	name: string
	value: number
	formatted: string
	pct: number
	children?: Array<{ name: string; value: number; formatted: string }>
}

interface AllocatedAssetsHistorical {
	dates: string[]
	byProtocol: TimeSeriesItem[]
	byNetwork: TimeSeriesItem[]
	byAsset: TimeSeriesItem[]
}

interface AllocatedAssetsData {
	title: string
	total: number
	totalFormatted: string
	date: string
	byProtocol: AllocatedAssetsEntry[]
	byNetwork: AllocatedAssetsEntry[]
	byAsset: AllocatedAssetsEntry[]
	historical: AllocatedAssetsHistorical
}

interface TvlData extends TimeSeriesData {
	current: number
	currentFormatted: string
}

interface TreasuryData extends TimeSeriesData {
	threshold: number
	thresholdFormatted: string
}

interface BuybackSeriesItem {
	name: string
	type: 'bar' | 'line'
	data: number[]
}

interface BuybacksData {
	title: string
	dates: string[]
	series: BuybackSeriesItem[]
}

interface QuarterlyReport {
	label: string
	url: string
}

interface FinancialsAPIResponse {
	meta: {
		projectId: number
		projectName: string
		updatedAt: string
		links: Record<string, string>
		quarterlyReports?: QuarterlyReport[]
	}
	kpis: KpiItem[]
	treasuryKpis: {
		totalAssets: FormattedValue
		buybackThreshold: FormattedValue
		vsThreshold: FormattedValue
	}
	buybackKpis: {
		usdsSpent: FormattedValue
		spkBought: FormattedValue
		avgPrice: FormattedValue
	}
	charts: {
		projectedBreakdown: ProjectedBreakdown
		monthlyGross: TimeSeriesData
		monthlyNet: TimeSeriesData
		allocatedAssets: AllocatedAssetsData
		tvl: TvlData
		sparklendDeposits: TimeSeriesData
		sparklendBorrows: TimeSeriesData
		sllTvl: TimeSeriesData
		savingsTvl: TimeSeriesData
		supplyTotal: TimeSeriesData
		supplyByChain: TimeSeriesData
		treasury: TreasuryData
		buybacks: BuybacksData
	}
}

function parseDateToUnix(dateStr: string): number {
	if (dateStr.length === 7) {
		return Math.floor(new Date(dateStr + '-01T00:00:00Z').getTime() / 1000)
	}
	return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000)
}

export function transformTimeSeries(
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

export type {
	FinancialsAPIResponse,
	AllocatedAssetsData,
	AllocatedAssetsEntry,
	PieSeriesItem,
	QuarterlyReport,
	BuybackSeriesItem,
	TreasuryData,
	TimeSeriesData,
	TimeSeriesItem,
	FormattedValue,
	KpiItem
}

export function useFinancialsData() {
	const query = useQuery<FinancialsAPIResponse>({
		queryKey: ['spark-financials'],
		queryFn: async () => {
			const res = await fetch(API_URL)
			if (!res.ok) throw new Error(`Financials API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		if (!query.data) {
			return { data: null, isLoading: query.isLoading }
		}

		const d = query.data
		const { charts } = d

		// Monthly Gross Returns
		const monthlyGrossData = transformTimeSeries(charts.monthlyGross.dates, charts.monthlyGross.series)
		const monthlyGrossStacks: Record<string, string> = {}
		const monthlyGrossNames = charts.monthlyGross.series.map((s) => s.name)
		for (const name of monthlyGrossNames) monthlyGrossStacks[name] = 'a'
		const monthlyGrossColors = assignColors(monthlyGrossNames)

		// Monthly Net Returns
		const monthlyNetData = transformTimeSeries(charts.monthlyNet.dates, charts.monthlyNet.series)
		const monthlyNetStacks: Record<string, string> = {}
		const monthlyNetNames = charts.monthlyNet.series.map((s) => s.name)
		for (const name of monthlyNetNames) monthlyNetStacks[name] = 'a'
		const monthlyNetColors = assignColors(monthlyNetNames)

		// sUSDS Total Supply
		const supplyTotalData = transformTimeSeries(charts.supplyTotal.dates, charts.supplyTotal.series)
		const supplyTotalStacks = charts.supplyTotal.series.map((s) => s.name)

		// sUSDS Supply by Chain
		const supplyByChainData = transformTimeSeries(charts.supplyByChain.dates, charts.supplyByChain.series)
		const supplyByChainStacks = charts.supplyByChain.series.map((s) => s.name)
		const supplyByChainColors = assignColors(supplyByChainStacks)

		// TVL
		const tvlData = transformTimeSeries(charts.tvl.dates, charts.tvl.series)
		const tvlStacks = charts.tvl.series.map((s) => s.name)
		const tvlColors = assignColors(tvlStacks)

		// SparkLend Deposits
		const depositsData = transformTimeSeries(charts.sparklendDeposits.dates, charts.sparklendDeposits.series)
		const depositsStacks = charts.sparklendDeposits.series.map((s) => s.name)

		// SparkLend Borrows
		const borrowsData = transformTimeSeries(charts.sparklendBorrows.dates, charts.sparklendBorrows.series)
		const borrowsStacks = charts.sparklendBorrows.series.map((s) => s.name)

		// SLL TVL by Chain
		const sllTvlData = transformTimeSeries(charts.sllTvl.dates, charts.sllTvl.series)
		const sllTvlStacks = charts.sllTvl.series.map((s) => s.name)
		const sllTvlColors = assignColors(sllTvlStacks)

		// Savings TVL by Chain
		const savingsTvlData = transformTimeSeries(charts.savingsTvl.dates, charts.savingsTvl.series)
		const savingsTvlStacks = charts.savingsTvl.series.map((s) => s.name)
		const savingsTvlColors = assignColors(savingsTvlStacks)

		// Treasury - MultiSeriesChart format
		const treasurySeries: Array<{
			name: string
			type: 'line' | 'bar'
			color: string
			data: Array<[number, number]>
			areaStyle?: { opacity: number }
		}> = charts.treasury.series.map((s) => ({
			name: s.name,
			type: 'line' as const,
			color: '#4FC3F7',
			data: charts.treasury.dates.map((dateStr, i) => [parseDateToUnix(dateStr), s.data[i]] as [number, number])
		}))
		// Add threshold line (areaStyle with opacity 0 prevents gradient fill)
		treasurySeries.push({
			name: 'Buyback Threshold',
			type: 'line' as const,
			color: '#EF5350',
			areaStyle: { opacity: 0 },
			data: charts.treasury.dates.map((dateStr) => [parseDateToUnix(dateStr), charts.treasury.threshold] as [number, number])
		})

		// Buybacks - MultiSeriesChart format
		const buybacksSeries = charts.buybacks.series.map((s) => ({
			name: s.name,
			type: s.type as 'bar' | 'line',
			color: s.type === 'bar' ? '#1f6feb' : '#3fb950',
			data: charts.buybacks.dates.map((dateStr, j) => [parseDateToUnix(dateStr), s.data[j]] as [number, number]),
			yAxisIndex: s.type === 'line' ? 1 : 0,
			areaStyle: s.type === 'line' ? { opacity: 0 } : undefined
		}))

		// Allocated Assets Historical
		const aaHistorical = {
			byProtocol: {
				data: transformTimeSeries(charts.allocatedAssets.historical.dates, charts.allocatedAssets.historical.byProtocol),
				stacks: charts.allocatedAssets.historical.byProtocol.map((s) => s.name),
				colors: assignColors(charts.allocatedAssets.historical.byProtocol.map((s) => s.name))
			},
			byNetwork: {
				data: transformTimeSeries(charts.allocatedAssets.historical.dates, charts.allocatedAssets.historical.byNetwork),
				stacks: charts.allocatedAssets.historical.byNetwork.map((s) => s.name),
				colors: assignColors(charts.allocatedAssets.historical.byNetwork.map((s) => s.name))
			},
			byAsset: {
				data: transformTimeSeries(charts.allocatedAssets.historical.dates, charts.allocatedAssets.historical.byAsset),
				stacks: charts.allocatedAssets.historical.byAsset.map((s) => s.name),
				colors: assignColors(charts.allocatedAssets.historical.byAsset.map((s) => s.name))
			}
		}

		// Projected Breakdown - PieChart format
		const breakdownPieData = charts.projectedBreakdown.series.map((s) => ({
			name: s.name,
			value: s.value
		}))
		const breakdownColors = assignColors(charts.projectedBreakdown.series.map((s) => s.name))

		return {
			data: {
				meta: d.meta,
				kpis: d.kpis,
				treasuryKpis: d.treasuryKpis,
				buybackKpis: d.buybackKpis,
				projectedBreakdown: charts.projectedBreakdown,
				breakdownPieData,
				breakdownColors,
				monthlyGross: { data: monthlyGrossData, stacks: monthlyGrossStacks, colors: monthlyGrossColors, title: charts.monthlyGross.title },
				monthlyNet: { data: monthlyNetData, stacks: monthlyNetStacks, colors: monthlyNetColors, title: charts.monthlyNet.title },
				supplyTotal: { data: supplyTotalData, stacks: supplyTotalStacks, title: charts.supplyTotal.title },
				supplyByChain: { data: supplyByChainData, stacks: supplyByChainStacks, colors: supplyByChainColors, title: charts.supplyByChain.title },
				allocatedAssets: charts.allocatedAssets,
				aaHistorical,
				tvl: { data: tvlData, stacks: tvlStacks, colors: tvlColors, title: charts.tvl.title, currentFormatted: charts.tvl.currentFormatted },
				deposits: { data: depositsData, stacks: depositsStacks, title: charts.sparklendDeposits.title },
				borrows: { data: borrowsData, stacks: borrowsStacks, title: charts.sparklendBorrows.title },
				sllTvl: { data: sllTvlData, stacks: sllTvlStacks, colors: sllTvlColors, title: charts.sllTvl.title },
				savingsTvl: { data: savingsTvlData, stacks: savingsTvlStacks, colors: savingsTvlColors, title: charts.savingsTvl.title },
				treasurySeries,
				treasuryThreshold: charts.treasury.threshold,
				treasuryThresholdFormatted: charts.treasury.thresholdFormatted,
				buybacksSeries,
				quarterlyReports: d.meta.quarterlyReports
			},
			isLoading: false
		}
	}, [query.data, query.isLoading])
}
