import type { PngExportProfile } from '~/components/ButtonStyled/ChartPngExportButton'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import type { AdaptedChartData, LlamaAICartesianDatasetRow } from '~/containers/LlamaAI/utils/chartAdapter'
import { toNiceCsvDate } from '~/utils'
import type { CsvCell } from '~/utils/csvCell'

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

function formatPercent(value: number, total: number): string {
	if (!Number.isFinite(value) || total <= 0) return '0%'
	return `${((value / total) * 100).toFixed(2)}%`
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
		case 'pie': {
			const pieData = adaptedChart.props.chartData ?? []
			const total = pieData.reduce((sum, item) => sum + item.value, 0)
			return {
				csvRows: [
					['Name', 'Value', 'Percentage'],
					...(pieData.map((item) => [item.name, item.value, formatPercent(item.value, total)]) as CsvCell[][])
				],
				csvFilename,
				pngProfile: 'default'
			}
		}
		case 'scatter':
			return {
				csvRows: [
					[adaptedChart.props.xAxisLabel || 'X', adaptedChart.props.yAxisLabel || 'Y', 'Entity'],
					...((adaptedChart.props.chartData ?? []).flatMap((point) => {
						if (!Array.isArray(point) || point.length < 3) return []
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
				pngProfile: 'hbar'
			}
		default:
			return null
	}
}
