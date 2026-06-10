export interface YieldFetchOptions {
	timeout?: number
}

export interface RawYieldPool {
	pool: string
	chain: string
	project: string
	symbol: string
	tvlUsd: number
	apy: number
	apyBase: number | null
	apyReward: number | null
	rewardTokens?: string[] | null
	underlyingTokens?: string[] | null
	stablecoin?: boolean
	exposure?: string
	ilRisk?: string
	outlier?: boolean
	predictions?: {
		predictedClass?: string
		binnedConfidence?: number
	}
	mu?: number
	sigma?: number
	count?: number
	il7d?: number | null
	apyBase7d?: number | null
	apyPct1D?: number | null
	apyPct7D?: number | null
	apyMean30d?: number | null
	volumeUsd1d?: number | null
	volumeUsd7d?: number | null
	apyBaseInception?: number | null
	poolMeta?: string | null
}

export interface YieldPoolsResponse {
	data: RawYieldPool[]
}

export interface YieldConfigProtocol {
	name?: string
	symbol?: string | null
	audits?: string | null
	category?: string | null
}

export type YieldConfigResponse = { protocols?: Record<string, YieldConfigProtocol> } | null

export type YieldUrlsResponse = Record<string, string>

export interface YieldChainResponse {
	name: string
	tokenSymbol?: string
	chainId: number | null
}

export type YieldChainsResponse = YieldChainResponse[]

export interface RawYieldMedianPoint {
	timestamp: string
	medianAPY: number
	[key: string]: unknown
}

export type YieldMedianResponse = RawYieldMedianPoint[]

export interface RawYieldLendBorrowPool {
	pool: string
	apyBaseBorrow: number | null
	apyRewardBorrow: number | null
	totalSupplyUsd: number | null
	totalBorrowUsd: number | null
	ltv: number
	borrowable?: boolean
	mintedCoin?: string | null
	borrowFactor?: number | null
	debtCeilingUsd?: number | null
	rewardTokens?: string[] | null
	underlyingTokens?: string[] | null
}

export type YieldLendBorrowResponse = RawYieldLendBorrowPool[]

export interface RawYieldPerpMarket {
	baseAsset: string
	symbol?: string
	market: string
	marketplace: string
	fundingRate: number
	fundingRatePrevious: number
	fundingRate7dAverage: number
	fundingRate7dSum: number
	fundingRate30dAverage: number
	fundingRate30dSum: number
	openInterest: number | string
	indexPrice: number
}

export interface YieldPerpMarket extends RawYieldPerpMarket {
	symbol: string
}

export interface YieldPerpsResponse {
	data: RawYieldPerpMarket[]
}

export interface YieldTokenCategory {
	addresses: string[]
	symbols: string[]
	label: string
	filterKey: string
}

export type YieldTokenCategoriesResponse = Record<string, YieldTokenCategory>

export type YieldVolatilityResponse = Record<string, [number | null, number | null, number | null, number | null]>

export interface YieldHolderStatsEntry {
	holderCount?: number | null
	avgPositionUsd?: number | string | null
	top10Pct?: number | string | null
	top10Holders?: {
		holders?: Array<unknown> | null
		decimals?: number | null
	}
	holderChange7d?: number | null
	holderChange30d?: number | null
}

export interface YieldHolderStatsResponse {
	data?: Record<string, YieldHolderStatsEntry>
}
