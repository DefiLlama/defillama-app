import type {
	StablecoinBridgeInfoResponse,
	StablecoinChartPoint,
	StablecoinDetailResponse,
	StablecoinListAsset,
	StablecoinsListResponse
} from './api.types'
import type { StablecoinChartSeriesPayload } from './chartSeries'
import type { FormattedStablecoinAsset, IFormattedStablecoinChainRow } from './utils'

type StablecoinOverviewChartPoint = {
	date: number
	mcap: Record<string, number>
}

export interface StablecoinsGlobalDataCache {
	chainList: string[]
	chains: string[]
	chainsTVLData: number[]
}

export interface StablecoinOverviewChartInputs {
	chartDataByPeggedAsset: StablecoinOverviewChartPoint[][]
	peggedAssetNames: string[]
	peggedNameToChartDataIndex: Record<string, number>
	doublecountedIds: number[]
}

export interface PeggedOverviewPageData {
	chains: string[]
	filteredPeggedAssets: FormattedStablecoinAsset[]
	chain: string
	defaultChartData: StablecoinChartSeriesPayload
}

export interface PeggedChainsPageData {
	chainCirculatings: IFormattedStablecoinChainRow[]
	chainList: string[]
	chainsGroupbyParent: Record<string, Record<string, string[]>>
	change1d: string
	change7d: string
	change30d: string
	totalMcapCurrent: number | null
	change1d_nol: string
	change7d_nol: string
	change30d_nol: string
}

export type StablecoinBridges = Record<string, Record<string, { amount: number }>> | null

export interface PeggedAssetPageProps {
	chainsUnique: string[]
	chainCirculatings: Array<{
		circulating: number | null
		unreleased: number | null
		change_1d: number | null
		change_7d: number | null
		change_1m: number | null
		circulatingPrevDay: number | null
		circulatingPrevWeek: number | null
		circulatingPrevMonth: number | null
		bridgedAmount: number | null
		bridges: StablecoinBridges
		name: string
		symbol: string
	}>
	peggedAssetData: Omit<StablecoinDetailResponse, 'chainBalances' | 'currentChainBalances' | 'tokens'>
	defaultChartData: StablecoinChartSeriesPayload
	totalCirculating: number | null
	unreleased: number | null
	mcap: number | null
	bridgeInfo: StablecoinBridgeInfoResponse
	blockExplorerUrl: string | null
	blockExplorerName: string | null
}

export interface PeggedChainMcapSummary {
	mcap: number | null
	change7dUsd: number | null
	change7d: string | null
	topToken: { symbol: string; mcap: number }
	dominance: string | null
	mcapChartData: Array<[number, number]> | null
}

export type PeggedAssetsInput = Pick<StablecoinsListResponse, 'peggedAssets' | 'chains'>

export type PeggedAssetsForChartInput = {
	peggedAssets: StablecoinListAsset[]
	breakdown: Record<string, StablecoinChartPoint[]>
	doublecountedSourceIds?: string[]
}
