import * as React from 'react'

export interface IChartProps {
	chartData: any
	stacks?: Array<string>
	moneySymbol?: string
	title: string
	color?: string
	hallmarks?: [number, string][]
	style?: React.CSSProperties
	hideLegend?: boolean
	customLegendName?: string
	tooltipSort?: boolean
}

export interface IBarChartProps extends Omit<IChartProps, 'stacks'> {
	stacks?: {
		[stack: string]: string
	}
}
