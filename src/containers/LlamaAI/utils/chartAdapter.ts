import { formatChartValue } from '~/components/ECharts/formatters'
import type {
	ICandlestickChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	IScatterChartProps
} from '~/components/ECharts/types'
import { CHART_COLORS, oldBlue } from '~/constants/colors'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import { getNDistinctColors } from '~/utils'
import { chainIconUrl, equityIconUrl, geckoTokenIconUrl, peggedAssetIconUrl, tokenIconUrl } from '~/utils/icons'

type AxisEntityType = NonNullable<ChartConfiguration['axes']['x']['entityType']>

function buildAxisLogoUrls(
	entityType: AxisEntityType | undefined,
	logoCategories: string[] | undefined
): string[] | undefined {
	if (!entityType || !logoCategories?.length) return undefined
	const builder =
		entityType === 'protocol'
			? tokenIconUrl
			: entityType === 'chain'
				? chainIconUrl
				: entityType === 'token'
					? geckoTokenIconUrl
					: entityType === 'stablecoin'
						? peggedAssetIconUrl
						: entityType === 'equity'
							? equityIconUrl
							: null
	if (!builder) return undefined
	return logoCategories.map((v) => (v ? builder(v) : ''))
}

const normalizeHallmarks = (hallmarks?: Array<[number] | [number, string]>): Array<[number, string]> => {
	if (!hallmarks?.length) return []
	const labels = hallmarks.map((h) => h[1]).filter(Boolean)
	if (labels.length > 1 && labels.every((l) => l === labels[0])) {
		return hallmarks.map((h) => [h[0], ''])
	}
	return hallmarks.map((h) => [h[0], h[1] || ''])
}

export type LlamaAICartesianChartProps = Pick<
	IMultiSeriesChart2Props,
	'dataset' | 'charts' | 'chartOptions' | 'valueSymbol' | 'groupBy' | 'hallmarks' | 'hideDataZoom' | 'categoryLogos'
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
		logos?: string[]
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

const MONTH_NAME_TO_INDEX: Record<string, number> = {
	jan: 0,
	january: 0,
	feb: 1,
	february: 1,
	mar: 2,
	march: 2,
	apr: 3,
	april: 3,
	may: 4,
	jun: 5,
	june: 5,
	jul: 6,
	july: 6,
	aug: 7,
	august: 7,
	sep: 8,
	sept: 8,
	september: 8,
	oct: 9,
	october: 9,
	nov: 10,
	november: 10,
	dec: 11,
	december: 11
}

const DATE_LIKE_FIELD_RE = /(^|_)(date|day|month|time|timestamp)$/i

const parseStrictDateLabelToMs = (timestamp: unknown): number | null => {
	if (typeof timestamp === 'number') {
		if (!Number.isFinite(timestamp)) return null
		return timestamp.toString().length <= 10 ? timestamp * 1000 : timestamp
	}

	if (timestamp instanceof Date) {
		const value = timestamp.getTime()
		return Number.isNaN(value) ? null : value
	}

	if (typeof timestamp !== 'string') return null

	const value = timestamp.trim()
	if (!value) return null

	if (/^\d{10}$/.test(value)) {
		return Number(value) * 1000
	}

	if (/^\d{13}$/.test(value)) {
		return Number(value)
	}

	const isoMonthMatch = value.match(/^(\d{4})-(\d{2})$/)
	if (isoMonthMatch) {
		const year = Number(isoMonthMatch[1])
		const month = Number(isoMonthMatch[2])
		if (month < 1 || month > 12) return null
		return Date.UTC(year, month - 1, 1)
	}

	const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (isoDateMatch) {
		const year = Number(isoDateMatch[1])
		const month = Number(isoDateMatch[2])
		const day = Number(isoDateMatch[3])
		if (month < 1 || month > 12 || day < 1 || day > 31) return null
		const d = new Date(Date.UTC(year, month - 1, day))
		if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
		return d.getTime()
	}

	if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
		const date = new Date(value)
		return Number.isNaN(date.getTime()) ? null : date.getTime()
	}

	const monthNameMatch = value.match(/^([A-Za-z]+)\s+(\d{4})$/)
	if (monthNameMatch) {
		const monthIndex = MONTH_NAME_TO_INDEX[monthNameMatch[1].toLowerCase()]
		if (monthIndex == null) return null
		return Date.UTC(Number(monthNameMatch[2]), monthIndex, 1)
	}

	return null
}

const looksLikeDateField = (field: string) => DATE_LIKE_FIELD_RE.test(field)

function inferTimeSeriesAxis(
	config: ChartConfiguration,
	rawData: any[]
): {
	axisType: 'time' | 'category'
	dimensionName: 'timestamp' | 'category'
	normalizeXValue: (rawValue: unknown) => number | string | null
	reason: 'declared-time' | 'promoted-date-category' | 'category'
} {
	if (config.axes.x.type === 'time') {
		return {
			axisType: 'time',
			dimensionName: 'timestamp',
			normalizeXValue: (rawValue) => parseStrictDateLabelToMs(rawValue),
			reason: 'declared-time'
		}
	}

	if (config.axes.x.type !== 'category' || !looksLikeDateField(config.axes.x.field)) {
		return {
			axisType: 'category',
			dimensionName: 'category',
			normalizeXValue: (rawValue) => (rawValue == null ? null : String(rawValue || 'Unknown')),
			reason: 'category'
		}
	}

	// Compatibility shim: some shared/generated payloads serialize monthly or daily dates
	// as category labels. Promote only when every non-empty value parses cleanly.
	const rawValues = rawData
		.map((row) => row?.[config.axes.x.field])
		.filter((value) => value != null && String(value).trim().length > 0)

	if (rawValues.length === 0 || rawValues.some((v) => typeof v !== 'string')) {
		return {
			axisType: 'category',
			dimensionName: 'category',
			normalizeXValue: (rawValue) => (rawValue == null ? null : String(rawValue || 'Unknown')),
			reason: 'category'
		}
	}

	const parsedValues = rawValues.map((value) => parseStrictDateLabelToMs(value))
	const allParsed = parsedValues.every((value) => value != null)
	const uniqueTimestamps = new Set(parsedValues.filter((value): value is number => value != null))

	if (allParsed && uniqueTimestamps.size >= 2) {
		return {
			axisType: 'time',
			dimensionName: 'timestamp',
			normalizeXValue: (rawValue) => parseStrictDateLabelToMs(rawValue),
			reason: 'promoted-date-category'
		}
	}

	return {
		axisType: 'category',
		dimensionName: 'category',
		normalizeXValue: (rawValue) => (rawValue == null ? null : String(rawValue || 'Unknown')),
		reason: 'category'
	}
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

const getNumericTooltipValueFromParams = (item: any): number | null => {
	const rawValue = getTooltipValueFromParams(item)
	const value = rawValue == null || rawValue === '-' ? null : typeof rawValue === 'number' ? rawValue : Number(rawValue)
	return value == null || Number.isNaN(value) ? null : value
}

export const createCategoryTooltipFormatter = (
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
				const value = getNumericTooltipValueFromParams(item)
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
					`<div>${item.marker} ${item.seriesName}: ${formatChartValue(item.value, item.symbol ?? valueSymbol)}</div>`
			)
			.join('')

		return `<div style="margin-bottom: 8px; font-weight: 600;">${header}</div>${lines}`
	}
}

export const createTimeTooltipFormatter = (
	valueSymbol: string,
	charts: LlamaAICartesianSeriesConfig[] = []
): ((params: unknown) => string) => {
	const seriesSymbols = new Map(charts.map((c) => [c.name, c.valueSymbol ?? valueSymbol]))

	return (params: unknown) => {
		const items = Array.isArray(params) ? params : params ? [params] : []
		if (items.length === 0) return ''
		const first: any = items[0]
		const ts = Array.isArray(first?.value) ? Number(first.value[0]) : Number(first?.data?.timestamp ?? first?.axisValue)
		const dateStr = Number.isFinite(ts)
			? new Date(ts).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					timeZone: 'UTC'
				})
			: ''
		const lines = items
			.map((it: any) => {
				const name = it?.seriesName
				if (!name) return null
				const value = getNumericTooltipValueFromParams(it)
				if (value == null) return null
				return {
					color: it?.color ?? '#888',
					name,
					symbol: seriesSymbols.get(name) ?? valueSymbol,
					value
				}
			})
			.filter(
				(
					item
				): item is {
					color: string
					name: string
					symbol: string
					value: number
				} => item !== null
			)
			.sort((a, b) => b.value - a.value)
			.map(
				(item) =>
					`<li style="list-style:none;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px;"></span>${item.name}: <strong>${formatChartValue(item.value, item.symbol)}</strong></li>`
			)
			.join('')
		return `<div style="font-weight:600;margin-bottom:4px;">${dateStr}</div><ul style="margin:0;padding:0;">${lines}</ul>`
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

		const axisInference = inferTimeSeriesAxis(config, rawData)
		const { axisType, dimensionName, normalizeXValue } = axisInference
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
				const xValue = normalizeXValue(row[seriesConfig.dataMapping.xField])
				const value = row[seriesConfig.dataMapping.yField]
				const numericValue = value == null ? null : parseStringNumber(value)

				if (xValue == null) continue
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
				? Array.from(rowsByX.values()).sort((a, b) => Number(a[dimensionName] ?? 0) - Number(b[dimensionName] ?? 0))
				: categoryOrder.map((key) => rowsByX.get(key)!).filter(Boolean)

		const dataset = {
			source: datasetSource,
			dimensions: [dimensionName, ...charts.map((chart) => chart.name)]
		}

		const chartOptions: Record<string, any> = {}

		if (axisType === 'category') {
			chartOptions.xAxis = {
				type: 'category',
				boundaryGap: true
			}
			chartOptions.tooltip = {
				formatter: createCategoryTooltipFormatter(config.valueSymbol ?? '', charts)
			}
		}

		const primaryAxisSymbol = config.axes.yAxes?.[0]?.valueSymbol ?? config.valueSymbol ?? ''
		if (config.axes.yAxes?.length) {
			chartOptions.yAxis = config.axes.yAxes.map((axis, index) => {
				const existingAxis = Array.isArray(chartOptions.yAxis)
					? (chartOptions.yAxis[index] ?? {})
					: index === 0
						? (chartOptions.yAxis ?? {})
						: {}
				const valueSymbol = axis.valueSymbol ?? config.valueSymbol ?? ''

				return {
					...existingAxis,
					axisLabel: {
						...(existingAxis?.axisLabel ?? {}),
						formatter: (value: number) => formatChartValue(value, valueSymbol)
					},
					...(axis.min !== undefined ? { min: axis.min } : {})
				}
			})
		} else {
			chartOptions.yAxis = {
				...(chartOptions.yAxis ?? {}),
				axisLabel: {
					...(chartOptions.yAxis?.axisLabel ?? {}),
					formatter: (value: number) => formatChartValue(value, primaryAxisSymbol)
				}
			}
		}

		if (axisType === 'time' && !chartOptions.tooltip) {
			chartOptions.tooltip = {
				formatter: createTimeTooltipFormatter(primaryAxisSymbol, charts)
			}
		}

		let categoryLogos: string[] | undefined
		if (axisType === 'category') {
			const allLogos = buildAxisLogoUrls(config.axes.x.entityType, config.axes.x.logoCategories)
			if (allLogos?.length) {
				categoryLogos = categoryOrder.map((_, i) => allLogos[i] ?? '')
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
				hideDataZoom: axisType === 'category',
				...(categoryLogos && { categoryLogos })
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
	const timeField = config.dataTransformation?.timeField
	const getTs = (r: any) => {
		const candidates = timeField ? [r[timeField], r.timestamp, r.date] : [r.timestamp, r.date]
		for (const raw of candidates) {
			if (raw == null) continue
			const t = Number(raw)
			if (Number.isFinite(t)) {
				return t < 1e12 ? t * 1000 : t
			}
			const d = new Date(raw).getTime()
			if (Number.isFinite(d)) return d
		}
		return NaN
	}

	const metrics = config.dataTransformation?.metrics ?? []
	const ohlcFields = {
		open: metrics.find((m) => /open/i.test(m)) ?? 'open',
		high: metrics.find((m) => /high/i.test(m)) ?? 'high',
		low: metrics.find((m) => /low/i.test(m)) ?? 'low',
		close: metrics.find((m) => /close/i.test(m)) ?? 'close'
	}

	data = rawData.map((r: any) => [
		getTs(r),
		parseFloat(r[ohlcFields.open] ?? r.price ?? 0),
		parseFloat(r[ohlcFields.close]),
		parseFloat(r[ohlcFields.low]),
		parseFloat(r[ohlcFields.high]),
		parseFloat(r.volume || 0)
	])

	const bbUpper = keys.find((k) => k.includes('_bb_upper'))
	const bbMiddle = keys.find((k) => k.includes('_bb_middle'))
	const bbLower = keys.find((k) => k.includes('_bb_lower'))
	if (bbUpper && bbMiddle && bbLower) {
		const hasValidBB = rawData.some((r: any) => {
			const u = parseFloat(r[bbUpper])
			const m = parseFloat(r[bbMiddle])
			const l = parseFloat(r[bbLower])
			return (Number.isFinite(u) && u !== 0) || (Number.isFinite(m) && m !== 0) || (Number.isFinite(l) && l !== 0)
		})
		if (hasValidBB) {
			indicators.push({
				name: 'BBands',
				category: 'overlay',
				data: [],
				values: rawData.map((r: any) => {
					const u = r[bbUpper] != null ? parseFloat(r[bbUpper]) : NaN
					const m = r[bbMiddle] != null ? parseFloat(r[bbMiddle]) : NaN
					const l = r[bbLower] != null ? parseFloat(r[bbLower]) : NaN
					return [
						getTs(r),
						{
							upper: Number.isFinite(u) && u !== 0 ? u : null,
							middle: Number.isFinite(m) && m !== 0 ? m : null,
							lower: Number.isFinite(l) && l !== 0 ? l : null
						}
					]
				})
			})
		}
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
		const hasValidMACD = rawData.some((r: any) => {
			const m = parseFloat(r[macdField as string])
			const s = parseFloat(r[signalField as string])
			const h = parseFloat(r[histField as string])
			return Number.isFinite(m) || Number.isFinite(s) || Number.isFinite(h)
		})
		if (hasValidMACD) {
			indicators.push({
				name: 'MACD',
				category: 'panel',
				data: [],
				values: rawData.map((r: any) => {
					const mv = r[macdField as string] != null ? parseFloat(r[macdField as string]) : NaN
					const sv = r[signalField as string] != null ? parseFloat(r[signalField as string]) : NaN
					const hv = r[histField as string] != null ? parseFloat(r[histField as string]) : NaN
					return [
						getTs(r),
						{
							macd: Number.isFinite(mv) ? mv : null,
							signal: Number.isFinite(sv) ? sv : null,
							histogram: Number.isFinite(hv) ? hv : null
						}
					]
				})
			})
		}
	}

	const stochK = keys.find((k) => k === 'stoch_k')
	const stochD = keys.find((k) => k === 'stoch_d')
	if (stochK || stochD) {
		const hasValidStoch = rawData.some((r: any) => {
			const k = parseFloat(r[stochK as string])
			const d = parseFloat(r[stochD as string])
			return Number.isFinite(k) || Number.isFinite(d)
		})
		if (hasValidStoch) {
			indicators.push({
				name: 'Stoch',
				category: 'panel',
				data: [],
				values: rawData.map((r: any) => {
					const k = r[stochK as string] != null ? parseFloat(r[stochK as string]) : NaN
					const d = r[stochD as string] != null ? parseFloat(r[stochD as string]) : NaN
					return [getTs(r), { k: Number.isFinite(k) ? k : null, d: Number.isFinite(d) ? d : null }]
				})
			})
		}
	}

	return { data, indicators }
}
