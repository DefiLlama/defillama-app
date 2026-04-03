export interface IChainTvl {
	[type: string]: {
		tvl: { date: number; totalLiquidityUSD: number }[]
		tokensInUsd?: Array<{ date: number; tokens: { [token: string]: number } }>
		tokens?: Array<{ date: number; tokens: { [token: string]: number } }>
	}
}

export type ChainGeckoPair = [chain: string, geckoId: string]

export interface LlamaConfigResponse {
	chainCoingeckoIds: Record<string, LlamaChainConfig>
}

interface LlamaChainConfig {
	geckoId?: string
	symbol?: string
	stablecoins?: string[]
	parent?: {
		chain: string
		types: string[]
	}
	[key: string]: unknown
}

interface CoinMcapEntry {
	mcap?: number | null
	timestamp?: number
}

export type CoinMcapsResponse = Record<string, CoinMcapEntry>

export interface PriceObject {
	confidence: number
	decimals?: number
	price: number
	symbol: string
	timestamp: number
}

export interface CoinsPricesResponse {
	coins?: Record<string, PriceObject | undefined>
}

interface CoinChartPricePoint {
	timestamp?: number
	price?: number
}

interface CoinChartEntry {
	prices?: CoinChartPricePoint[]
}

export interface CoinsChartResponse {
	coins?: Record<string, CoinChartEntry | undefined>
}

export interface TwitterPostsResponse {
	data?: unknown[]
	[key: string]: unknown
}

export interface LlamaswapChain {
	chain: string
	chainId: number
	address: string
	priceImpact: number
	liquidity?: number
}

export interface ProtocolLlamaswapEntry {
	name: string
	slug: string
	symbol: string
	geckoId: string
	chains?: Array<LlamaswapChain>
	updatedAt?: string
}

export type ProtocolLlamaswapDataset = Record<string, ProtocolLlamaswapEntry>

export type BuyOnLlamaswapChain = Omit<LlamaswapChain, 'priceImpact'> & { displayName: string }

/** Single pool row for a token from `LIQUIDITY_API` (`/liquidity.json`). */
interface ProtocolLiquidityTokenPool {
	chain: string
	project: string
	symbol: string
	tvlUsd: number
	pool?: string
	apy?: number | null
	apyBase?: number | null
	apyReward?: number | null
	rewardTokens?: string[] | null
	apyPct1D?: number | null
	apyPct7D?: number | null
	apyPct30D?: number | null
	stablecoin?: boolean
	ilRisk?: string
	exposure?: string
	poolMeta?: string | null
	predictions?: {
		predictedClass?: string
		predictedProbability?: number
		binnedConfidence?: number
	}
	mu?: number
	sigma?: number
	count?: number
	outlier?: boolean
	underlyingTokens?: string[]
	il7d?: number | null
	apyBase7d?: number | null
	apyMean30d?: number | null
	volumeUsd1d?: number | null
	volumeUsd7d?: number | null
	apyBaseInception?: number | null
	[key: string]: unknown
}

/** One token’s liquidity coverage from the datasets `liquidity.json` list. */
interface ProtocolLiquidityToken {
	id: string
	symbol?: string
	tokenPools?: ProtocolLiquidityTokenPool[]
	[key: string]: unknown
}

/** Response body of `LIQUIDITY_API`: array of tokens with pool-level liquidity. */
export type ProtocolLiquidityTokensResponse = ProtocolLiquidityToken[]

export type ProtocolTokenLiquidityChart = Array<[string | number, number]>

export interface SearchQuery {
	indexUid: string
	limit: number
	offset: number
	q: string
	filter?: Array<string | string[]>
}

interface BlockExplorerLink {
	name: string
	url: string
}

interface BlockExplorersChain {
	displayName: string
	llamaChainId: string | null
	evmChainId: number | null
	blockExplorers: BlockExplorerLink[]
}

export type BlockExplorersResponse = BlockExplorersChain[]
