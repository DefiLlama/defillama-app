import type * as echarts from 'echarts/core'

type Value = string | number | boolean

type EChartsFormatterParams = Record<string, unknown>

type ChartDataItem = any

export interface IChartProps {
	chartData: ChartDataItem[]
	stacks?: Array<string>
	valueSymbol?: string
	title?: string
	color?: string
	hallmarks?: [number, string][]
	style?: React.CSSProperties
	hideDefaultLegend?: boolean
	customLegendName?: string
	customLegendOptions?: Array<string>
	tooltipSort?: boolean
	tooltipOrderBottomUp?: boolean
	tooltipValuesRelative?: boolean
	hideLegend?: boolean
	chartOptions?: {
		[key: string]: {
			[key: string]: Value | Array<Value> | ((params: EChartsFormatterParams) => string) | Record<string, Value>
		}
	}
	height?: string
	stackColors?: {
		[stack: string]: string
	}
	expandTo100Percent?: boolean
	isStackedChart?: boolean
	chartType?: 'line' | 'bar'
	hideGradient?: boolean
	unlockTokenSymbol?: string
	isThemeDark?: boolean
	groupBy?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
	customYAxis?: Array<string>
	hideOthersInTooltip?: boolean
	hideDataZoom?: boolean
	hideDownloadButton?: boolean
	containerClassName?: string
	connectNulls?: boolean
	alwaysShowTooltip?: boolean
	onReady?: (instance: echarts.ECharts | null) => void
	enableImageExport?: boolean
	imageExportFilename?: string
	imageExportTitle?: string
}

export interface ISingleSeriesChartProps extends Omit<
	IChartProps,
	| 'stacks'
	| 'stackColors'
	| 'customLegendOptions'
	| 'customLegendName'
	| 'customYAxis'
	| 'groupBy'
	| 'tooltipOrderBottomUp'
	| 'hideDownloadButton'
	| 'containerClassName'
	| 'enableImageExport'
	| 'imageExportFilename'
	| 'imageExportTitle'
> {
	chartName?: string
	chartType: 'line' | 'bar'
	symbolOnChart?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none'
}

export interface IBarChartProps extends Omit<IChartProps, 'stacks' | 'expandTo100Percent'> {
	stacks?: {
		[stack: string]: string
	}
	orientation?: 'vertical' | 'horizontal'
}

export type MultiSeriesChart2Dataset = {
	source: Array<
		Record<
			string,
			// ECharts dataset.source supports objects; keep permissive for mixed/null values.
			string | number | null | undefined
		>
	>
	// Strongly required so the chart never has to infer keys.
	dimensions: string[]
}

export type MultiSeriesChart2SeriesConfig = {
	type: 'line' | 'bar'
	name: string
	stack?: string
	encode: {
		x: number | Array<number> | string | Array<string>
		y: number | Array<number> | string | Array<string>
	}
	color?: string
	yAxisIndex?: number
	/** Symbol for this series' y-axis label (e.g. '%' or '$'). Falls back to the component-level valueSymbol. */
	valueSymbol?: string
	/** Disable area fill for this series (line only). */
	hideAreaStyle?: boolean
	// Optional: enable point markers on line series.
	// Note: ECharts "large" mode disables symbols, so `showSymbol: true` will
	// implicitly disable large mode unless `large` is explicitly set.
	showSymbol?: boolean
	symbol?: string
	symbolSize?: number
	large?: boolean
}

type MultiSeriesChart2ExportButtons =
	| 'auto'
	| 'hidden'
	| {
			/** Show the PNG export button (default: true). */
			png?: boolean
			/** Show the CSV download button (default: true). */
			csv?: boolean
			/** Base filename used by both PNG + CSV exports. */
			filename?: string
			/** Title passed to the PNG export (e.g. watermark/title text). */
			pngTitle?: string
	  }

type MultiSeriesChart2BaseProps = {
	charts?: MultiSeriesChart2SeriesConfig[]
	selectedCharts?: Set<string>
	chartOptions?: {
		[key: string]: {
			[key: string]: Value | Array<Value> | ((params: EChartsFormatterParams) => string | number)
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
	hallmarks?: [number, string][]
	expandTo100Percent?: boolean
	valueSymbol?: string
	alwaysShowTooltip?: boolean
	containerClassName?: string
	stacked?: boolean
	solidChartAreaStyle?: boolean
	hideDataZoom?: boolean
	/**
	 * Called with the ECharts instance after init, and again with `null` on dispose.
	 * Useful when callers want to add custom instance-level behaviors or render their own toolbars.
	 */
	onReady?: (instance: echarts.ECharts | null) => void
	hideDefaultLegend?: boolean
	// Canonical (and only) input shape.
	dataset: MultiSeriesChart2Dataset
	title?: string
}

export type IMultiSeriesChart2Props = MultiSeriesChart2BaseProps & {
	/**
	 * Max number of series rows to render in the tooltip (default: 30).
	 * Set to 0 (or a negative number) to disable the cap (render all rows).
	 *
	 * This helps keep hover/tooltip updates smooth on charts with many series (50+).
	 */
	tooltipMaxItems?: number
	/**
	 * Show a computed total line in the tooltip using the displayed numeric series values.
	 * Useful for stacked-style aggregate views where all series share a unit.
	 */
	showTotalInTooltip?: boolean
	/**
	 * Placement for the total line when `showTotalInTooltip` is enabled.
	 * Defaults to `'bottom'`.
	 */
	tooltipTotalPosition?: 'top' | 'bottom'
	/**
	 * Controls the built-in export toolbar.
	 * - `'auto'` (default): show exports when the chart has series, unless `onReady` is provided.
	 * - `'hidden'`: never show exports.
	 * - object: explicitly control which buttons are shown and export metadata.
	 */
	exportButtons?: MultiSeriesChart2ExportButtons
}

export interface ICandlestickChartProps {
	data: Array<[number, number, number, number, number, number]>
	indicators?: Array<{
		name: string
		category: 'overlay' | 'panel'
		data: Array<[number, number | null]>
		values?: Array<[number, Record<string, number | null>]>
		color?: string
	}>
}

export interface IMultiSeriesChartProps {
	series?: Array<{
		data: Array<[number, number]>
		type: 'line' | 'bar'
		name: string
		color: string
		logo?: string
	}>
	chartOptions?: {
		[key: string]: {
			[key: string]: Value | Array<Value> | ((params: EChartsFormatterParams) => string)
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
	hallmarks?: [number, string][]
	valueSymbol?: string
	yAxisSymbols?: string[]
	alwaysShowTooltip?: boolean
	hideDataZoom?: boolean
	hideDownloadButton?: boolean
	title?: string
	xAxisType?: 'time' | 'category'
	onReady?: (instance: echarts.ECharts | null) => void
}

export interface IPieChartProps {
	title?: string
	chartData: Array<{ name: string; value: number }>
	height?: string
	stackColors?: {
		[stack: string]: string
	}
	valueSymbol?: string
	radius?: [string, string]
	showLegend?: boolean
	toRight?: number
	formatTooltip?: (params: EChartsFormatterParams) => string
	customLabel?: Record<string, Value>
	legendPosition?: {
		left?: string | number
		right?: string | number
		top?: string | number
		bottom?: string | number
		orient?: 'horizontal' | 'vertical'
	}
	legendTextStyle?: { color?: string; fontSize?: number; [key: string]: Value }
	/**
	 * Controls the built-in export toolbar.
	 */
	exportButtons?: MultiSeriesChart2ExportButtons
	onReady?: (instance: echarts.ECharts | null) => void
}

export interface IScatterChartProps {
	chartData: Array<Record<string, string | number | null | undefined>>
	title?: string
	xAxisLabel?: string
	yAxisLabel?: string
	valueSymbol?: string
	height?: string
	tooltipFormatter?: (params: EChartsFormatterParams) => string
	showLabels?: boolean
	entityType?: 'protocol' | 'chain'
}

export interface ISankeyChartProps {
	title?: string
	height?: string
	nodes: Array<{
		name: string
		color?: string
		depth?: number
		description?: string
		displayValue?: number | string // Override the calculated value shown in label
		percentageLabel?: string // Percentage to show next to value, e.g. "(20%)"
	}>
	links: Array<{
		source: string
		target: string
		value: number
		color?: string
	}>
	nodeColors?: {
		[name: string]: string
	}
	valueSymbol?: string
	nodeAlign?: 'left' | 'right' | 'justify'
	orient?: 'horizontal' | 'vertical'
	onReady?: (instance: echarts.ECharts | null) => void
	enableImageExport?: boolean
	imageExportFilename?: string
	imageExportTitle?: string
}
