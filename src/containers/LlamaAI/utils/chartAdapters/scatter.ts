import { formatChartValue } from '~/components/ECharts/formatters'
import type { IScatterChartProps } from '~/components/ECharts/types'
import type { ChartConfiguration, ChartDataSeries } from '~/containers/LlamaAI/types'
import { parseStringNumber } from '~/containers/LlamaAI/utils/chartAdapters/shared'

export interface AdaptedScatterChartData {
	chartType: 'scatter'
	props: Partial<IScatterChartProps>
	title: string
	description: string
	defaultExportKind: 'scatter'
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

		const scatterData = rawData
			.map((row) => {
				const record = row as Record<string, unknown>
				const xValue = parseStringNumber(record[xField])
				const yValue = parseStringNumber(record[yField])
				const entityName = String(record[entityField] || 'Unknown')
				const entitySlug = entityName.toLowerCase().replace(/\s+/g, '-')
				return [xValue, yValue, entityName, entitySlug]
			})
			.filter(([x, y]) => !Number.isNaN(x as number) && !Number.isNaN(y as number))

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
					const entityName = params.value[2] || 'Unknown'
					return `<strong style="color: #000;">${entityName}</strong><br/>${xAxisLabel}: ${formatChartValue(params.value[0], xAxisSymbol)}<br/>${yAxisLabel}: ${formatChartValue(params.value[1], yAxisSymbol)}`
				}
			},
			title: config.title,
			description: config.description,
			defaultExportKind: 'scatter'
		}
	} catch (error) {
		console.log('ScatterChart adapter error:', error)
		return {
			chartType: 'scatter',
			props: { chartData: [], title: 'Scatter Chart Error', height: '360px' },
			title: config.title || 'Scatter Chart Error',
			description: `Failed to render scatter chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
			defaultExportKind: 'scatter'
		}
	}
}
