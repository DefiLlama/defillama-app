export interface IRWAPerpsMarket {
	id: string
	timestamp: number
	contract: string
	venue: string
	openInterest: number
	openInterestChange24h?: number | null
	volume24h: number
	volume24hChange24h?: number | null
	price: number
	priceChange24h: number | null
	fundingRate: number
	premium: number
	cumulativeFunding: number
	referenceAsset: string | null
	referenceAssetGroup: string | null
	assetClass: string[] | null
	parentPlatform: string | null
	pair: string | null
	marginAsset: string | null
	settlementAsset: string | null
	category: string[] | null
	issuer: string | null
	website: string[] | null
	oracleProvider: string | null
	description: string | null
	accessModel: string | null
	rwaClassification: string | null
	makerFeeRate: number
	takerFeeRate: number
	deployerFeeShare: number
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
	contract: string
	venue: string
	referenceAsset: string | null
	referenceAssetGroup: string | null
	assetClass: string[] | null
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
	contracts: string[]
	venues: string[]
	categories: string[]
	assetGroups: string[]
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
	byAssetGroup: Record<string, IRWAPerpsStatsBucket>
	lastUpdated: string
}

export type IRWAPerpsBreakdownChartRow = { timestamp: number } & Record<string, number>
export type IRWAPerpsBreakdownChartResponse = IRWAPerpsBreakdownChartRow[]

export type IRWAPerpsIdMapResponse = Record<string, string>

export interface IRWAPerpsFundingHistoryPoint {
	timestamp: number
	id: string
	contract: string
	venue: string
	funding_rate: string
	premium: string
	open_interest: string
	funding_payment: string
	created_at: string
}

export interface IRWAPerpsFundingHistoryParams {
	startTime?: number
	endTime?: number
}
