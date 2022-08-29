import * as React from 'react'

export interface IChartProps {
	chartData: any
	stacks?: Array<string>
	valueSymbol?: string
	title: string
	color?: string
	hallmarks?: [number, string][]
	style?: React.CSSProperties
	hideLegend?: boolean
	customLegendName?: string
	tooltipSort?: boolean
	chartOptions?: {
		[key: string]: {
			[key: string]: string | number | boolean
		}
	}
}

export interface IBarChartProps extends Omit<IChartProps, 'stacks'> {
	stacks?: {
		[stack: string]: string
	}
}
