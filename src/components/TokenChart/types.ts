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
}

export interface IProtocolMcapTVLChartProps extends IChartProps {
	geckoId?: string | null
}
