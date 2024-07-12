import { ChainAssets } from '~/hooks/data/defi'

export interface IOraclesRow {
	name: string
	protocolsSecured: number
	tvs: number
}

export interface IForksRow {
	name: string
	forkedProtocols: number
	tvl: number
	ftot: number
}

export interface ICategoryRow {
	name: string
	protocols: number
	tvl: number
	description: string
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
	chainAssets?: ChainAssets
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

export interface IETFRow {
	ticker: string
	issuer: string
	etf_name: string
	custodian: string
	pct_fee: number
	url: string
	price: number
	volume: number
	aum: number
	shares: number
	btc: number
	flows: number
}

export interface AirdropRow {
	name: string
	page: string
	twitter: string
	explorer: string
	tokens: string
}

export interface IBridgedRow {
	name: string
	total: ChainAssets['total']
	thirdParty: ChainAssets['thirdParty']
	canonical: ChainAssets['canonical']
	ownTokens: ChainAssets['ownTokens']
	change_24h: number
}

export interface CategoryReturnsRow {
	id: string
	name: string
	mcap: number
	returns1W: number
	returns1M: number
	returns1Y: number
	nbCoins: number
}

export interface CoinReturnsRow {
	id: string
	mcap: number
	returns1D: number
	returns1W: number
	returns1M: number
	returns1Y: number
}
