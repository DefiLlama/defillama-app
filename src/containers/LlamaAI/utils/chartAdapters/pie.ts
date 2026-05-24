import type { IPieChartProps } from '~/components/ECharts/types'
import type { ChartConfiguration, ChartDataSeries } from '~/containers/LlamaAI/types'
import { getChartColor, oldBlue, parseStringNumber } from '~/containers/LlamaAI/utils/chartAdapters/shared'

export interface AdaptedPieChartData {
	chartType: 'pie'
	props: Partial<IPieChartProps>
	title: string
	description: string
	defaultExportKind: 'pie'
}

export function adaptPieChartData(config: ChartConfiguration, rawData: ChartDataSeries): AdaptedPieChartData {
	try {
		if (!rawData || rawData.length === 0) throw new Error('No data provided')

		const primarySeries = config.series[0]
		if (!primarySeries) throw new Error('No series configuration found')

		const entityField = primarySeries.dataMapping.xField
		const valueField = primarySeries.dataMapping.yField

		const aggregatedData = rawData.reduce(
			(acc, row) => {
				const record = row as Record<string, unknown>
				const entity = String(record[entityField] || 'Unknown')
				const value = parseStringNumber(record[valueField])
				acc[entity] = (acc[entity] ?? 0) + value
				return acc
			},
			{} as Record<string, number>
		)

		const pieData = Object.entries(aggregatedData)
			.map(([name, value]) => ({ name, value: Number(value) }))
			.sort((a, b) => b.value - a.value)

		const stackColors: Record<string, string> = {}
		for (let index = 0; index < pieData.length; index++) {
			stackColors[pieData[index].name] = getChartColor(pieData[index].name, index, oldBlue)
		}

		return {
			chartType: 'pie',
			props: {
				title: config.title,
				chartData: pieData,
				height: '360px',
				stackColors,
				valueSymbol: config.valueSymbol ?? '',
				showLegend: true
			},
			title: config.title,
			description: config.description,
			defaultExportKind: 'pie'
		}
	} catch (error) {
		console.log('PieChart adapter error:', error)
		return {
			chartType: 'pie',
			props: { title: 'Pie Chart Error', height: '360px' },
			title: config.title || 'Pie Chart Error',
			description: `Failed to render pie chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
			defaultExportKind: 'pie'
		}
	}
}
