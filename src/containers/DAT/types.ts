import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import type { IDATInstitutionHolding, IDATInstitutionMetadata } from './api.types'

// ── Overview page (digital-asset-treasuries/index) ──────────────────────

export interface IDATInstitutionOverview extends Omit<IDATInstitutionMetadata, 'holdings'> {
	realized_mNAV: number | null
	realistic_mNAV: number | null
	max_mNAV: number | null
	holdings: Array<{
		name: string
		ticker: string
		amount: number
		cost: number | null
		usdValue: number | null
		avgPrice: number | null
		dominance: number
		color: string
	}>
}

export interface IDATDailyFlowByAsset {
	name: string
	stack: string
	type: string
	color: string
	data: Array<[number, number | null, number | null]>
}

export interface IDATOverviewPageProps {
	allAssets: Array<{ label: string; to: string }>
	institutions: IDATInstitutionOverview[]
	dailyFlowsByAsset: Record<string, IDATDailyFlowByAsset>
}

// ── By-asset page (digital-asset-treasuries/[asset]) ────────────────────

export interface IDATInstitutionOverviewByAsset extends Omit<
	IDATInstitutionMetadata,
	'holdings' | 'totalUsdValue' | 'totalCost'
> {
	realized_mNAV: number | null
	realistic_mNAV: number | null
	max_mNAV: number | null
	holdings: IDATInstitutionHolding
}

export interface IDATChartPayload {
	charts: MultiSeriesChart2SeriesConfig[]
	dataset: MultiSeriesChart2Dataset
}

export interface IDATMNAVChartPayload {
	charts: MultiSeriesChart2SeriesConfig[]
	dataset: {
		source: Array<Record<string, number | null>>
		dimensions: string[]
	}
}

export interface IDATOverviewDataByAssetProps {
	institutions: IDATInstitutionOverviewByAsset[]
	asset: string
	metadata: {
		name: string
		ticker: string
		geckoId: string
		companies: number
		totalAmount: number
		totalUsdValue: number
		circSupplyPerc: number
	}
	allAssets: Array<{ label: string; to: string }>
	dailyFlowsChart: IDATChartPayload
	mNAVRealizedChart: IDATMNAVChartPayload
	mNAVRealisticChart: IDATMNAVChartPayload
	mNAVMaxChart: IDATMNAVChartPayload
	institutionsNames: string[]
}

// ── Company detail page (digital-asset-treasury/[company]) ──────────────

export interface IDATCompanyAssetBreakdown {
	name: string
	ticker: string
	amount: number
	cost: number | null
	usdValue: number | null
	avgPrice: number | null
}

export interface IDATCompanyChartByAsset {
	asset: string
	name: string
	ticker: string
	holdingsChart: IDATChartPayload
}

export interface IDATCompanyPageProps {
	name: string
	ticker: string
	transactions: Array<{
		id: number
		asset: string
		amount: string
		avg_price: string
		usd_value: string
		start_date: string
		end_date: string
		report_date: string
		type: string
		source_type: string
		source_url: string
		source_note: string
		is_approved: boolean
		reject_reason: string | null
		last_updated: string
		ticker: string
		assetName: string
		assetTicker: string
	}>
	price: number
	priceChange24h: number | null
	totalCost: number
	totalUsdValue: number
	firstAnnouncementDate: string | null
	lastAnnouncementDate: string | null
	realized_mNAV: number | null
	realistic_mNAV: number | null
	max_mNAV: number | null
	assets: string[]
	assetsBreakdown: IDATCompanyAssetBreakdown[]
	chartByAsset: IDATCompanyChartByAsset[]
	mNAVChart: IDATChartPayload | null
	fdChart: IDATChartPayload | null
	totalAssetValueChart: IDATChartPayload | null
	ohlcvChartData: Array<[number, number, number, number, number, number]> | null
}
