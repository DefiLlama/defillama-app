import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'

// ---------------------------------------------------------------------------
// ExtraTvl pages (total-borrowed, total-staked, pool2)
// ---------------------------------------------------------------------------

export type ExtraTvlMetric = 'borrowed' | 'staking' | 'pool2'

export interface IExtraTvlProtocolRow {
	name: string
	logo: string
	slug: string
	category: string | null
	chains: string[]
	value: number
	change_1m: number | null
	subRows?: IExtraTvlProtocolRow[]
}

export interface IExtraTvlByChainPageData {
	protocols: IExtraTvlProtocolRow[]
	chain: string
	chains: Array<{ label: string; to: string }>
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
	totalValue: number
	change24h: number | null
	metric: ExtraTvlMetric
}

// ---------------------------------------------------------------------------
// ProtocolsWithTokens pages (mcaps, fdv, token-prices, outstanding-fdv)
// ---------------------------------------------------------------------------

export type TokenMetricType = 'mcap' | 'fdv' | 'price' | 'outstanding-fdv'

export interface ITokenMetricProtocolRow {
	name: string
	logo: string
	slug: string
	category: string | null
	chains: string[]
	value: number | null
	subRows?: ITokenMetricProtocolRow[]
}

export interface IProtocolsWithTokensByChainPageData {
	protocols: ITokenMetricProtocolRow[]
	chain: string
	chains: Array<{ label: string; to: string }>
	categories: string[]
	type: TokenMetricType
}

// ---------------------------------------------------------------------------
// RecentProtocols / Airdrops pages
// ---------------------------------------------------------------------------

interface TvlEntry {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
}

export interface IRecentProtocol {
	name: string
	symbol: string | null
	logo: string
	url: string
	category: string
	chains: string[]
	chainTvls: Record<string, TvlEntry>
	tvl: number
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
	mcap: number | null
	listedAt: number
	defillamaId: string
	deprecated?: boolean
	forkedFrom?: string[]
	/** Extra TVL sections (staking, pool2, borrowed, etc.) extracted from chainTvls. */
	extraTvl: Record<string, TvlEntry>
	/** Only present on airdrops page. */
	totalRaised?: number
}

export interface IRecentProtocolsPageData {
	protocols: IRecentProtocol[]
	chainList: string[]
	categories: string[]
	forkedList: Record<string, boolean>
	claimableAirdrops?: Array<{ name: string; page: string; title?: string }>
}
