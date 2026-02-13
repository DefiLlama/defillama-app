import type {
	StablecoinBridgeInfoResponse,
	StablecoinChartPoint,
	StablecoinDetailResponse,
	StablecoinListAsset,
	StablecoinsListResponse
} from './api.types'

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
	filteredPeggedAssets: Array<{ name: string; mcap: number; [key: string]: unknown }>
	peggedAssetNames: string[]
	peggedNameToChartDataIndex: Record<string, number>
	chartDataByPeggedAsset: StablecoinOverviewChartPoint[][]
	doublecountedIds: number[]
	chain: string
}

export interface PeggedChainsPageData {
	chainCirculatings: Array<Record<string, unknown>>
	chartData: StablecoinChartPoint[]
	peggedChartDataByChain: Array<Array<{ date: number; mcap: number | null }> | null>
	chainList: string[]
	chainsGroupbyParent: Record<string, Record<string, string[]>>
}

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
		bridges: unknown
		name: string
		symbol: string
	}>
	peggedAssetData: StablecoinDetailResponse
	totalCirculating: number | null
	unreleased: number | null
	mcap: number | null
	bridgeInfo: StablecoinBridgeInfoResponse
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
