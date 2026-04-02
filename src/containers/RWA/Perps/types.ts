import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import type { IRWAPerpsAggregateHistoricalPoint, IRWAPerpsMarket, IRWAPerpsMarketChartPoint } from './api.types'

interface IRWAPerpsNavLink {
	label: string
	to: string
}

interface IRWAPerpsContractInfo {
	contract: string
	displayName: string
	venue: string
	baseAsset: string | null
	baseAssetGroup: string | null
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

export interface IRWAPerpsContractFundingHistoryPoint {
	timestamp: number
	fundingRate: number
	premium: number
	openInterest: number
	fundingPayment: number
}

export type IRWAPerpsContractMarketChartPoint = IRWAPerpsMarketChartPoint

export interface IRWAPerpsContractData {
	contract: IRWAPerpsContractInfo
	market: IRWAPerpsMarket
	marketChart: IRWAPerpsContractMarketChartPoint[] | null
	fundingHistory: IRWAPerpsContractFundingHistoryPoint[] | null
}

export type IRWAPerpsTimeSeriesRow = IRWAPerpsMarket | IRWAPerpsAggregateHistoricalPoint

export type RWAPerpsChartMetricKey = 'openInterest' | 'volume24h' | 'markets'
export type RWAPerpsChartView = 'timeSeries' | 'pie' | 'treemap' | 'hbar'
export type RWAPerpsTreemapNestedBy = 'none' | 'venue' | 'assetClass' | 'baseAsset' | 'contract'

export type RWAPerpsOverviewBreakdown = 'venue' | 'assetClass' | 'baseAsset' | 'contract'
export type RWAPerpsOverviewTimeSeriesBreakdown = 'venue' | 'assetClass' | 'baseAsset' | 'contract'
export type RWAPerpsOverviewNonTimeSeriesBreakdown = 'venue' | 'assetClass' | 'baseAsset' | 'contract'
export type RWAPerpsOverviewTreemapBreakdown = 'venue' | 'assetClass' | 'baseAsset' | 'contract'
export type RWAPerpsVenueBreakdown = 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsVenueTimeSeriesBreakdown = 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsVenueNonTimeSeriesBreakdown = 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsVenueTreemapBreakdown = 'assetClass' | 'baseAsset' | 'contract'
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
		protocolFees24h: number
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
