import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import type { IRWAPerpsMarket, IRWAPerpsMarketChartPoint } from './api.types'

export interface IRWAPerpsNavLink {
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

export type RWAPerpsChartMetricKey = 'openInterest' | 'volume24h' | 'markets'
export type RWAPerpsChartView = 'timeSeries' | 'pie' | 'treemap' | 'hbar'
export type RWAPerpsTimeSeriesMode = 'grouped' | 'breakdown'
export type RWAPerpsTreemapNestedBy = 'none' | 'venue' | 'assetClass' | 'baseAsset' | 'contract'

export type RWAPerpsOverviewBreakdown = 'venue' | 'assetClass' | 'assetGroup' | 'baseAsset' | 'contract'
export type RWAPerpsOverviewTimeSeriesBreakdown = 'venue' | 'assetClass' | 'assetGroup' | 'baseAsset' | 'contract'
export type RWAPerpsOverviewNonTimeSeriesBreakdown = 'assetGroup' | 'venue' | 'assetClass' | 'baseAsset' | 'contract'
export type RWAPerpsOverviewTreemapBreakdown = 'venue' | 'assetClass' | 'baseAsset' | 'assetGroup' | 'contract'
export type RWAPerpsVenueBreakdown = 'assetGroup' | 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsVenueTimeSeriesBreakdown = 'assetGroup' | 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsVenueNonTimeSeriesBreakdown = 'assetGroup' | 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsVenueTreemapBreakdown = 'assetClass' | 'baseAsset' | 'assetGroup' | 'contract'
export type RWAPerpsAssetGroupBreakdown = 'venue' | 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsAssetGroupTimeSeriesBreakdown = 'venue' | 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsAssetGroupNonTimeSeriesBreakdown = 'venue' | 'baseAsset' | 'contract' | 'assetClass'
export type RWAPerpsAssetGroupTreemapBreakdown = 'venue' | 'baseAsset' | 'assetClass' | 'contract'
export type RWAPerpsOverviewSnapshotBreakdown = RWAPerpsOverviewNonTimeSeriesBreakdown
export type RWAPerpsVenueSnapshotBreakdown = RWAPerpsVenueNonTimeSeriesBreakdown
export type RWAPerpsAssetGroupSnapshotBreakdown = RWAPerpsAssetGroupNonTimeSeriesBreakdown
export type RWAPerpsChartMode = 'overview' | 'venue' | 'assetGroup'

export interface IRWAPerpsOverviewBreakdownRequest {
	breakdown: Exclude<RWAPerpsOverviewBreakdown, 'contract'>
	key: RWAPerpsChartMetricKey
	assetClass?: string
	excludeAssetClass?: string
}

export interface IRWAPerpsVenueBreakdownRequest {
	venue: string
	breakdown: Exclude<RWAPerpsVenueBreakdown, 'contract'>
	key: RWAPerpsChartMetricKey
}

export interface IRWAPerpsAssetGroupBreakdownRequest {
	assetGroup: string
	breakdown: Exclude<RWAPerpsAssetGroupBreakdown, 'contract'>
	key: RWAPerpsChartMetricKey
}

export interface IRWAPerpsContractBreakdownRequest {
	key: RWAPerpsChartMetricKey
	venue?: string
	assetGroup?: string
	assetClass?: string
	excludeAssetClass?: string
}

export interface IRWAPerpsOverviewPageData {
	markets: IRWAPerpsMarket[]
	initialChartDataset: MultiSeriesChart2Dataset
	totals: {
		openInterest: number
		openInterestChange24h: number | null
		volume24h: number
		volume24hChange24h: number | null
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
		openInterestChange24h: number | null
		volume24h: number
		volume24hChange24h: number | null
		markets: number
		protocolFees24h: number
	}
}

export interface IRWAPerpsAssetGroupPageData {
	assetGroup: string
	markets: IRWAPerpsMarket[]
	initialChartDataset: MultiSeriesChart2Dataset
	assetGroupLinks: IRWAPerpsNavLink[]
	totals: {
		openInterest: number
		openInterestChange24h: number | null
		volume24h: number
		volume24hChange24h: number | null
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

export interface IRWAPerpsAssetGroupsOverviewRow {
	assetGroup: string
	openInterest: number
	openInterestShare: number
	volume24h: number
	volume24hShare: number
	markets: number
}

export interface IRWAPerpsAssetGroupsOverview {
	rows: IRWAPerpsAssetGroupsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}
