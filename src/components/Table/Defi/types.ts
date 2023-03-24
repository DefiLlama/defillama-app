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
}
