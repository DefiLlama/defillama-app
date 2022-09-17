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
