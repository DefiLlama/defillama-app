import { IChainAssets } from '~/containers/ChainOverview/types'

export interface IForksRow {
	name: string
	forkedProtocols: number
	tvl: number
	ftot: number
}

export interface IChain {
	name: string
	protocols: number
	change1d: number
	change7d: number
	change1m: number
	tvl: number
	mcaptvl: number
}

export interface IChainsRow extends IChain {
	subRows?: Array<IChain>
	chainAssets?: IChainAssets
}

export interface ILSDRow {
	name: string
	stakedEth: number
	tvl: number
	marketShare: number
	ethPeg: number
	pegInfo: string
	marketRate: number
	expectedRate: number
	logo: string
	mcap: number
}

export interface IEmission {
	name: string
	maxSupply: number
	circSupply: number
	totalLocked: number
	nextEvent: { data: string; toUnlock: number }
	token: string
	tokenPrice: { coins: { [key: string]: { price: number; symbol: string } } }
	tPrice?: number | null
	tSymbol?: string | null
	mcap: number | null
	unlocksPerDay: number | null
	historicalPrice?: [string, number][]
	lastEvent?: Array<{
		description: string
		noOfTokens: number[]
		timestamp: number
	}>
	upcomingEvent: Array<{
		description: string
		noOfTokens: number[]
		timestamp: number
	}>
}

export interface IGovernance {
	name: string
	proposalsCount: string
	followersCount: string
	strategyCount: string
	states: {
		active?: number
		closed?: number
	}
	months: {
		[month: string]: { proposals: Array<string>; states: { active?: number; closed?: number } }
	}
	propsalsInLast30Days: number
	successfulPropsalsInLast30Days: number
}

export interface AirdropRow {
	name: string
	page: string
	twitter: string
	explorer: string
	tokens: string
}
