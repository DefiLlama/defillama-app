import * as React from 'react'

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
			[key: string]: Value | Array<Value> | ((params: any) => string)
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
}

export interface IBarChartProps extends Omit<IChartProps, 'stacks' | 'expandTo100Percent'> {
	stacks?: {
		[stack: string]: string
	}
}

export interface ILineAndBarChartProps {
	charts?: {
		[stack: string]: {
			data: Array<[number, number]>
			type: 'line' | 'bar'
			name: string
			stack: string
			color?: string
		}
	}
	chartOptions?: {
		[key: string]: {
			[key: string]: Value | Array<Value> | ((params: any) => string)
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
}

export interface IPieChartProps {
	title?: string
	chartData: Array<{ name: string; value: number }>
	height?: string
	stackColors?: {
		[stack: string]: string
	}
	usdFormat?: boolean
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
}
