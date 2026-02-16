// Oracle metrics response
export interface IOracleMetrics {
	oracles: Record<string, string[]>
	chainsByOracle: Record<string, string[]>
	oraclesTVS: Record<string, Record<string, Record<string, number>>>
}

// Protocol breakdown chart item with timestamp and dynamic oracle keys
export type IOracleProtocolBreakdownChartItem = {
	timestamp: number
} & Record<string, number>

export type IOracleProtocolBreakdownChart = IOracleProtocolBreakdownChartItem[]

// Chain breakdown chart item with timestamp and dynamic chain keys
export type IOracleChainBreakdownChartItem = {
	timestamp: number
} & Record<string, number>

export type IOracleChainBreakdownChart = IOracleChainBreakdownChartItem[]

// Protocol chart data as tuple of [timestamp, value]
export type IOracleProtocolChart = Array<[number, number]>

// Protocol chain breakdown chart item with timestamp and dynamic chain keys
export type IOracleProtocolChainBreakdownChartItem = {
	timestamp: number
} & Record<string, number>

export type IOracleProtocolChainBreakdownChart = IOracleProtocolChainBreakdownChartItem[]

// Chain protocol breakdown chart item with timestamp and dynamic protocol keys
export type IOracleChainProtocolBreakdownChartItem = {
	timestamp: number
} & Record<string, number>

export type IOracleChainProtocolBreakdownChart = IOracleChainProtocolBreakdownChartItem[]
