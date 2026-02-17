/** Raw protocol from the lite/protocols2 API. */
export interface ProtocolLite {
	name: string
	symbol: string
	logo: string
	url: string
	category: string
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
}

/** Full response from lite/protocols2. */
export interface ProtocolsResponse {
	protocols: ProtocolLite[]
	chains: string[]
	parentProtocols: ParentProtocolLite[]
}

export type ExtraTvlChartKey = 'borrowed' | 'staking' | 'pool2'

/** Response from lite/charts (with optional chain). */
export interface ChartResponse {
	tvl?: Array<[string, number]>
	staking?: Array<[string, number]>
	borrowed?: Array<[string, number]>
	pool2?: Array<[string, number]>
	vesting?: Array<[string, number]>
	offers?: Array<[string, number]>
	doublecounted?: Array<[string, number]>
	liquidstaking?: Array<[string, number]>
	dcAndLsOverlap?: Array<[string, number]>
}
