import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { getBucketTimestampSec } from '~/components/ECharts/utils'
import type { InflowsChartData } from './types'

export function buildLstInflowsData({
	inflowsChartData,
	groupBy
}: {
	inflowsChartData: InflowsChartData
	groupBy: ChartTimeGroupingWithCumulative
}) {
	const store = new Map<number, Record<string, number>>()
	const isCumulative = groupBy === 'cumulative'
	const totalByToken: Record<string, number> = {}

	for (const date in inflowsChartData) {
		const dateEntry = inflowsChartData[date]
		const dateKey = isCumulative ? +date : getBucketTimestampSec(+date, groupBy)
		let dateStore = store.get(dateKey)
		for (const token in dateEntry) {
			const value = dateEntry[token]
			if (!dateStore) {
				dateStore = {}
				store.set(dateKey, dateStore)
			}
			dateStore[token] = (dateStore[token] ?? 0) + value + (totalByToken[token] ?? 0)

			if (isCumulative) {
				totalByToken[token] = (totalByToken[token] ?? 0) + value
			}
		}
	}

	const finalData: Array<Record<string, number>> = []
	const entries = Array.from(store.entries()).sort((a, b) => a[0] - b[0])
	for (const [date, dateStore] of entries) {
		finalData.push({ ...dateStore, date })
	}

	return finalData
}

export function buildLstBreakdownChartData({
	areaChartData,
	tokens,
	lsdColors
}: {
	areaChartData: Array<Record<string, number>>
	tokens: string[]
	lsdColors: Record<string, string>
}) {
	const source: Array<Record<string, number>> = []
	for (const row of areaChartData) {
		const { date, ...rest } = row
		source.push({ timestamp: date * 1e3, ...rest })
	}

	const charts: Array<{
		type: 'line'
		name: string
		encode: { x: string; y: string }
		color: string
		stack: string
	}> = []
	for (const name of tokens) {
		charts.push({
			type: 'line',
			name,
			encode: { x: 'timestamp', y: name },
			color: lsdColors[name],
			stack: 'breakdown'
		})
	}

	return {
		dataset: {
			source,
			dimensions: ['timestamp', ...tokens]
		},
		charts
	}
}

export function buildLstInflowsSeriesData({
	inflowsData,
	tokens,
	lsdColors,
	barChartStacks
}: {
	inflowsData: Array<Record<string, number>>
	tokens: string[]
	lsdColors: Record<string, string>
	barChartStacks: Record<string, string>
}) {
	const source: Array<Record<string, number>> = []
	for (const row of inflowsData) {
		const { date, ...rest } = row
		source.push({ timestamp: date * 1e3, ...rest })
	}

	const cumulativeCharts: Array<{
		type: 'line'
		name: string
		encode: { x: string; y: string }
		color: string
	}> = []
	const barCharts: Array<{
		type: 'bar'
		name: string
		encode: { x: string; y: string }
		color: string
		stack: string
		large: false
	}> = []

	for (const name of tokens) {
		cumulativeCharts.push({
			type: 'line',
			name,
			encode: { x: 'timestamp', y: name },
			color: lsdColors[name]
		})
		barCharts.push({
			type: 'bar',
			name,
			encode: { x: 'timestamp', y: name },
			color: lsdColors[name],
			stack: barChartStacks[name],
			large: false
		})
	}

	return {
		dataset: {
			source,
			dimensions: ['timestamp', ...tokens]
		},
		cumulativeCharts,
		barCharts
	}
}
