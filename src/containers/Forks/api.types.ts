// Fork metrics response - Record of fork names to arrays of protocol names that forked from them
export interface IForkMetrics {
	[forkName: string]: string[]
}

// Protocol breakdown chart item with timestamp and dynamic fork keys
interface IForkProtocolBreakdownChartItem {
	timestamp: number
	[key: string]: number
}

export type IForkProtocolBreakdownChart = IForkProtocolBreakdownChartItem[]

// Protocol chart data as tuple of [timestamp, value]
export type IForkProtocolChart = Array<[number, number]>
