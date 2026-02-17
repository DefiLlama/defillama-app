import type { ILiteProtocol } from '~/containers/ChainOverview/types'

export type OracleProtocolsCount = Record<string, number>
export type OracleBreakdownItem = { timestamp: number } & Record<string, number>
export type OracleChartData = Array<OracleBreakdownItem>
export type OracleOverviewChartDataPoint = { timestamp: number } & Record<string, number>
export type OracleOverviewChartData = Array<OracleOverviewChartDataPoint>

export interface OracleProtocolWithBreakdown extends ILiteProtocol {
	tvl: number
	extraTvl: Record<string, number>
	strikeTvl: boolean
}

export interface OracleLink {
	label: string
	to: string
}

export interface OracleTableDataRow {
	name: string
	tvl: number
	extraTvl: Record<string, number>
	protocolsSecured: number
	chains: Array<string>
}

export interface OracleOverviewPageData {
	chain: string | null
	chainLinks: Array<OracleLink>
	oracle: string | null
	tvl: number
	extraTvl: Record<string, number>
	protocolTableData: Array<OracleProtocolWithBreakdown>
	chartData: OracleOverviewChartData
}

export interface OraclesByChainPageData {
	chain: string | null
	oracles: Array<string>
	chainLinks: Array<OracleLink>
	tableData: Array<OracleTableDataRow>
	chartData: OracleChartData
	oraclesColors: Record<string, string>
}
