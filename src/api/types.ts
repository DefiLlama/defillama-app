import { IJSON } from "./categories/adaptors/types"

export interface IRaise {
	round: string
	amount: number
	valuation: string
	source: string
	date: number
}

export interface Protocol {
	id: string
	name: string
	address?: string | null
	symbol: string
	url: string
	description?: string | null
	chain: string
	logo: string | null
	audits?: string | null
	audit_note?: string | null
	gecko_id?: string | null
	cmcId?: string | null
	category?: string | null
	chains: Array<string>
	oracles?: Array<string>
	forkedFrom?: Array<string>
	module: string
	twitter?: string | null
	language?: string
	audit_links?: Array<string>
	listedAt?: number
	openSource?: boolean
	parentProtocol?: string
	referralUrl?: string
	isParentProtocol?: boolean
	raises?: Array<IRaise>
	defillamaId?: number
}

// TODO cleanup
export interface IParentProtocol {
	id: string
	name: string
	url: string
	description: string
	logo: string
	chains: Array<string>
	gecko_id: string
	cmcId: string
	categories?: Array<string>
	twitter?: string | null
	oracles?: Array<string>
	forkedFrom?: Array<string>
}

interface ICurrentChainTvls {
	[chain: string]: number
}

export interface IChainTvl {
	[type: string]: {
		tvl: { date: number; totalLiquidityUSD: number }[]
		tokensInUsd?: Array<{ date: number; tokens: { [token: string]: number } }>
		tokens?: Array<{ date: number; tokens: { [token: string]: number } }>
	}
}

interface ITvlsWithChangesByChain {
	[key: string]: {
		tvl: number | null
		tvlPrevDay: number | null
		tvlPrevWeek: number | null
		tvlPrevMonth: number | null
	}
}

export interface ITvlsByChain {
	[chain: string]: number
}

export interface ProtocolTvls {
	tvl: number | null
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
	chainTvls: ITvlsWithChangesByChain
}

export interface IProtocolResponse extends Protocol {
	otherProtocols?: Array<string>
	methodology?: string
	misrepresentedTokens?: boolean
	hallmarks?: [number, string][]
	chainTvls: IChainTvl
	currentChainTvls: ICurrentChainTvls
	tvl: { date: number; totalLiquidityUSD: number }[]
	metrics?: IJSON<boolean>
}

export interface IProtocol extends Omit<IProtocolResponse, 'tvl' | 'currentChainTvls' | 'chainTvls'> {
	slug: string
	tvl: number
	chain: string
	chainTvls: ITvlsByChain
	change_1h: number | null
	change_1d: number | null
	change_7d: number | null
	mcap?: number
	fdv?: number
	staking?: number
	pool2?: number
}

export type LiteProtocol = Pick<
	IProtocol,
	| 'category'
	| 'chains'
	| 'oracles'
	| 'forkedFrom'
	| 'listedAt'
	| 'mcap'
	| 'name'
	| 'symbol'
	| 'logo'
	| 'url'
	| 'parentProtocol'
	| 'chainTvls'
	| 'referralUrl'
	| 'defillamaId'
> &
	ProtocolTvls

export interface IChain {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	mcap: number
	name: string
	protocols: number
	mcaptvl: number
	gecko_id?: string | null
	tokenSymbol?: string | null
	cmcId?: string | null
	chainId: number | null
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

export interface IFormattedProtocol extends LiteProtocol {
	extraTvl?: {
		[key: string]: { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
	}
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcaptvl: number | null
	strikeTvl?: boolean
}

export interface IFusedProtocolData extends Omit<IProtocolResponse, 'tvl'> {
	tvlBreakdowns: ICurrentChainTvls
	tvlByChain: [string, number][]
	historicalChainTvls: IChainTvl
}

export interface ICategory {
	label: string
	to: string
}

export type TCompressedChain = [string, { [chain: string]: { [dataType: string]: number } }]

export interface IResponseCGMarketsAPI {
	ath: number
	ath_change_percentage: number
	ath_date: string
	atl: number
	atl_change_percentage: number
	atl_date: string
	circulating_supply: number
	current_price: number
	fully_diluted_valuation: number
	high_24h: number
	id: string
	image: string
	last_updated: string
	low_24h: number
	market_cap: number
	market_cap_change_24h: number
	market_cap_change_percentage_24h: number
	market_cap_rank: number
	max_supply: number
	name: string
	price_change_24h: number
	price_change_percentage_24h: number
	roi: null
	symbol: string
	total_supply: number
	total_volume: number
}
