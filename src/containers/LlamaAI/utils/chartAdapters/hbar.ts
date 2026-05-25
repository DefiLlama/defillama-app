import type { ChartConfiguration, ChartDataSeries } from '~/containers/LlamaAI/types'
import { buildAxisLogoUrls, parseFiniteNumber } from '~/containers/LlamaAI/utils/chartAdapters/shared'
import { getNDistinctColors } from '~/utils'

export interface AdaptedHBarChartData {
	chartType: 'hbar'
	data: Array<[string | number, number]>
	props: {
		height: string
		valueSymbol: string
		colors?: string[]
		logos?: string[]
	}
	title: string
	description: string
	defaultExportKind: 'hbar'
}

export function adaptHBarChartData(config: ChartConfiguration, rawData: ChartDataSeries): AdaptedHBarChartData {
	try {
		if (!rawData || rawData.length === 0) throw new Error('No data provided')

		const primarySeries = config.series[0]
		if (!primarySeries) throw new Error('No series configuration found')

		const chartData: Array<[string, number, number]> = []
		for (let index = 0; index < rawData.length; index++) {
			const record = rawData[index] as Record<string, unknown>
			const category = record[primarySeries.dataMapping.xField] ?? 'Unknown'
			const value = parseFiniteNumber(record[primarySeries.dataMapping.yField])
			if (value === null) continue
			chartData.push([String(category), value, index])
		}

		const colors = getNDistinctColors(chartData.length)
		const allLogos = buildAxisLogoUrls(config.axes.x.entityType, config.axes.x.logoCategories)
		const logos = allLogos ? chartData.map(([, , origIdx]) => allLogos[origIdx] ?? '') : undefined

		return {
			chartType: 'hbar',
			data: chartData.map(([category, value]) => [category, value]),
			props: {
				height: '360px',
				valueSymbol: config.valueSymbol ?? '',
				colors,
				...(logos && { logos })
			},
			title: config.title,
			description: config.description,
			defaultExportKind: 'hbar'
		}
	} catch (error) {
		console.error('HBar adapter error:', error)
		return {
			chartType: 'hbar',
			data: [],
			props: {
				height: '360px',
				valueSymbol: config.valueSymbol ?? ''
			},
			title: config.title || 'Chart Error',
			description: `Failed to render horizontal bar chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
			defaultExportKind: 'hbar'
		}
	}
}
