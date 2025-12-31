import type { IBarChartProps, IChartProps, IMultiSeriesChartProps, IPieChartProps } from '~/components/ECharts/types'
import { formatTooltipValue } from '~/components/ECharts/useDefaults'
import { generateChartColor } from '~/containers/ProDashboard/utils'
import { colorManager } from '~/containers/ProDashboard/utils/colorManager'
import { formattedNum, getNDistinctColors } from '~/utils'
import type { ChartConfiguration } from '../types'

const normalizeHallmarks = (hallmarks?: Array<[number] | [number, string]>): Array<[number, string]> => {
	if (!hallmarks?.length) return []
	const labels = hallmarks.map((h) => h[1]).filter(Boolean)
	if (labels.length > 0 && labels.every((l) => l === labels[0])) {
		return hallmarks.map((h) => [h[0], ''])
	}
	return hallmarks.map((h) => [h[0], h[1] || ''])
}

interface AdaptedChartData {
	chartType: 'area' | 'bar' | 'line' | 'combo' | 'multi-series' | 'pie' | 'scatter'
	data: [number, number | null][] | [any, number | null][] | Array<{ name: string; value: number }>
	props: Partial<IChartProps | IBarChartProps | IMultiSeriesChartProps | IPieChartProps>
	title: string
	description: string
}

const getChartColor = (entityValue?: string, seriesIndex?: number, fallbackColor: string = '#8884d8'): string => {
	if (entityValue) {
		return colorManager.getItemColor(entityValue, 'protocol', fallbackColor)
	}

	if (seriesIndex !== undefined) {
		const pseudoEntity = `series_${seriesIndex}`
		return generateChartColor(pseudoEntity, fallbackColor)
	}

	return fallbackColor
}

const parseStringNumber = (value: any): number => {
	if (typeof value === 'number') {
		return value
	}

	if (typeof value === 'string') {
		const parsed = parseFloat(value)
		return isNaN(parsed) ? 0 : parsed
	}

	return 0
}

const formatPrecisionPercentage = (value: number): string => {
	if (value === null || value === undefined || isNaN(value)) {
		return '0%'
	}

	if (Math.abs(value) < 1) {
		const formatted = value.toFixed(5).replace(/\.?0+$/, '')
		return `${formatted}%`
	}

	return `${Math.round(value * 100) / 100}%`
}

const formatChartValue = (value: number, valueSymbol?: string): string => {
	switch (valueSymbol) {
		case '%':
			return formatPrecisionPercentage(value)
		case '$':
			return formattedNum(value, true)
		case '':
			return formattedNum(value)
		default:
			return `${formattedNum(value)} ${valueSymbol || ''}`
	}
}

const validateChartData = (
	data: [number | string, number | null][],
	chartType: string
): [number | string, number | null][] => {
	if (!data || data.length === 0) {
		return []
	}

	const uniqueData = data.filter((item, index, self) => index === self.findIndex((t) => t[0] === item[0]))

	const validData = uniqueData.filter(([x, y]) => {
		if (x === null || x === undefined) {
			return false
		}

		// Accept strings for categorical charts
		if (typeof x === 'string' && x.length > 0) {
			return typeof y === 'number' && !isNaN(y)
		}

		// Accept numbers for time-series charts
		if (typeof x === 'number') {
			if (chartType === 'area' || chartType === 'line') {
				return y === null || y === undefined || (typeof y === 'number' && !isNaN(y))
			}
			return typeof y === 'number' && !isNaN(y)
		}

		return false
	})

	return validData
}

const determineTimeGrouping = (data: any[], timeField: string): 'day' | 'week' | 'month' => {
	return 'day'
}

const convertToUnixTimestamp = (timestamp: any): number => {
	if (typeof timestamp === 'number') {
		return timestamp.toString().length <= 10 ? timestamp : Math.floor(timestamp / 1000)
	}

	if (typeof timestamp === 'string') {
		const date = new Date(timestamp)
		if (!isNaN(date.getTime())) {
			return Math.floor(date.getTime() / 1000)
		}

		const parsed = parseInt(timestamp)
		if (!isNaN(parsed)) {
			return parsed.toString().length <= 10 ? parsed : Math.floor(parsed / 1000)
		}
	}

	if (timestamp instanceof Date) {
		return Math.floor(timestamp.getTime() / 1000)
	}

	console.warn('Could not parse timestamp:', timestamp)
	return Math.floor(Date.now() / 1000)
}

function adaptPieChartData(config: ChartConfiguration, rawData: any[]): AdaptedChartData {
	try {
		if (!rawData || rawData.length === 0) {
			throw new Error('No data provided')
		}

		const primarySeries = config.series[0]
		if (!primarySeries) {
			throw new Error('No series configuration found')
		}

		const entityField = primarySeries.dataMapping.xField
		const valueField = primarySeries.dataMapping.yField

		const aggregatedData = rawData.reduce(
			(acc, row) => {
				const entity = row[entityField] || 'Unknown'
				const value = parseStringNumber(row[valueField])

				if (acc[entity]) {
					acc[entity] += value
				} else {
					acc[entity] = value
				}
				return acc
			},
			{} as Record<string, number>
		)

		const pieData = Object.entries(aggregatedData)
			.map(([name, value]: [string, number]) => ({ name, value }))
			.sort((a, b) => b.value - a.value)

		const stackColors: Record<string, string> = {}
		pieData.forEach((item, index) => {
			stackColors[item.name] = getChartColor(item.name, index, '#8884d8')
		})

		const pieProps: Partial<IPieChartProps> = {
			title: config.title,
			chartData: pieData,
			height: '360px',
			stackColors,
			valueSymbol: config.valueSymbol ?? '',
			showLegend: true
		}

		return {
			chartType: 'pie',
			data: pieData as any,
			props: pieProps,
			title: config.title,
			description: config.description
		}
	} catch (error) {
		console.log('PieChart adapter error:', error)
		return {
			chartType: 'pie',
			data: [],
			props: { title: 'Pie Chart Error', height: '360px' },
			title: config.title || 'Pie Chart Error',
			description: `Failed to render pie chart: ${error instanceof Error ? error.message : 'Unknown error'}`
		}
	}
}

function adaptScatterChartData(config: ChartConfiguration, rawData: any[]): AdaptedChartData {
	try {
		if (!rawData || rawData.length === 0) {
			throw new Error('No data provided')
		}

		const primarySeries = config.series[0]
		if (!primarySeries) {
			throw new Error('No series configuration found')
		}

		const xField = primarySeries.dataMapping.xField
		const yField = primarySeries.dataMapping.yField

		const entityField = primarySeries.dataMapping.entityFilter?.field || 'protocol'
		const entityType = entityField === 'chain' ? 'chain' : 'protocol'

		const scatterData = rawData
			.map((row) => {
				const xValue = parseStringNumber(row[xField])
				const yValue = parseStringNumber(row[yField])
				const entityName = row[entityField] || 'Unknown'
				const entitySlug = entityName.toLowerCase().replace(/\s+/g, '-')
				return [xValue, yValue, entityName, entitySlug]
			})
			.filter(([x, y]) => !isNaN(x as number) && !isNaN(y as number))

		const xAxisLabel = config.axes.x.label || xField
		const yAxisLabel = config.axes.yAxes[0]?.label || yField

		const xAxisSymbol = config.axes.x.valueSymbol ?? config.valueSymbol ?? ''
		const yAxisSymbol = config.axes.yAxes[0]?.valueSymbol ?? config.valueSymbol ?? ''

		const formatValue = (val: number, symbol: string) => {
			if (symbol === '$') return formattedNum(val, true)
			if (symbol === '%') return val.toFixed(2) + '%'
			if (symbol === '') return formattedNum(val)
			return `${formattedNum(val)} ${symbol}`
		}

		const scatterProps = {
			chartData: scatterData,
			title: config.title,
			xAxisLabel,
			yAxisLabel,
			valueSymbol: config.valueSymbol || '',
			height: '360px',
			entityType,
			tooltipFormatter: (params: any) => {
				if (params.value.length >= 2) {
					const xValue = params.value[0]
					const yValue = params.value[1]
					const entityName = params.value[2] || 'Unknown'
					return `<strong style="color: #000;">${entityName}</strong><br/>${xAxisLabel}: ${formatValue(xValue, xAxisSymbol)}<br/>${yAxisLabel}: ${formatValue(yValue, yAxisSymbol)}`
				}
				return ''
			}
		}

		return {
			chartType: 'scatter',
			data: scatterData as any,
			props: scatterProps,
			title: config.title,
			description: config.description
		}
	} catch (error) {
		console.log('ScatterChart adapter error:', error)
		return {
			chartType: 'scatter',
			data: [],
			props: { chartData: [], title: 'Scatter Chart Error', height: '360px' },
			title: config.title || 'Scatter Chart Error',
			description: `Failed to render scatter chart: ${error instanceof Error ? error.message : 'Unknown error'}`
		}
	}
}

export function adaptChartData(config: ChartConfiguration, rawData: any[]): AdaptedChartData {
	if (config.type === 'pie') {
		return adaptPieChartData(config, rawData)
	}

	if (config.type === 'scatter') {
		return adaptScatterChartData(config, rawData)
	}

	try {
		if (!rawData || rawData.length === 0) {
			throw new Error('No data provided')
		}

		const timeField = config.dataTransformation?.timeField || config.axes.x.field
		const timeGrouping = determineTimeGrouping(rawData, timeField)

		const primarySeries = config.series[0]
		if (!primarySeries) {
			throw new Error('No series configuration found')
		}

		let chartData: [number, number | null][] | [string, number, string][] = []
		let stackColors: Record<string, string> = {}

		if (config.axes.x.type === 'time') {
			chartData = rawData.map((row) => {
				const timestamp = row[primarySeries.dataMapping.xField]
				const value = row[primarySeries.dataMapping.yField]

				const unixTimestamp = convertToUnixTimestamp(timestamp)
				// Preserve null/undefined values for connectNulls to work
				return [unixTimestamp, value == null ? null : parseStringNumber(value)]
			})

			chartData.sort((a, b) => a[0] - b[0])
		} else {
			const allColors = getNDistinctColors(rawData.length)
			chartData = rawData.map((row, index) => {
				const category = row[primarySeries.dataMapping.xField] || 'Unknown'
				const value = row[primarySeries.dataMapping.yField] || 0
				stackColors[category] = allColors[index]
				return [category, parseStringNumber(value)]
			})
		}

		const validatedData = validateChartData(chartData, config.type)

		const color = primarySeries.styling?.color || getChartColor(undefined, 0, '#2196F3')

		const commonProps: Partial<IChartProps> = {
			title: config.title,
			valueSymbol: config.valueSymbol ?? '',
			color,
			height: '360px',
			hideDownloadButton: false,
			tooltipSort: true,

			customLegendName: undefined,
			customLegendOptions: undefined,
			hideDefaultLegend: true,
			stackColors,

			...(config.hallmarks?.length && {
				hallmarks: normalizeHallmarks(config.hallmarks)
			}),

			chartOptions: {
				grid: {
					top: 12,
					right: 12,
					bottom: 68,
					left: 12
				},
				tooltip: {
					confine: false,
					appendToBody: true,
					...(config.type === 'bar' &&
						config.axes.x.type !== 'time' && {
							formatter: (params: any) => {
								const value = params[0].value
								return `<strong>${value[0]}</strong>: ${formatTooltipValue(value[1], config.valueSymbol ?? '')}`
							}
						})
				}
			},

			...(config.valueSymbol === '%' && {
				tooltipFormatter: (params: any) => {
					if (Array.isArray(params)) {
						const timestamp = params[0]?.value?.[0]
						const date = new Date(timestamp).toLocaleDateString()

						let content = `<div style="margin-bottom: 8px; font-weight: 600;">${date}</div>`

						params.forEach((param: any) => {
							const value = param.value?.[1]
							if (value !== null && value !== undefined) {
								content += `<div>${param.marker} ${param.seriesName}: ${formatPrecisionPercentage(value)}</div>`
							}
						})

						return content
					}
					return ''
				}
			})
		}

		return {
			chartType: config.type === 'combo' ? 'area' : config.type,
			data: validatedData,
			props: commonProps,
			title: config.title,
			description: config.description
		}
	} catch (error) {
		console.log('Chart adapter error:', error)

		return {
			chartType: 'area',
			data: [],
			props: { title: 'Chart Error', height: '360px' },
			title: config.title || 'Chart Error',
			description: `Failed to render chart: ${error instanceof Error ? error.message : 'Unknown error'}`
		}
	}
}

export function adaptMultiSeriesData(config: ChartConfiguration, rawData: any[]): AdaptedChartData {
	try {
		if (!rawData || rawData.length === 0) {
			throw new Error('No data provided')
		}

		if (!config.series || config.series.length <= 1) {
			return adaptChartData(config, rawData)
		}

		const yAxisIdToIndex = new Map<string, number>()
		const yAxisIndexToSymbol = new Map<number, string>()
		config.axes.yAxes?.forEach((axis, index) => {
			yAxisIdToIndex.set(axis.id, index)
			yAxisIndexToSymbol.set(index, axis.valueSymbol ?? config.valueSymbol ?? '$')
		})

		const series: Array<{
			data: Array<[number, number | null]>
			type: 'line' | 'bar'
			name: string
			color: string
			metricClass: 'flow' | 'stock'
			metricType?: string
			yAxisIndex?: number
		}> = []

		for (let seriesIndex = 0; seriesIndex < config.series.length; seriesIndex++) {
			const seriesConfig = config.series[seriesIndex]
			let seriesData: [number, number | null][] = []

			let filteredData = rawData
			let entityValue: string | undefined
			if (seriesConfig.dataMapping.entityFilter) {
				const { field, value } = seriesConfig.dataMapping.entityFilter
				entityValue = value
				filteredData = rawData.filter((row) => {
					const rowValue = row[field]
					if (typeof rowValue === 'string' && typeof value === 'string') {
						return rowValue.toLowerCase() === value.toLowerCase()
					}
					return rowValue === value
				})
			}

			if (config.axes.x.type === 'time') {
				seriesData = filteredData.map((row) => {
					const timestamp = row[seriesConfig.dataMapping.xField]
					const value = row[seriesConfig.dataMapping.yField]
					const unixTimestamp = convertToUnixTimestamp(timestamp)
					return [unixTimestamp, value == null ? null : parseStringNumber(value)]
				})

				seriesData.sort((a, b) => a[0] - b[0])
			} else {
				seriesData = filteredData.map((row) => {
					const category = row[seriesConfig.dataMapping.xField] || 'Unknown'
					const value = row[seriesConfig.dataMapping.yField]
					return [category as any, value == null ? null : parseStringNumber(value)]
				})
			}

			const color = seriesConfig.styling?.color || getChartColor(entityValue, seriesIndex, '#8884d8')

			const validatedSeriesData = validateChartData(seriesData, seriesConfig.type)

			const chartType = seriesConfig.type === 'area' ? 'line' : (seriesConfig.type as 'line' | 'bar')

			series.push({
				data: validatedSeriesData as Array<[number, number | null]>,
				type: chartType,
				name: seriesConfig.name,
				color,
				metricClass: seriesConfig.metricClass,
				metricType: seriesConfig.metricClass,
				yAxisIndex: yAxisIdToIndex.get(seriesConfig.yAxisId) ?? 0
			})
		}

		const validSeries = series.filter((s) => s.data && s.data.length > 0)
		const yAxisSymbols = config.axes.yAxes?.map((axis) => axis.valueSymbol ?? config.valueSymbol ?? '$') ?? []

		const multiSeriesProps: Partial<IMultiSeriesChartProps> = {
			series: validSeries,
			title: config.title,
			height: '360px',
			hideDownloadButton: false,
			valueSymbol: config.valueSymbol ?? '',
			yAxisSymbols,
			xAxisType: config.axes.x.type === 'value' ? 'category' : config.axes.x.type,

			...(config.hallmarks?.length && {
				hallmarks: normalizeHallmarks(config.hallmarks)
			}),

			chartOptions: {
				grid: {
					top: 24,
					right: 12,
					bottom: 68,
					left: 12
				},
				tooltip: {
					confine: false,
					appendToBody: true,
					formatter: (params: any) => {
						if (!Array.isArray(params)) return ''
						const xValue = params[0]?.value?.[0]
						const header = config.axes.x.type === 'time' ? new Date(xValue).toLocaleDateString() : String(xValue)

						let content = `<div style="margin-bottom: 8px; font-weight: 600;">${header}</div>`
						params.forEach((param: any) => {
							const value = param.value?.[1]
							if (value != null) {
								const yAxisIndex = validSeries[param.seriesIndex]?.yAxisIndex ?? 0
								const axisSymbol = yAxisIndexToSymbol.get(yAxisIndex) ?? config.valueSymbol ?? '$'
								const formattedValue =
									axisSymbol === '%'
										? formatPrecisionPercentage(value)
										: formatTooltipValue(value, axisSymbol)
								content += `<div>${param.marker} ${param.seriesName}: ${formattedValue}</div>`
							}
						})
						return content
					}
				}
			}
		}

		return {
			chartType: 'multi-series',
			data: [],
			props: multiSeriesProps,
			title: config.title,
			description: config.description
		}
	} catch (error) {
		console.log('Multi-series chart adapter error:', error)

		return {
			chartType: 'multi-series',
			data: [],
			props: {
				series: [],
				title: 'Chart Error',
				height: '360px'
			},
			title: config.title || 'Chart Error',
			description: `Failed to render multi-series chart: ${error instanceof Error ? error.message : 'Unknown error'}`
		}
	}
}
