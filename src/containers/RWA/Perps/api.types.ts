export interface IRWAPerpsMarket {
	id: string
	timestamp: number
	coin: string
	venue: string
	openInterest: number
	volume24h: number
	price: number
	priceChange24h: number
	fundingRate: number
	premium: number
	cumulativeFunding: number
	referenceAsset: string
	referenceAssetGroup: string
	assetClass: string
	parentPlatform: string
	pair: string
	marginAsset: string
	settlementAsset: string
	category: string[]
	issuer?: string | null
	website?: string | null
	oracleProvider?: string | null
	description?: string | null
	accessModel?: string
	rwaClassification: string | null
	makerFeeRate: number
	takerFeeRate: number
	deployerFeeShare?: number
	oraclePx: number
	midPx: number
	prevDayPx: number
	maxLeverage: number
	szDecimals: number
	volume7d: number
	volume30d: number
	volumeAllTime: number
	estimatedProtocolFees24h: number
	estimatedProtocolFees7d: number
	estimatedProtocolFees30d: number
	estimatedProtocolFeesAllTime: number
}

export interface IRWAPerpsAggregateHistoricalPoint {
	timestamp: number
	id: string
	coin: string
	venue: string
	referenceAsset: string
	assetClass: string
	category: string[]
	openInterest: number
	volume24h: number
}

export interface IRWAPerpsMarketChartPoint {
	timestamp: number
	openInterest: number
	volume24h: number
	price: number
	priceChange24h: number
	fundingRate: number
	premium: number
	cumulativeFunding: number
}

export interface IRWAPerpsListResponse {
	coins: string[]
	venues: string[]
	categories: string[]
	total: number
}

export interface IRWAPerpsStatsBucket {
	openInterest: number
	volume24h: number
	markets: number
}

export interface IRWAPerpsStatsResponse {
	totalMarkets: number
	totalOpenInterest: number
	totalVolume24h: number
	totalCumulativeFunding: number
	byVenue: Record<string, IRWAPerpsStatsBucket>
	byCategory: Record<string, IRWAPerpsStatsBucket>
	lastUpdated: string
}

export type IRWAPerpsIdMapResponse = Record<string, string>

export interface IRWAPerpsMarketListResponse {
	data: IRWAPerpsMarket[]
	total: number
}

export interface IRWAPerpsFundingHistoryPoint {
	timestamp: number
	id: string
	coin: string
	venue: string
	funding_rate: string
	premium: string
	open_interest: string
	funding_payment: string
	created_at: string
}

export interface IRWAPerpsFundingHistoryResponse {
	id: string
	data: IRWAPerpsFundingHistoryPoint[]
	total: number
}

export interface IRWAPerpsFundingHistoryParams {
	startTime?: number
	endTime?: number
}
