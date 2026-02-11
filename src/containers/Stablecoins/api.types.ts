export type NumericRecord = Record<string, number>

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
	doublecounted?: boolean
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
	bridges?: Record<string, Record<string, { amount: number }>>
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
	name: string
	symbol: string
	onCoinGecko?: string | null
	gecko_id?: string | null
	description?: string | null
	mintRedeemDescription?: string | null
	address?: string | null
	url?: string | null
	pegMechanism?: 'algorithmic' | 'fiat-backed' | 'crypto-backed' | string | null
	twitter?: string | null
	auditLinks?: string[] | string | null
	price?: number | null
	deprecated?: boolean
	pegType: string
	chainBalances: Record<string, { tokens: ChartPoint[] }>
}
