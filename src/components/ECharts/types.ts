import * as React from 'react'

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
			[key: string]: string | number | boolean
		}
	}
	height?: string
}

export interface IBarChartProps extends Omit<IChartProps, 'stacks'> {
	stacks?: {
		[stack: string]: string
	}
	barWidths?: {
		[stack: string]: number
	}
}
