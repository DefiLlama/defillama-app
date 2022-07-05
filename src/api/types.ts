export interface IProtocol {
	name: string
	symbol: string
	chains: string[]
	chainTvls: {
		[key: string]: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
	}
	tvl: {
		date: number
		totalLiquidityUSD: number
	}[]
}

export interface IOracleProtocols {
	[key: string]: number
}

export interface IStackedDataset {
	[key: number]: {
		[key: string]: {
			[key: string]: number
		}
	}
}

export interface IChainData {
	[key: string]: [number, number][]
}

export interface IChainGeckoId {
	geckoId: string
	symbol: string
	cmcId: string
	categories: string[]
}
