export interface IChartProps {
	chartData: any
	tokensUnique?: string[]
	moneySymbol?: string
	title: string
	color?: string
	hallmarks?: [number, string][]
}

export interface IProtocolMcapTVLChartProps extends IChartProps {
	geckoId: string
}
