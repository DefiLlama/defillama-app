import type { ChartDataByKey, DashboardChartData, DashboardItem } from '~/containers/LlamaAI/types'

export function normalizeChartDataByKey(value: ChartDataByKey): ChartDataByKey {
	return value
}

export function normalizeDashboardItems(value: DashboardItem[]): DashboardItem[] {
	return value
}

export function normalizeDashboardChartData(value: DashboardChartData | undefined): DashboardChartData | undefined {
	return value
}
