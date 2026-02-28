export interface IChainTvl {
	[type: string]: {
		tvl: { date: number; totalLiquidityUSD: number }[]
		tokensInUsd?: Array<{ date: number; tokens: { [token: string]: number } }>
		tokens?: Array<{ date: number; tokens: { [token: string]: number } }>
	}
}

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
	image2: string
}

export type ChainGeckoPair = [chain: string, geckoId: string]

export interface LlamaConfigResponse {
	chainCoingeckoIds: Record<string, LlamaChainConfig>
}

export interface LlamaChainConfig {
	geckoId?: string
	symbol?: string
	stablecoins?: string[]
	parent?: {
		chain: string
		types: string[]
	}
	[key: string]: unknown
}

export interface CoinMcapEntry {
	mcap?: number | null
	timestamp?: number
}

export type CoinMcapsResponse = Record<string, CoinMcapEntry>

export interface PriceObject {
	confidence: number
	decimals?: number
	price: number
	symbol: string
	timestamp: number
}

export interface CoinsPricesResponse {
	coins?: Record<string, PriceObject | undefined>
}

export interface CoinChartPricePoint {
	timestamp?: number
	price?: number
}

export interface CoinChartEntry {
	prices?: CoinChartPricePoint[]
}

export interface CoinsChartResponse {
	coins?: Record<string, CoinChartEntry | undefined>
}

export interface CgMarketChartResponse {
	prices?: Array<[number, number]>
	market_caps?: Array<[number, number]>
	total_volumes?: Array<[number, number]>
}

export interface CgChartResponse {
	data?: {
		coinData?: {
			symbol?: string
			market_data?: {
				ath?: { usd?: number | null }
				ath_date?: { usd?: string | null }
				atl?: { usd?: number | null }
				atl_date?: { usd?: string | null }
				market_cap?: { usd?: number | null }
				total_supply?: number | null
				fully_diluted_valuation?: { usd?: number | null }
				total_volume?: { usd?: number | null }
				circulating_supply?: number
				max_supply?: number
				max_supply_infinite?: boolean
			}
			tickers?: Array<{
				trust_score?: string
				market?: { identifier?: string }
				converted_volume?: { usd?: number | null }
			}>
		}
		prices?: Array<[number, number]>
		mcaps?: Array<[number, number]>
		volumes?: Array<[number, number]>
	}
}

export interface GeckoIdResponse {
	id: string
}

export interface DenominationPriceHistory {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

export interface CgMarketsQueryParams {
	vsCurrency?: string
	order?: string
	perPage?: number
	page: number
}

export interface TwitterPostsResponse {
	data?: unknown[]
	[key: string]: unknown
}

export interface ProtocolLiquidityToken {
	id: string
	symbol?: string
	tokenPools?: Array<{ project: string; chain: string; tvlUsd: number }>
	[key: string]: unknown
}

export type ProtocolTokenLiquidityChart = Array<[string | number, number]>
