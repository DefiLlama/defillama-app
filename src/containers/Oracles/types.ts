import type { ILiteProtocol } from '~/containers/ChainOverview/types'

export type OracleProtocolsCount = Record<string, number>
export type OracleBreakdownItem = { timestamp: number } & Record<string, number>
export type OracleChartData = Array<[number, Record<string, Record<string, number>>]>
export type OracleOverviewChartDataPoint = { timestamp: number } & Record<string, number>
export type OracleOverviewChartData = Array<OracleOverviewChartDataPoint>

export interface OracleProtocolWithBreakdown extends ILiteProtocol {
	tvl: number
	extraTvl: Record<string, { tvl: number }>
}

export interface OracleLink {
	label: string
	to: string
}

export interface OraclePageData {
	chain: string | null
	chainChartData: OracleOverviewChartData | null
	chainsByOracle: Record<string, Array<string>>
	oracles: Array<string>
	oracleLinks: Array<OracleLink>
	oracle: string | null
	oracleProtocolsCount: OracleProtocolsCount
	filteredProtocols: Array<OracleProtocolWithBreakdown>
	chartData: OracleOverviewChartData
	oraclesColors: Record<string, string>
}

export interface OracleChainPageData {
	chain: string | null
	chainsByOracle: Record<string, Array<string>>
	oracles: Array<string>
	oracleLinks: Array<OracleLink>
	oracleProtocolsCount: OracleProtocolsCount
	chartData: OracleChartData
	oraclesColors: Record<string, string>
}
