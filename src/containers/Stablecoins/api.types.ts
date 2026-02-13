export interface StablecoinsListResponse {
	peggedAssets: StablecoinListAsset[]
	chains: StablecoinListChain[]
}

export interface StablecoinListAsset {
	id: string
	name: string
	symbol: string
	gecko_id: string | null
	chains: string[]
	pegType: string
	pegMechanism: string
	priceSource: string | null
	price: number | string | null
	circulating: Record<string, number>
	circulatingPrevDay: Record<string, number>
	circulatingPrevWeek: Record<string, number>
	circulatingPrevMonth: Record<string, number>
	chainCirculating: Record<
		string,
		{
			current: Record<string, number>
			circulatingPrevDay: Record<string, number>
			circulatingPrevWeek: Record<string, number>
			circulatingPrevMonth: Record<string, number>
		}
	>
	deprecated?: boolean
	yieldBearing?: boolean
}

interface StablecoinListChain {
	gecko_id: string
	tokenSymbol: string
	name: string
	totalCirculatingUSD: Record<string, number>
}

export interface StablecoinDetailResponse {
	id: string
	name: string
	address: string | null
	symbol: string
	url: string
	description: string
	mintRedeemDescription: string
	onCoinGecko: string
	gecko_id: string | null
	cmcId: string | null
	pegType: string
	pegMechanism: string
	priceSource: string
	auditLinks: string[] | null
	twitter: string
	wiki: string | null
	price: number | null
	module?: string
	deprecated?: boolean
	delisted?: boolean
	yieldBearing?: boolean
	doublecounted?: boolean
	deadFrom?: string
	tokens: StablecoinDetailToken[]
	chainBalances: Record<string, { tokens: StablecoinChainBalanceToken[] }>
	currentChainBalances: Record<string, Record<string, number>>
}

interface StablecoinDetailToken {
	date: number
	circulating?: Record<string, number>
	unreleased?: Record<string, number>
	minted?: Record<string, number> | number
	bridgedTo?: Record<string, number> | number
}

interface StablecoinChainBalanceToken {
	date: number
	circulating?: Record<string, number>
	unreleased?: Record<string, number>
	minted?: StablecoinChainBalanceAmount
	bridgedTo?: StablecoinChainBalanceAmount
}

type StablecoinChainBalanceAmount = Record<string, number | StablecoinBridgeBreakdown>

type StablecoinBridgeBreakdown = Record<string, StablecoinBridgeValue>

type StablecoinBridgeValue =
	| number
	| { amount: number; source: string }
	| { amount?: never; source: string }
	| Record<string, { amount: number }>

export interface StablecoinChartResponse {
	aggregated?: StablecoinChartPoint[]
	breakdown?: Record<string, StablecoinChartPoint[]>
	doublecountedIds?: string[]
}

export interface StablecoinChartPoint {
	date: string
	totalCirculatingUSD?: Record<string, number>
	totalCirculating?: Record<string, number>
	totalUnreleased?: Record<string, number>
	totalBridgedToUSD?: Record<string, number>
	totalMintedUSD?: Record<string, number>
}

export interface StablecoinDominanceResponse {
	dominanceMap: Record<string, StablecoinDominanceEntry[]>
	chainChartMap: Record<string, StablecoinDominanceChartPoint[]>
}

interface StablecoinDominanceEntry {
	date: string
	totalCirculatingUSD: Record<string, number>
	greatestMcap?: {
		gecko_id: string
		symbol: string
		mcap: number
	}
}

interface StablecoinDominanceChartPoint {
	date: string
	totalCirculatingUSD?: Record<string, number>
	totalCirculating?: Record<string, number>
	totalUnreleased?: Record<string, number>
	totalBridgedToUSD?: Record<string, number>
	totalMintedUSD?: Record<string, number>
}

export type StablecoinRecentCoinsDataResponse = Record<string, StablecoinRecentCoinDataPoint[]>

interface StablecoinRecentCoinDataPoint {
	date: string
	totalCirculatingUSD?: Record<string, number>
	totalCirculating?: Record<string, number>
	totalUnreleased?: Record<string, number>
	totalBridgedToUSD?: Record<string, number>
	totalMintedUSD?: Record<string, number>
}

export type StablecoinPricesResponse = StablecoinPriceSnapshot[]

interface StablecoinPriceSnapshot {
	date: number
	prices?: Record<string, string | number>
}

export type StablecoinRatesResponse = StablecoinRateSnapshot[]

interface StablecoinRateSnapshot {
	date: number
	rates?: Record<string, number>
}

export type StablecoinConfigResponse = Record<string, string>

export type StablecoinBridgeInfoResponse = Record<string, StablecoinBridgeInfo>

interface StablecoinBridgeInfo {
	name: string
	link?: string
}
