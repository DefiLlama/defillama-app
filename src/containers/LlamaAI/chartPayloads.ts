import type { ChartConfiguration, ChartDataByKey, DashboardChartData, DashboardItem } from '~/containers/LlamaAI/types'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const CHART_TYPES = new Set<ChartConfiguration['type']>([
	'line',
	'area',
	'bar',
	'combo',
	'pie',
	'scatter',
	'hbar',
	'candlestick'
])

function isChartConfiguration(value: unknown): value is ChartConfiguration {
	if (!isRecord(value)) return false
	if (typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.description !== 'string') {
		return false
	}
	if (typeof value.type !== 'string' || !CHART_TYPES.has(value.type as ChartConfiguration['type'])) {
		return false
	}
	if (!isRecord(value.axes) || !isRecord(value.axes.x) || !Array.isArray(value.axes.yAxes)) {
		return false
	}
	if (!Array.isArray(value.series) || !isRecord(value.dataTransformation)) {
		return false
	}
	return true
}

export function normalizeChartDataByKey(value: unknown): ChartDataByKey {
	if (!isRecord(value)) return {}
	const chartData: ChartDataByKey = {}
	for (const key in value) {
		const rows = value[key]
		if (Array.isArray(rows)) {
			chartData[key] = rows
		}
	}
	return chartData
}

export function normalizeDashboardItems(value: unknown): DashboardItem[] {
	return Array.isArray(value) ? (value as DashboardItem[]) : []
}

export function normalizeDashboardChartData(value: unknown): DashboardChartData | undefined {
	if (!isRecord(value)) return undefined
	const chartData: DashboardChartData = {}
	let hasData = false
	for (const key in value) {
		const entry = value[key]
		if (!isRecord(entry) || !Array.isArray(entry.data)) continue
		if (!isChartConfiguration(entry.config)) continue
		chartData[key] = {
			config: entry.config,
			data: entry.data,
			toolChain: Array.isArray(entry.toolChain) ? entry.toolChain : []
		}
		hasData = true
	}
	return hasData ? chartData : undefined
}
