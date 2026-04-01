import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import type { IRWAPerpsAggregateHistoricalPoint, IRWAPerpsMarket, IRWAPerpsMarketChartPoint } from './api.types'

interface IRWAPerpsNavLink {
	label: string
	to: string
}

interface IRWAPerpsCoinInfo {
	coin: string
	displayName: string
	venue: string
	referenceAsset: string | null
	referenceAssetGroup: string | null
	assetClass: string | null
	rwaClassification: string | null
	accessModel: string | null
	parentPlatform: string | null
	issuer: string | null
	website: string | null
	oracleProvider: string | null
	description: string | null
	categories: string[]
}

export interface IRWAPerpsCoinFundingHistoryPoint {
	timestamp: number
	fundingRate: number
	premium: number
	openInterest: number
	fundingPayment: number
}

export type IRWAPerpsCoinMarketChartPoint = IRWAPerpsMarketChartPoint

export interface IRWAPerpsCoinData {
	coin: IRWAPerpsCoinInfo
	market: IRWAPerpsMarket
	marketChart: IRWAPerpsCoinMarketChartPoint[] | null
	fundingHistory: IRWAPerpsCoinFundingHistoryPoint[] | null
}

export type IRWAPerpsTimeSeriesRow = IRWAPerpsMarket | IRWAPerpsAggregateHistoricalPoint

export type RWAPerpsChartMetricKey = 'openInterest' | 'volume24h' | 'markets'
export type RWAPerpsChartView = 'timeSeries' | 'pie' | 'treemap' | 'hbar'
export type RWAPerpsTreemapNestedBy = 'none' | 'venue' | 'assetClass' | 'referenceAsset' | 'coin'

export type RWAPerpsOverviewBreakdown = 'venue' | 'assetClass' | 'referenceAsset' | 'coin'
export type RWAPerpsOverviewTimeSeriesBreakdown = 'venue' | 'assetClass' | 'referenceAsset' | 'coin'
export type RWAPerpsOverviewNonTimeSeriesBreakdown = 'venue' | 'assetClass' | 'referenceAsset' | 'coin'
export type RWAPerpsOverviewTreemapBreakdown = 'venue' | 'assetClass' | 'referenceAsset' | 'coin'
export type RWAPerpsVenueBreakdown = 'referenceAsset' | 'coin' | 'assetClass'
export type RWAPerpsVenueTimeSeriesBreakdown = 'referenceAsset' | 'coin' | 'assetClass'
export type RWAPerpsVenueNonTimeSeriesBreakdown = 'referenceAsset' | 'coin' | 'assetClass'
export type RWAPerpsVenueTreemapBreakdown = 'assetClass' | 'referenceAsset' | 'coin'
export type RWAPerpsChartMode = 'overview' | 'venue'

export interface IRWAPerpsOverviewBreakdownRequest {
	breakdown: RWAPerpsOverviewBreakdown
	key: RWAPerpsChartMetricKey
}

export interface IRWAPerpsVenueBreakdownRequest {
	venue: string
	breakdown: RWAPerpsVenueBreakdown
	key: RWAPerpsChartMetricKey
}

export interface IRWAPerpsOverviewPageData {
	markets: IRWAPerpsMarket[]
	initialChartDataset: MultiSeriesChart2Dataset
	totals: {
		openInterest: number
		volume24h: number
		markets: number
		cumulativeFunding: number
	}
}

export interface IRWAPerpsVenuePageData {
	venue: string
	markets: IRWAPerpsMarket[]
	initialChartDataset: MultiSeriesChart2Dataset
	venueLinks: IRWAPerpsNavLink[]
	totals: {
		openInterest: number
		volume24h: number
		markets: number
		protocolFees24h: number
	}
}

export interface IRWAPerpsVenuesOverviewRow {
	venue: string
	openInterest: number
	openInterestShare: number
	volume24h: number
	volume24hShare: number
	markets: number
}

export interface IRWAPerpsVenuesOverview {
	rows: IRWAPerpsVenuesOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}
