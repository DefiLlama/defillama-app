import * as React from 'react'
import * as echarts from 'echarts/core'

type Value = string | number | boolean

export interface IChartProps {
	chartData: any
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
			[key: string]: Value | Array<Value> | ((params: any) => string) | Record<string, Value>
		}
	}
	height?: string
	stackColors?: {
		[stack: string]: string
	}
	expandTo100Percent?: boolean
	isStackedChart?: boolean
	hideGradient?: boolean
	unlockTokenSymbol?: string
	isThemeDark?: boolean
	groupBy?: 'daily' | 'weekly' | 'monthly'
	customYAxis?: Array<string>
	hideOthersInTooltip?: boolean
	hideDataZoom?: boolean
	hideDownloadButton?: boolean
	containerClassName?: string
	connectNulls?: boolean
	alwaysShowTooltip?: boolean
	onReady?: (instance: echarts.ECharts | null) => void
	customComponents?: React.ReactNode
	enableImageExport?: boolean
	imageExportFilename?: string
	imageExportTitle?: string
}

export interface ISingleSeriesChartProps
	extends Omit<
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
	customComponents?: React.ReactNode
}

export interface ILineAndBarChartProps {
	charts?: {
		[stack: string]: {
			data: Array<[number, number]>
			type: 'line' | 'bar'
			name: string
			stack: string
			color?: string
			yAxisIndex?: number
		}
	}
	chartOptions?: {
		[key: string]: {
			[key: string]: Value | Array<Value> | ((params: any) => string | number)
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly'
	hallmarks?: [number, string][]
	expandTo100Percent?: boolean
	valueSymbol?: string
	alwaysShowTooltip?: boolean
	containerClassName?: string
	solidChartAreaStyle?: boolean
	hideDataZoom?: boolean
	onReady?: (instance: echarts.ECharts | null) => void
	hideDefaultLegend?: boolean
	enableImageExport?: boolean
	imageExportFilename?: string
	imageExportTitle?: string
	title?: string
}

export interface IMultiSeriesChart2Props {
	charts?: Array<{
		type: 'line' | 'bar'
		name: string
		stack: string
		encode: {
			x: number | Array<number>
			y: number | Array<number>
		}
		color?: string
		yAxisIndex?: number
	}>
	selectedCharts?: Set<string>
	data: Array<[number, ...(number | null)[]]>
	chartOptions?: {
		[key: string]: {
			[key: string]: Value | Array<Value> | ((params: any) => string | number)
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly'
	hallmarks?: [number, string][]
	expandTo100Percent?: boolean
	valueSymbol?: string
	alwaysShowTooltip?: boolean
	containerClassName?: string
	solidChartAreaStyle?: boolean
	hideDataZoom?: boolean
	onReady?: (instance: echarts.ECharts | null) => void
	hideDefaultLegend?: boolean
}

export interface ICandlestickChartProps {
	data: Array<[number, number, number, number, number, number]>
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
			[key: string]: Value | Array<Value> | ((params: any) => string)
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly'
	hallmarks?: [number, string][]
	valueSymbol?: string
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
	formatTooltip?: (params: any) => string
	customLabel?: Record<string, any>
	legendPosition?: {
		left?: string | number
		right?: string | number
		top?: string | number
		bottom?: string | number
		orient?: 'horizontal' | 'vertical'
	}
	legendTextStyle?: { color?: string; fontSize?: number; [key: string]: any }
	customComponents?: React.ReactNode
	enableImageExport?: boolean
	imageExportFilename?: string
	imageExportTitle?: string
}

export interface IScatterChartProps {
	chartData: any
	title?: string
	xAxisLabel?: string
	yAxisLabel?: string
	valueSymbol?: string
	height?: string
	tooltipFormatter?: (params: any) => string
}
