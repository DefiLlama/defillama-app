export type NumericRecord = Record<string, number>

export type UnknownRecord = Record<string, unknown>

export interface PeggedChainApi {
	name: string
	tvl: number
	totalCirculatingUSD: NumericRecord
}

export interface PeggedAssetApi {
	id: string
	name: string
	symbol: string
	gecko_id: string
	chains: string[]
	pegType: string
	chainBalances: Record<string, { tokens: ChartPoint[] }>
	chainCirculating?: Record<
		string,
		{
			current?: NumericRecord
			circulatingPrevDay?: NumericRecord
			circulatingPrevWeek?: NumericRecord
			circulatingPrevMonth?: NumericRecord
		}
	>
	circulating?: NumericRecord
	circulatingPrevDay?: NumericRecord
	circulatingPrevWeek?: NumericRecord
	circulatingPrevMonth?: NumericRecord
	price?: number
	priceSource?: string
	pegMechanism?: string
	yieldBearing?: boolean
	delisted?: boolean
	deprecated?: boolean
	[key: string]: unknown
}

export interface PeggedAssetsApiResponse {
	peggedAssets: PeggedAssetApi[]
	chains: PeggedChainApi[]
}

export interface ConfigApiResponse {
	chainCoingeckoIds: Record<
		string,
		{
			symbol?: string
			stablecoins?: string[]
			parent?: {
				chain: string
				types: string[]
			}
		}
	>
}

export interface ChartPoint {
	date: number
	totalCirculatingUSD?: NumericRecord
	totalCirculating?: NumericRecord
	totalUnreleased?: NumericRecord
	totalBridgedToUSD?: NumericRecord
	totalMintedUSD?: NumericRecord
	circulating?: NumericRecord
	unreleased?: NumericRecord
	bridgedTo?: NumericRecord
	bridges?: Record<string, unknown>
	[key: string]: unknown
}

export interface PeggedChartApiResponse {
	aggregated?: ChartPoint[]
	breakdown?: Record<string, ChartPoint[]>
	doublecountedIds?: string[]
}

export interface PeggedDominanceAllApiResponse {
	dominanceMap: Record<string, Array<{ greatestMcap?: { symbol: string; mcap: number } }>>
	chainChartMap: Record<string, ChartPoint[]>
}

export type PeggedPricesApiResponse = Array<{
	date: number
	prices?: Record<string, string | number>
}>

export type PeggedRatesApiResponse = Array<{
	date: number
	rates?: Record<string, string | number>
}>

export type PeggedConfigApiResponse = Record<string, string>

export interface BridgeInfo {
	name: string
	link?: string
}

export type BridgeInfoMap = Record<string, BridgeInfo>

export interface PeggedAssetDetailApiResponse {
	pegType: string
	chainBalances: Record<string, { tokens: ChartPoint[] }>
	[key: string]: unknown
}
