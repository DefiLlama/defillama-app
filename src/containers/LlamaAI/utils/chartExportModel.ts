import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import type { AdaptedChartData, LlamaAICartesianDatasetRow } from '~/containers/LlamaAI/utils/chartAdapter'
import { toNiceCsvDate } from '~/utils'
import type { CsvCell } from '~/utils/csvCell'

export type PngExportProfile = 'default' | 'scatterWithImageSymbols' | 'treemap'

export interface ChartExportModel {
	csvRows: CsvCell[][]
	csvFilename: string
	pngProfile: PngExportProfile
}

function slugifyTitle(title: string) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function normalizeTimestampToSeconds(value: unknown) {
	if (typeof value !== 'number' && typeof value !== 'string') return null
	const numeric = typeof value === 'number' ? value : Number(value)
	if (!Number.isFinite(numeric)) return null
	return numeric > 1e12 ? Math.floor(numeric / 1e3) : Math.floor(numeric)
}

function toCsvCell(value: unknown): CsvCell {
	if (typeof value === 'number') return Number.isFinite(value) ? value : ''
	return typeof value === 'string' || typeof value === 'boolean' ? value : ''
}

function buildCartesianCsvRows(
	config: ChartConfiguration,
	adaptedChart: Extract<AdaptedChartData, { chartType: 'cartesian' }>
) {
	const dims = adaptedChart.props.dataset.dimensions
	const rows = adaptedChart.props.dataset.source
	const xKey = adaptedChart.isTimeChart ? 'timestamp' : 'category'
	const seriesKeys = dims.filter((dim) => dim !== xKey)

	if (adaptedChart.isTimeChart) {
		const csvRows: CsvCell[][] = [['Timestamp', 'Date', ...seriesKeys]]
		for (const row of rows) {
			const timestamp = row.timestamp
			const seconds = normalizeTimestampToSeconds(timestamp)
			csvRows.push([
				toCsvCell(timestamp),
				seconds != null ? toNiceCsvDate(seconds) : '',
				...seriesKeys.map((key) => toCsvCell(row[key]))
			])
		}
		return csvRows
	}

	const categoryHeader = config.axes.x.label || 'Category'
	const csvRows: CsvCell[][] = [[categoryHeader, ...seriesKeys]]
	for (const row of rows) {
		csvRows.push([
			toCsvCell((row as LlamaAICartesianDatasetRow).category),
			...seriesKeys.map((key) => toCsvCell(row[key]))
		])
	}
	return csvRows
}

export function buildExportModel(config: ChartConfiguration, adaptedChart: AdaptedChartData): ChartExportModel | null {
	const csvFilename = slugifyTitle(config.title) || 'chart'

	switch (adaptedChart.chartType) {
		case 'cartesian':
			return {
				csvRows: buildCartesianCsvRows(config, adaptedChart),
				csvFilename,
				pngProfile: 'default'
			}
		case 'pie':
			return {
				csvRows: [
					['Name', 'Value'],
					...((adaptedChart.props.chartData ?? []).map((item) => [item.name, item.value]) as CsvCell[][])
				],
				csvFilename,
				pngProfile: 'default'
			}
		case 'scatter':
			return {
				csvRows: [
					[adaptedChart.props.xAxisLabel || 'X', adaptedChart.props.yAxisLabel || 'Y', 'Entity'],
					...((adaptedChart.props.chartData ?? []).flatMap((point) => {
						if (!Array.isArray(point) || point.length < 2) return []
						return [[toCsvCell(point[0]), toCsvCell(point[1]), toCsvCell(point[2])]]
					}) as CsvCell[][])
				],
				csvFilename,
				pngProfile: 'scatterWithImageSymbols'
			}
		case 'hbar':
			return {
				csvRows: [['Category', 'Value'], ...adaptedChart.data.map(([category, value]) => [category, value])],
				csvFilename,
				pngProfile: 'default'
			}
		default:
			return null
	}
}
