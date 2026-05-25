import type { ChartConfiguration, ChartDataByKey, DashboardChartData, DashboardItem } from '~/containers/LlamaAI/types'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasDashboardChartConfig(value: unknown): value is ChartConfiguration {
	if (!isRecord(value)) return false
	// Dashboard chart configs are backend-owned and may be partially rolled out.
	// Keep object configs with row data so existing dashboards keep rendering as
	// much as the chart renderer can support.
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
		if (!hasDashboardChartConfig(entry.config)) continue
		chartData[key] = {
			config: entry.config,
			data: entry.data,
			toolChain: Array.isArray(entry.toolChain) ? entry.toolChain : []
		}
		hasData = true
	}
	return hasData ? chartData : undefined
}
