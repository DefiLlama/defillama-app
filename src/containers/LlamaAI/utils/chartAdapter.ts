import { formatTooltipValue } from '~/components/ECharts/formatters'
import type {
	ICandlestickChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	IScatterChartProps
} from '~/components/ECharts/types'
import { CHART_COLORS, oldBlue } from '~/constants/colors'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import { getNDistinctColors } from '~/utils'

const normalizeHallmarks = (hallmarks?: Array<[number] | [number, string]>): Array<[number, string]> => {
	if (!hallmarks?.length) return []
	const labels = hallmarks.map((h) => h[1]).filter(Boolean)
	if (labels.length > 0 && labels.every((l) => l === labels[0])) {
		return hallmarks.map((h) => [h[0], ''])
	}
	return hallmarks.map((h) => [h[0], h[1] || ''])
}

export type LlamaAICartesianChartProps = Pick<
	IMultiSeriesChart2Props,
	'dataset' | 'charts' | 'chartOptions' | 'valueSymbol' | 'groupBy' | 'hallmarks' | 'hideDataZoom'
>

export type LlamaAICartesianDatasetRow = LlamaAICartesianChartProps['dataset']['source'][number]
export type LlamaAICartesianSeriesConfig = NonNullable<LlamaAICartesianChartProps['charts']>[number]

export interface LlamaAICartesianSeriesMeta {
	name: string
	seriesIndex: number
	metricClass: 'flow' | 'stock'
	baseType: 'line' | 'area' | 'bar'
	apiColor?: string
	resolvedColor: string
	valueSymbol?: string
	yAxisIndex?: number
	isPrimaryAxis: boolean
	canStack: boolean
	canPercentage: boolean
	canGroup: boolean
}

export interface AdaptedLlamaAICartesianChart {
	chartType: 'cartesian'
	props: LlamaAICartesianChartProps
	title: string
	description: string
	rowCount: number
	axisType: 'time' | 'category'
	isTimeChart: boolean
	hasHallmarks: boolean
	groupingPolicy: 'always' | 'never'
	defaultExportKind: 'cartesian'
	seriesMeta: LlamaAICartesianSeriesMeta[]
}

interface AdaptedPieChartData {
	chartType: 'pie'
	props: Partial<IPieChartProps>
	title: string
	description: string
	defaultExportKind: 'pie'
}

interface AdaptedScatterChartData {
	chartType: 'scatter'
	props: Partial<IScatterChartProps>
	title: string
	description: string
	defaultExportKind: 'scatter'
}

interface AdaptedHBarChartData {
	chartType: 'hbar'
	data: Array<[string | number, number]>
	props: {
		height: string
		valueSymbol: string
		colors?: string[]
	}
	title: string
	description: string
	defaultExportKind: 'hbar'
}

export type AdaptedChartData =
	| AdaptedLlamaAICartesianChart
	| AdaptedPieChartData
	| AdaptedScatterChartData
	| AdaptedHBarChartData

const getChartColor = (_entityValue?: string, seriesIndex?: number, fallbackColor: string = oldBlue): string => {
	if (seriesIndex !== undefined) {
		return CHART_COLORS[seriesIndex % CHART_COLORS.length]
	}
	return fallbackColor
}

const parseStringNumber = (value: any): number => {
	if (typeof value === 'number') return value
	if (typeof value === 'string') {
		const parsed = parseFloat(value)
		return Number.isNaN(parsed) ? 0 : parsed
	}
	return 0
}

const convertToTimestampMs = (timestamp: any): number => {
	if (typeof timestamp === 'number') {
		return timestamp.toString().length <= 10 ? timestamp * 1000 : timestamp
	}

	if (typeof timestamp === 'string') {
		const date = new Date(timestamp)
		if (!Number.isNaN(date.getTime())) {
			return date.getTime()
		}

		const parsed = parseInt(timestamp)
		if (!Number.isNaN(parsed)) {
			return parsed.toString().length <= 10 ? parsed * 1000 : parsed
		}
	}

	if (timestamp instanceof Date) {
		return timestamp.getTime()
	}

	console.warn('Could not parse timestamp:', timestamp)
	return Date.now()
}

const BASE_TYPE_MAP: Record<string, 'line' | 'area' | 'bar'> = { area: 'area', bar: 'bar', line: 'line' }

const getCartesianBaseType = (
	config: ChartConfiguration,
	seriesConfig: ChartConfiguration['series'][number]
): 'line' | 'area' | 'bar' => {
	const type = config.type === 'combo' ? seriesConfig.type : config.type
	return BASE_TYPE_MAP[type] ?? 'line'
}

const isValidCartesianPoint = (
	x: string | number | null | undefined,
	value: number | null,
	baseType: 'line' | 'area' | 'bar',
	axisType: 'time' | 'category'
) => {
	if (axisType === 'time') {
		if (typeof x !== 'number' || Number.isNaN(x)) return false
		return baseType === 'bar' ? value != null && !Number.isNaN(value) : value == null || !Number.isNaN(value)
	}

	if (typeof x !== 'string' || x.length === 0) return false
	return value != null && !Number.isNaN(value)
}

const getTooltipValueFromParams = (item: any) => {
	const seriesName = item?.seriesName
	const data = item?.data
	if (data && typeof data === 'object' && !Array.isArray(data) && seriesName && seriesName in data) {
		return data[seriesName]
	}
	if (Array.isArray(item?.value)) return item.value[1]
	return item?.value
}

const createCategoryTooltipFormatter = (
	valueSymbol: string,
	charts: LlamaAICartesianSeriesConfig[] = []
): ((params: unknown) => string) => {
	const symbolBySeries = new Map(charts.map((chart) => [chart.name, chart.valueSymbol ?? valueSymbol]))

	return (params: unknown) => {
		const items = Array.isArray(params) ? params : params ? [params] : []
		if (items.length === 0) return ''

		const header = String(items[0]?.name ?? items[0]?.axisValue ?? items[0]?.data?.category ?? '')
		const values = items
			.map((item) => {
				const seriesName = item?.seriesName
				if (!seriesName) return null
				const rawValue = getTooltipValueFromParams(item)
				const value =
					rawValue == null || rawValue === '-' ? null : typeof rawValue === 'number' ? rawValue : Number(rawValue)
				if (value == null || Number.isNaN(value)) return null
				return {
					marker: item?.marker ?? '',
					seriesName,
					value,
					symbol: symbolBySeries.get(seriesName) ?? valueSymbol
				}
			})
			.filter(
				(
					item
				): item is {
					marker: string
					seriesName: string
					value: number
					symbol: string
				} => item !== null
			)
			.sort((a, b) => b.value - a.value)

		const lines = values
			.map(
				(item) =>
					`<div>${item.marker} ${item.seriesName}: ${formatTooltipValue(item.value, item.symbol ?? valueSymbol)}</div>`
			)
			.join('')

		return `<div style="margin-bottom: 8px; font-weight: 600;">${header}</div>${lines}`
	}
}

function adaptPieChartData(config: ChartConfiguration, rawData: any[]): AdaptedPieChartData {
	try {
		if (!rawData || rawData.length === 0) throw new Error('No data provided')

		const primarySeries = config.series[0]
		if (!primarySeries) throw new Error('No series configuration found')

		const entityField = primarySeries.dataMapping.xField
		const valueField = primarySeries.dataMapping.yField

		const aggregatedData = rawData.reduce(
			(acc, row) => {
				const entity = row[entityField] || 'Unknown'
				const value = parseStringNumber(row[valueField])
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

function adaptScatterChartData(config: ChartConfiguration, rawData: any[]): AdaptedScatterChartData {
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
				const xValue = parseStringNumber(row[xField])
				const yValue = parseStringNumber(row[yField])
				const entityName = row[entityField] || 'Unknown'
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
					return `<strong style="color: #000;">${entityName}</strong><br/>${xAxisLabel}: ${formatTooltipValue(params.value[0], xAxisSymbol)}<br/>${yAxisLabel}: ${formatTooltipValue(params.value[1], yAxisSymbol)}`
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

function adaptHBarChartData(config: ChartConfiguration, rawData: any[]): AdaptedHBarChartData {
	try {
		if (!rawData || rawData.length === 0) throw new Error('No data provided')

		const primarySeries = config.series[0]
		if (!primarySeries) throw new Error('No series configuration found')

		const chartData = rawData
			.map((row, index) => {
				const category = row[primarySeries.dataMapping.xField] || 'Unknown'
				const value = row[primarySeries.dataMapping.yField]
				return [String(category), parseStringNumber(value), index] as const
			})
			.filter(([, value]) => !Number.isNaN(value))

		const colors = getNDistinctColors(chartData.length)

		return {
			chartType: 'hbar',
			data: chartData.map(([category, value]) => [category, value]),
			props: {
				height: '360px',
				valueSymbol: config.valueSymbol ?? '',
				colors
			},
			title: config.title,
			description: config.description,
			defaultExportKind: 'hbar'
		}
	} catch (error) {
		console.log('HBar adapter error:', error)
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

function adaptCartesianChartData(config: ChartConfiguration, rawData: any[]): AdaptedLlamaAICartesianChart {
	try {
		if (!rawData || rawData.length === 0) throw new Error('No data provided')
		if (!config.series?.length) throw new Error('No series configuration found')

		const axisType = config.axes.x.type === 'time' ? 'time' : 'category'
		const dimensionName = axisType === 'time' ? 'timestamp' : 'category'
		const yAxisIdToIndex = new Map<string, number>()
		const yAxisIndexToSymbol = new Map<number, string>()

		for (let index = 0; index < (config.axes.yAxes?.length ?? 0); index++) {
			const axis = config.axes.yAxes[index]
			yAxisIdToIndex.set(axis.id, index)
			yAxisIndexToSymbol.set(index, axis.valueSymbol ?? config.valueSymbol ?? '')
		}

		const rowsByX = new Map<string | number, LlamaAICartesianDatasetRow>()
		const categoryOrder: Array<string | number> = []
		const charts: LlamaAICartesianSeriesConfig[] = []
		const seriesMeta: LlamaAICartesianSeriesMeta[] = []

		for (let seriesIndex = 0; seriesIndex < config.series.length; seriesIndex++) {
			const seriesConfig = config.series[seriesIndex]
			const baseType = getCartesianBaseType(config, seriesConfig)
			const chartType = baseType === 'bar' ? 'bar' : 'line'
			const chartName = seriesConfig.name
			const yAxisIndex = yAxisIdToIndex.get(seriesConfig.yAxisId) ?? 0
			const seriesValueSymbol = yAxisIndexToSymbol.get(yAxisIndex) ?? config.valueSymbol ?? ''
			const apiColor = seriesConfig.styling?.color
			const isPrimaryAxis = yAxisIndex === 0

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

			const resolvedColor = apiColor || getChartColor(entityValue, seriesIndex, oldBlue)

			const seenXValues = new Set<string | number>()
			for (const row of filteredData) {
				const xValue =
					axisType === 'time'
						? convertToTimestampMs(row[seriesConfig.dataMapping.xField])
						: String(row[seriesConfig.dataMapping.xField] || 'Unknown')
				const value = row[seriesConfig.dataMapping.yField]
				const numericValue = value == null ? null : parseStringNumber(value)

				if (!isValidCartesianPoint(xValue, numericValue, baseType, axisType)) continue
				if (seenXValues.has(xValue)) continue
				seenXValues.add(xValue)

				if (!rowsByX.has(xValue)) {
					rowsByX.set(xValue, { [dimensionName]: xValue })
					categoryOrder.push(xValue)
				}

				rowsByX.get(xValue)![chartName] = numericValue
			}

			charts.push({
				type: chartType,
				name: chartName,
				encode: { x: dimensionName, y: chartName },
				color: resolvedColor,
				valueSymbol: seriesValueSymbol,
				yAxisIndex
			})

			seriesMeta.push({
				name: chartName,
				seriesIndex,
				metricClass: seriesConfig.metricClass,
				baseType,
				apiColor,
				resolvedColor,
				valueSymbol: seriesValueSymbol,
				yAxisIndex,
				isPrimaryAxis,
				// These flags describe what the series is intrinsically eligible for.
				// Capability derivation decides whether the chart as a whole can expose the control.
				canStack: baseType !== 'line' || isPrimaryAxis,
				canPercentage: isPrimaryAxis,
				canGroup: axisType === 'time'
			})
		}

		const datasetSource =
			axisType === 'time'
				? Array.from(rowsByX.values()).toSorted((a, b) => Number(a[dimensionName] ?? 0) - Number(b[dimensionName] ?? 0))
				: categoryOrder.map((key) => rowsByX.get(key)!).filter(Boolean)

		const dataset = {
			source: datasetSource,
			dimensions: [dimensionName, ...charts.map((chart) => chart.name)]
		}

		const chartOptions: Record<string, any> = {
			grid: {
				top: 24,
				right: 12,
				bottom: 68,
				left: 12
			}
		}

		if (axisType === 'category') {
			chartOptions.xAxis = {
				type: 'category',
				boundaryGap: true
			}
			chartOptions.tooltip = {
				formatter: createCategoryTooltipFormatter(config.valueSymbol ?? '', charts)
			}
		}

		return {
			chartType: 'cartesian',
			props: {
				dataset,
				charts,
				chartOptions: chartOptions as LlamaAICartesianChartProps['chartOptions'],
				valueSymbol: config.valueSymbol ?? (config.axes.yAxes?.length === 1 ? config.axes.yAxes[0]?.valueSymbol : ''),
				groupBy: axisType === 'time' ? 'daily' : undefined,
				hallmarks: axisType === 'time' && config.hallmarks?.length ? normalizeHallmarks(config.hallmarks) : undefined,
				hideDataZoom: axisType === 'category'
			},
			title: config.title,
			description: config.description,
			rowCount: datasetSource.length,
			axisType,
			isTimeChart: axisType === 'time',
			hasHallmarks: axisType === 'time' && !!config.hallmarks?.length,
			groupingPolicy: axisType === 'time' ? 'always' : 'never',
			defaultExportKind: 'cartesian',
			seriesMeta
		}
	} catch (error) {
		console.log('Cartesian chart adapter error:', error)
		return {
			chartType: 'cartesian',
			props: {
				dataset: { source: [], dimensions: ['timestamp'] },
				charts: [],
				chartOptions: {},
				valueSymbol: config.valueSymbol ?? '',
				groupBy: config.axes.x.type === 'time' ? 'daily' : undefined,
				hallmarks: undefined
			},
			title: config.title || 'Chart Error',
			description: `Failed to render chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
			rowCount: 0,
			axisType: config.axes.x.type === 'time' ? 'time' : 'category',
			isTimeChart: config.axes.x.type === 'time',
			hasHallmarks: false,
			groupingPolicy: config.axes.x.type === 'time' ? 'always' : 'never',
			defaultExportKind: 'cartesian',
			seriesMeta: []
		}
	}
}

export function adaptChartData(config: ChartConfiguration, rawData: any[]): AdaptedChartData {
	switch (config.type) {
		case 'pie':
			return adaptPieChartData(config, rawData)
		case 'scatter':
			return adaptScatterChartData(config, rawData)
		case 'hbar':
			return adaptHBarChartData(config, rawData)
		case 'line':
		case 'area':
		case 'bar':
		case 'combo':
			return adaptCartesianChartData(config, rawData)
		default:
			return adaptCartesianChartData(config, rawData)
	}
}

export function adaptCandlestickData(
	config: ChartConfiguration,
	rawData: any
): { data: ICandlestickChartProps['data']; indicators: ICandlestickChartProps['indicators'] } {
	let data: ICandlestickChartProps['data'] = []
	let indicators: ICandlestickChartProps['indicators'] = []

	if (!Array.isArray(rawData) || rawData.length === 0) {
		return { data, indicators }
	}

	const sample = rawData[0] || {}
	const keys = Object.keys(sample)
	const getTs = (r: any) => {
		const t = Number(r.timestamp)
		if (Number.isFinite(t)) {
			return t < 1e12 ? t * 1000 : t
		}
		return new Date(r.date).getTime()
	}

	data = rawData.map((r: any) => [
		getTs(r),
		parseFloat(r.open ?? r.price ?? 0),
		parseFloat(r.close),
		parseFloat(r.low),
		parseFloat(r.high),
		parseFloat(r.volume || 0)
	])

	const bbUpper = keys.find((k) => k.includes('_bb_upper'))
	const bbMiddle = keys.find((k) => k.includes('_bb_middle'))
	const bbLower = keys.find((k) => k.includes('_bb_lower'))
	if (bbUpper && bbMiddle && bbLower) {
		indicators.push({
			name: 'BBands',
			category: 'overlay',
			data: [],
			values: rawData.map((r: any) => [
				getTs(r),
				{
					upper: parseFloat(r[bbUpper] || 0),
					middle: parseFloat(r[bbMiddle] || 0),
					lower: parseFloat(r[bbLower] || 0)
				}
			])
		})
	}

	const maFields = keys.filter((k) => /^(sma|ema|dema|tema|wma|vwap)_?\d*$/i.test(k))
	for (const field of maFields) {
		indicators.push({
			name: field.toUpperCase(),
			category: 'overlay',
			data: rawData.map((r: any) => {
				const v = parseFloat(r[field])
				return [getTs(r), Number.isFinite(v) ? v : null]
			})
		})
	}

	const rsiField = keys.find((k) => /^rsi(_\d+)?$/i.test(k))
	if (rsiField) {
		indicators.push({
			name: 'RSI',
			category: 'panel',
			data: rawData.map((r: any) => {
				const v = parseFloat(r[rsiField])
				return [getTs(r), Number.isFinite(v) ? v : null]
			})
		})
	}

	const macdField = keys.find((k) => k === 'macd')
	const signalField = keys.find((k) => k === 'macd_signal')
	const histField = keys.find((k) => k === 'macd_histogram')
	if (macdField || signalField || histField) {
		indicators.push({
			name: 'MACD',
			category: 'panel',
			data: [],
			values: rawData.map((r: any) => [
				getTs(r),
				{
					macd: parseFloat(r[macdField as string] || 0),
					signal: parseFloat(r[signalField as string] || 0),
					histogram: parseFloat(r[histField as string] || 0)
				}
			])
		})
	}

	const stochK = keys.find((k) => k === 'stoch_k')
	const stochD = keys.find((k) => k === 'stoch_d')
	if (stochK || stochD) {
		indicators.push({
			name: 'Stoch',
			category: 'panel',
			data: [],
			values: rawData.map((r: any) => [
				getTs(r),
				{ k: parseFloat(r[stochK as string] || 0), d: parseFloat(r[stochD as string] || 0) }
			])
		})
	}

	return { data, indicators }
}
