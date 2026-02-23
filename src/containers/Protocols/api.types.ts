/** Raw protocol from the lite/protocols2 API. */
export interface ProtocolLite {
	name: string
	slug?: string
	id?: string
	symbol: string
	logo: string
	url: string
	category: string
	tags?: string[]
	referralUrl?: string | null
	chains: string[]
	chainTvls: Record<string, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }>
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	mcap: number | null
	defillamaId: string
	geckoId?: string
	parentProtocol?: string
	listedAt?: number
	deprecated?: boolean
	forkedFrom?: string[]
	oracles?: string[]
	oraclesByChain?: Record<string, string[]>
}

/** Raw parent protocol from the lite/protocols2 API. */
export interface ParentProtocolLite {
	id: string
	name: string
	chains: string[]
	gecko_id?: string
	mcap?: number
	referralUrl?: string | null
	logo?: string
}

/** Full response from lite/protocols2. */
export interface ProtocolsResponse {
	protocols: ProtocolLite[]
	chains: string[]
	parentProtocols: ParentProtocolLite[]
	protocolCategories?: string[]
}
