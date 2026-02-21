export type CategoryOrTagChartMetrics = Record<string, number | null | undefined>

export type CategoryOrTagChartResponse = Record<string, Record<string, number | null>>

export type CategoriesSummaryResponse = {
	chart: Record<string, Record<string, CategoryOrTagChartMetrics>> | null
	categories: Array<string> | Record<string, unknown> | null
}
