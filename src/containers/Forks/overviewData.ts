import { preparePieChartData } from '~/components/ECharts/utils'
import { CHART_COLORS } from '~/constants/colors'
import { getForkToOriginalTvlPercent } from './tvl'
import type { ForkBreakdownChartData, ForkOverviewPageData } from './types'

interface ForksOverviewDisplayRow {
	name: string
	forkedProtocols: number
	parentTvl: number | null
	tvl: number
	ftot: number | null
}

export function mergeForkOverviewChartData({
	chartData,
	extraBreakdownByTimestamp,
	shouldApplyExtraSeries
}: {
	chartData: ForkBreakdownChartData
	extraBreakdownByTimestamp: Map<number, Record<string, number>>
	shouldApplyExtraSeries: boolean
}): ForkBreakdownChartData {
	if (!shouldApplyExtraSeries) return chartData

	const mergedRowsByTimestamp = new Map<number, ForkBreakdownChartData[number]>()

	for (const row of chartData) {
		mergedRowsByTimestamp.set(row.timestamp, { ...row })
	}

	for (const [timestamp, extraRow] of extraBreakdownByTimestamp) {
		const mergedRow = mergedRowsByTimestamp.get(timestamp) ?? { timestamp }

		for (const key in extraRow) {
			const value = extraRow[key]
			mergedRow[key] = (mergedRow[key] ?? 0) + value
		}

		mergedRowsByTimestamp.set(timestamp, mergedRow)
	}

	return Array.from(mergedRowsByTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp)
}

export function buildForksOverviewDisplayData({
	forks,
	forkColors,
	baseTableData,
	chartData
}: {
	forks: ForkOverviewPageData['forks']
	forkColors: ForkOverviewPageData['forkColors']
	baseTableData: ForkOverviewPageData['tableData']
	chartData: ForkBreakdownChartData
}) {
	const latestData = chartData.length > 0 ? chartData[chartData.length - 1] : null
	const chartForkKeys = new Set(forks)
	for (const entry of chartData) {
		for (const key in entry) {
			if (key !== 'timestamp') chartForkKeys.add(key)
		}
	}
	const sortedChartForks = Array.from(chartForkKeys).sort((a, b) => (latestData?.[b] ?? 0) - (latestData?.[a] ?? 0))

	const tableDataByName = new Map<string, ForkOverviewPageData['tableData'][number]>()
	for (const row of baseTableData) {
		tableDataByName.set(row.name, row)
	}

	const tableData: ForksOverviewDisplayRow[] = []
	for (const name of sortedChartForks) {
		const baseRow = tableDataByName.get(name)
		const tvl = latestData?.[name] ?? 0
		const parentTvl = baseRow?.parentTvl ?? null

		tableData.push({
			name,
			forkedProtocols: baseRow?.forkedProtocols ?? 0,
			parentTvl,
			tvl,
			ftot: getForkToOriginalTvlPercent(tvl, parentTvl)
		})
	}

	const tvls: Array<{ name: string; value: number }> = []
	if (latestData) {
		for (const name in latestData) {
			if (name === 'timestamp') continue
			const value = latestData[name]
			tvls.push({ name, value })
		}
		tvls.sort((a, b) => b.value - a.value)
	}

	const tokenTvls = preparePieChartData({ data: tvls, limit: 5 })
	const chartColors: Record<string, string> = { ...forkColors }

	for (let index = 0; index < sortedChartForks.length; index++) {
		const name = sortedChartForks[index]
		if (!chartColors[name]) {
			chartColors[name] = CHART_COLORS[index % CHART_COLORS.length]
		}
	}

	const dominanceSource: Array<Record<string, number>> = []
	for (const entry of chartData) {
		const row: Record<string, number> = { timestamp: entry.timestamp * 1000 }
		let totalTvl = 0

		for (const forkName of sortedChartForks) {
			const value = entry[forkName] ?? 0
			if (value <= 0) continue
			row[forkName] = value
			totalTvl += value
		}

		if (totalTvl > 0) {
			for (const forkName of sortedChartForks) {
				const value = row[forkName]
				if (value != null) {
					row[forkName] = (value / totalTvl) * 100
				}
			}
		}

		dominanceSource.push(row)
	}

	const dominanceCharts: Array<{
		type: 'line'
		name: string
		encode: { x: string; y: string }
		color: string
		stack: string
	}> = []
	for (let index = 0; index < sortedChartForks.length; index++) {
		const name = sortedChartForks[index]
		dominanceCharts.push({
			type: 'line',
			name,
			encode: { x: 'timestamp', y: name },
			color: chartColors[name] ?? CHART_COLORS[index % CHART_COLORS.length],
			stack: 'dominance'
		})
	}

	return {
		tableData,
		tokenTvls,
		dominanceDataset: {
			source: dominanceSource,
			dimensions: ['timestamp', ...sortedChartForks]
		},
		dominanceCharts,
		chartColors
	}
}
