export interface ChartSeries {
	name: string
	data: [number, number][]
	color?: string
}

export interface ProtocolSplitData {
	series: ChartSeries[]
	metadata: {
		chain: string
		chains: string[]
		categories: string[]
		metric: string
		topN: number
		totalProtocols: number
		othersCount: number
		marketSector: string | null
		error?: string
	}
}

export interface ProtocolChainData {
	series: ChartSeries[]
	metadata: {
		protocol: string
		metric: string
		chains: string[]
		totalChains: number
		topN?: number
		othersCount?: number
	}
}
