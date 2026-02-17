import type { ILiteProtocol } from '~/containers/ChainOverview/types'

interface ForkLink {
	label: string
	to: string
}

export interface ForkProtocolWithBreakdown extends ILiteProtocol {
	strikeTvl: boolean
}

export interface ForkTableDataRow {
	name: string
	tvl: number
	forkedProtocols: number
	parentTvl: number | null
	ftot: number | null
}

// Chart data types
export type ForkProtocolChartData = Array<[number, number]> // [timestamp, value] tuples
export type ForkBreakdownChartData = Array<{ timestamp: number } & Record<string, number>>

// - /forks page data
export interface ForkOverviewPageData {
	forks: string[]
	forkLinks: Array<ForkLink>
	forkColors: Record<string, string>
	tableData: Array<ForkTableDataRow>
	chartData: ForkBreakdownChartData
}

// - /forks/:fork page data
export interface ForkPageData {
	fork: string
	forkLinks: Array<ForkLink>
	protocolTableData: Array<ForkProtocolWithBreakdown>
	chartData: ForkProtocolChartData
}
