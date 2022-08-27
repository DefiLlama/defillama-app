import * as React from 'react'

export interface IChartProps {
	chartData: any
	tokensUnique?: string[]
	moneySymbol?: string
	title: string
	color?: string
	hallmarks?: [number, string][]
	hideLegend?: boolean
	style?: React.CSSProperties
	legendName?: string
}
