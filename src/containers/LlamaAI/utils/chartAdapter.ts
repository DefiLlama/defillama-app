import type { ChartConfiguration } from '../types'
import type { IChartProps, IBarChartProps, IMultiSeriesChartProps } from '~/components/ECharts/types'
import { convertToNumberFormat, groupData, generateChartColor } from '~/containers/ProDashboard/utils'
import { colorManager } from '~/containers/ProDashboard/utils/colorManager'
import { formattedNum } from '~/utils'

interface AdaptedChartData {
	chartType: 'area' | 'bar' | 'line' | 'combo' | 'multi-series'
	data: [number, number | null][] | [any, number | null][]
	props: Partial<IChartProps | IBarChartProps | IMultiSeriesChartProps>
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

const validateChartData = (data: [any, number | null][], chartType: string): [any, number | null][] => {
	if (!data || data.length === 0) {
		return []
	}

	const uniqueData = data.filter((item, index, self) => index === self.findIndex((t) => t[0] === item[0]))

	const validData = uniqueData.filter(([x, y]) => {
		if (x === null || x === undefined) {
			return false
		}

		if (chartType === 'area' || chartType === 'line') {
			return y === null || y === undefined || (typeof y === 'number' && !isNaN(y))
		}

		return typeof y === 'number' && !isNaN(y)
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

export function adaptChartData(config: ChartConfiguration, rawData: any[]): AdaptedChartData {
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

		let chartData: [number, number | null][] = []

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
			chartData = rawData.map((row) => {
				const category = row[primarySeries.dataMapping.xField] || 'Unknown'
				const value = row[primarySeries.dataMapping.yField] || 0

				return [category, parseStringNumber(value)] as [any, number]
			})
		}

		const formattedData =
			config.axes.x.type === 'time' ? chartData : chartData.map(([cat, val]) => [cat, val] as [any, number])

		const validatedData = validateChartData(formattedData, config.type)

		const color = primarySeries.styling?.color || getChartColor(undefined, 0, '#2196F3')

		const commonProps: Partial<IChartProps> = {
			title: config.title,
			valueSymbol: config.valueSymbol || '$',
			color,
			height: '300px',
			hideDataZoom: true,
			hideDownloadButton: false,
			tooltipSort: true,

			customLegendName: undefined,
			customLegendOptions: undefined,
			hideDefaultLegend: true,

			chartOptions: {
				tooltip: {
					confine: false,
					appendToBody: true
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
		console.error('Chart adapter error:', error)

		return {
			chartType: 'area',
			data: [],
			props: { title: 'Chart Error', height: '300px' },
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

		const series: Array<{
			data: Array<[number, number | null]>
			type: 'line' | 'bar'
			name: string
			color: string
			metricType?: string
		}> = []

		for (let seriesIndex = 0; seriesIndex < config.series.length; seriesIndex++) {
			const seriesConfig = config.series[seriesIndex]
			let seriesData: [number, number | null][] = []

			let filteredData = rawData
			let entityValue: string | undefined
			if (seriesConfig.dataMapping.entityFilter) {
				const { field, value } = seriesConfig.dataMapping.entityFilter
				entityValue = value
				filteredData = rawData.filter((row) => row[field] === value)
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
					const value = row[seriesConfig.dataMapping.yField] || 0
					return [category as any, parseStringNumber(value)]
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
				metricType: (seriesConfig as any).metricType || 'default'
			})
		}

		const validSeries = series.filter((s) => s.data && s.data.length > 0)

		const multiSeriesProps: Partial<IMultiSeriesChartProps> = {
			series: validSeries,
			title: config.title,
			height: '300px',
			hideDataZoom: true,
			hideDownloadButton: false,
			valueSymbol: config.valueSymbol || '$',

			chartOptions: {
				tooltip: {
					confine: false,
					appendToBody: true
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
			chartType: 'multi-series',
			data: [],
			props: multiSeriesProps,
			title: config.title,
			description: config.description
		}
	} catch (error) {
		console.error('Multi-series chart adapter error:', error)

		return {
			chartType: 'multi-series',
			data: [],
			props: {
				series: [],
				title: 'Chart Error',
				height: '300px'
			},
			title: config.title || 'Chart Error',
			description: `Failed to render multi-series chart: ${error instanceof Error ? error.message : 'Unknown error'}`
		}
	}
}
