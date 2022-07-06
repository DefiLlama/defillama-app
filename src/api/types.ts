export interface IProtocol {
	id: string
	name: string
	address: string
	symbol: string
	url: string
	description: string
	chain: string
	logo: null | string
	audits: null | '0' | '1' | '2' | '3'
	audit_note: null
	gecko_id: string
	cmcId: string
	category: string
	chains: string[]
	oracles: string[]
	forkedFrom?: string[]
	module: string
	twitter: string
	language?: string
	audit_links?: string[]
	listedAt?: number
	openSource?: boolean
	parentProtocol?: string
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
	mcap?: number
}

export interface IParentProtocol {
	id: string
	name: string
	url: string
	description: string
	logo: string
	chains: string[]
	gecko_id: string
	cmcId: string
	categories?: string[]
	twitter: string
	oracles?: string[]
	forkedFrom?: string[]
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

export interface IFormattedProtocol {
	name: string
	symbol: string
	logo: string
	chains: string[]
}
