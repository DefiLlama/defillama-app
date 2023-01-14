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
}
