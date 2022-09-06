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
	hidedefaultlegend?: boolean
	customLegendName?: string
	customLegendOptions?: Array<string>
	tooltipSort?: boolean
	chartOptions?: {
		[key: string]: {
			[key: string]: Value | Array<Value>
		}
	}
	height?: string
}

export interface IBarChartProps extends Omit<IChartProps, 'stacks'> {
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
}
