/** A processed LST token row for the table */
export interface ILSTTokenRow {
	name: string
	logo: string
	mcap: number | null
	stakedEth: number
	stakedEthInUsd: number
	stakedEthPctChange7d: number | null
	stakedEthPctChange30d: number | null
	marketShare: number
	lsdSymbol: string | null
	ethPeg: number | null
	pegInfo: string | null
	marketRate: number | null
	expectedRate: number | null
	mcapOverTvl: string | null
	apy: number | null
	fee: number | null
}

/** Inflows chart data: timestamp -> { [protocol]: delta } */
export type InflowsChartData = Record<number, Record<string, number>>

/** Props for the LSTOverview component */
export interface LSTOverviewProps {
	areaChartData: Array<Record<string, number>>
	pieChartData: Array<{ name: string; value: number }>
	tokensList: ILSTTokenRow[]
	tokens: string[]
	stakedEthSum: number
	stakedEthInUsdSum: number
	lsdColors: Record<string, string>
	inflowsChartData: InflowsChartData
	barChartStacks: Record<string, string>
}
