import { formatChartValue } from '~/components/ECharts/formatters'
import type { IScatterChartProps } from '~/components/ECharts/types'
import type { ChartConfiguration, ChartDataSeries } from '~/containers/LlamaAI/types'

export interface AdaptedScatterChartData {
	chartType: 'scatter'
	props: Partial<IScatterChartProps>
	title: string
	description: string
	defaultExportKind: 'scatter'
}

const escapeHtml = (value: string) =>
	value.replace(/[&<>"']/g, (char) => {
		switch (char) {
			case '&':
				return '&amp;'
			case '<':
				return '&lt;'
			case '>':
				return '&gt;'
			case '"':
				return '&quot;'
			case "'":
				return '&#39;'
			default:
				return char
		}
	})

const parseScatterNumber = (value: unknown): number | null => {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null
	if (typeof value !== 'string' || value.trim() === '') return null
	const parsed = parseFloat(value)
	return Number.isFinite(parsed) ? parsed : null
}

export function adaptScatterChartData(config: ChartConfiguration, rawData: ChartDataSeries): AdaptedScatterChartData {
	try {
		if (!rawData || rawData.length === 0) throw new Error('No data provided')

		const primarySeries = config.series[0]
		if (!primarySeries) throw new Error('No series configuration found')

		const xField = primarySeries.dataMapping.xField
		const yField = primarySeries.dataMapping.yField
		const entityField = primarySeries.dataMapping.entityFilter?.field || 'protocol'
		const entityType = entityField === 'chain' ? 'chain' : 'protocol'

		const scatterData: Array<[number, number, string, string]> = []
		for (const row of rawData) {
			const record = row as Record<string, unknown>
			const xValue = parseScatterNumber(record[xField])
			const yValue = parseScatterNumber(record[yField])
			// Missing legacy scatter coordinates must be dropped; coercing them to 0
			// creates phantom origin points in restored pre-keyed chart sessions.
			if (xValue == null || yValue == null) continue
			const entityName = String(record[entityField] ?? 'Unknown')
			const entitySlug = entityName.toLowerCase().replace(/\s+/g, '-')
			scatterData.push([xValue, yValue, entityName, entitySlug])
		}

		const xAxisLabel = config.axes.x.label || xField
		const yAxisLabel = config.axes.yAxes[0]?.label || yField
		const xAxisSymbol = config.axes.x.valueSymbol ?? config.valueSymbol ?? ''
		const yAxisSymbol = config.axes.yAxes[0]?.valueSymbol ?? config.valueSymbol ?? ''

		return {
			chartType: 'scatter',
			props: {
				chartData: scatterData as unknown as IScatterChartProps['chartData'],
				title: config.title,
				xAxisLabel,
				yAxisLabel,
				valueSymbol: config.valueSymbol || '',
				height: '360px',
				entityType,
				tooltipFormatter: (params: any) => {
					if (params.value.length < 2) return ''
					const entityName = escapeHtml(String(params.value[2] ?? 'Unknown'))
					return `<strong style="color: #000;">${entityName}</strong><br/>${xAxisLabel}: ${formatChartValue(params.value[0], xAxisSymbol)}<br/>${yAxisLabel}: ${formatChartValue(params.value[1], yAxisSymbol)}`
				}
			},
			title: config.title,
			description: config.description,
			defaultExportKind: 'scatter'
		}
	} catch (error) {
		console.error('ScatterChart adapter error:', error)
		return {
			chartType: 'scatter',
			props: { chartData: [], title: 'Scatter Chart Error', height: '360px' },
			title: config.title || 'Scatter Chart Error',
			description: `Failed to render scatter chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
			defaultExportKind: 'scatter'
		}
	}
}
