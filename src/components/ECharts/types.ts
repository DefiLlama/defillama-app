import * as React from 'react'

type Value = string | number | boolean

export interface IChartProps {
	chartData: any
	stacks?: Array<string>
	valueSymbol?: string
	title: string
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
			[key: string]: Value | Array<Value>
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
	isMonthly?: boolean
	customYAxis?: Array<string>
	hideOthersInTooltip?: boolean
}

export interface IBarChartProps extends Omit<IChartProps, 'stacks' | 'expandTo100Percent'> {
	stacks?: {
		[stack: string]: string
	}
	seriesConfig?: {
		[stack: string]: {
			[option: string]: Value | Array<Value>
		}
	}
	barWidths?: {
		[stack: string]: number
	}
	gradientBars?: boolean
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
	formatTooltip?: (params: any) => string
	customLabel?: Record<string, any>
}
