export interface IChainTvl {
	[type: string]: {
		tvl: { date: number; totalLiquidityUSD: number }[]
		tokensInUsd?: Array<{ date: number; tokens: { [token: string]: number } }>
		tokens?: Array<{ date: number; tokens: { [token: string]: number } }>
	}
}

export interface IResponseCGMarketsAPI {
	ath: number
	ath_change_percentage: number
	ath_date: string
	atl: number
	atl_change_percentage: number
	atl_date: string
	circulating_supply: number
	current_price: number
	fully_diluted_valuation: number
	high_24h: number
	id: string
	image: string
	last_updated: string
	low_24h: number
	market_cap: number
	market_cap_change_24h: number
	market_cap_change_percentage_24h: number
	market_cap_rank: number
	max_supply: number
	name: string
	price_change_24h: number
	price_change_percentage_24h: number
	roi: null
	symbol: string
	total_supply: number
	total_volume: number
	image2: string
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

export interface CgMarketChartResponse {
	prices?: Array<[number, number]>
	market_caps?: Array<[number, number]>
	total_volumes?: Array<[number, number]>
}

export interface CgChartResponse {
	data?: {
		coinData?: {
			symbol?: string
			market_data?: {
				ath?: { usd?: number | null }
				ath_date?: { usd?: string | null }
				atl?: { usd?: number | null }
				atl_date?: { usd?: string | null }
				market_cap?: { usd?: number | null }
				total_supply?: number | null
				fully_diluted_valuation?: { usd?: number | null }
				total_volume?: { usd?: number | null }
				circulating_supply?: number
				max_supply?: number
				max_supply_infinite?: boolean
			}
			tickers?: Array<{
				trust_score?: string
				market?: { identifier?: string }
				converted_volume?: { usd?: number | null }
			}>
		}
		prices?: Array<[number, number]>
		mcaps?: Array<[number, number]>
		volumes?: Array<[number, number]>
	}
}

export interface GeckoIdResponse {
	id: string
}

/** Per-chain token metadata from CoinGecko GET /coins/{id} (`detail_platforms`). */
export interface CoinGeckoDetailPlatform {
	decimal_place?: number
	contract_address?: string
	geckoterminal_url?: string
}

/** CoinGecko GET /coins/{id} ticker row when `depth=false` (2% orderbook costs omitted). */
export interface CoinGeckoCoinTicker {
	base?: string
	target?: string
	market?: {
		name?: string
		identifier?: string
		has_trading_incentive?: boolean
	}
	last?: number
	volume?: number
	converted_last?: { btc?: number; eth?: number; usd?: number }
	converted_volume?: { btc?: number; eth?: number; usd?: number }
	trust_score?: string | null
	bid_ask_spread_percentage?: number
	timestamp?: string
	last_traded_at?: string
	last_fetch_at?: string
	is_anomaly?: boolean
	is_stale?: boolean
	trade_url?: string | null
	token_info_url?: string | null
	coin_id?: string
	target_coin_id?: string
	coin_mcap_usd?: number
}

/**
 * Same as {@link CoinGeckoCoinTicker} plus 2% orderbook depth when `depth=true`
 * (see CoinGecko `cost_to_move_*` fields — often returned as strings for precision).
 */
export interface CoinGeckoCoinTickerWithDepth extends CoinGeckoCoinTicker {
	cost_to_move_up_usd?: string
	cost_to_move_down_usd?: string
}

/** Multi-currency numeric maps as returned by CoinGecko `market_data`. */
export type CoinGeckoCurrencyNumberMap = Partial<Record<string, number | null>>

export interface CoinGeckoCoinMarketData {
	current_price?: CoinGeckoCurrencyNumberMap
	market_cap?: CoinGeckoCurrencyNumberMap
	fully_diluted_valuation?: CoinGeckoCurrencyNumberMap
	total_volume?: CoinGeckoCurrencyNumberMap
	total_value_locked?: { btc?: number; usd?: number }
	mcap_to_tvl_ratio?: number | null
	fdv_to_tvl_ratio?: number | null
	circulating_supply?: number
	total_supply?: number
	max_supply?: number | null
	max_supply_infinite?: boolean
	outstanding_token_value_usd?: number
	market_cap_rank?: number | null
	[key: string]: unknown
}

export interface CoinGeckoCoinImage {
	thumb?: string
	small?: string
	large?: string
}

export interface CoinGeckoCoinLinks {
	homepage?: string[]
	whitepaper?: string
	blockchain_site?: string[]
	official_forum_url?: string[]
	chat_url?: string[]
	announcement_url?: string[]
	snapshot_url?: string
	twitter_screen_name?: string
	repos_url?: { github?: string[]; bitbucket?: string[] }
	[key: string]: unknown
}

/**
 * Shared body of CoinGecko GET /api/v3/coins/{id} (platforms, contract addresses, market_data, etc.).
 * `tickers` shape depends on the `depth` query flag — see {@link CoinGeckoCoinDetailResponse} vs
 * {@link CoinGeckoCoinDetailResponseWithDepth}.
 */
export interface CoinGeckoCoinDetailBody {
	id: string
	symbol: string
	name: string
	web_slug?: string | null
	asset_platform_id?: string | null
	contract_address?: string | null
	platforms?: Record<string, string>
	detail_platforms?: Record<string, CoinGeckoDetailPlatform>
	categories?: string[]
	image?: CoinGeckoCoinImage
	links?: CoinGeckoCoinLinks
	localization?: Record<string, string>
	description?: Record<string, string>
	market_cap_rank?: number | null
	market_cap_rank_with_rehypothecated?: number | null
	market_data?: CoinGeckoCoinMarketData
	community_data?: Record<string, unknown>
	developer_data?: Record<string, unknown>
	last_updated?: string
	[key: string]: unknown
}

/**
 * Response when `depth` is false or omitted — `tickers` do not include orderbook depth fields.
 */
export interface CoinGeckoCoinDetailResponse extends CoinGeckoCoinDetailBody {
	tickers?: CoinGeckoCoinTicker[]
}

/**
 * Response when `depth=true` — each ticker may include `cost_to_move_up_usd` / `cost_to_move_down_usd`.
 */
export interface CoinGeckoCoinDetailResponseWithDepth extends CoinGeckoCoinDetailBody {
	tickers?: CoinGeckoCoinTickerWithDepth[]
}

/** Response from CoinGecko GET /coins/{id}/tickers when `depth=true`. */
export interface CoinGeckoCoinTickersResponseWithDepth {
	name?: string
	tickers?: CoinGeckoCoinTickerWithDepth[]
}

/**
 * Discriminated by the `depth` query param: which ticker row type is used.
 * (The HTTP response does not include a `depth` field; this models the request/response pair.)
 */
export type CoinGeckoCoinDetailByDepth<D extends boolean> = D extends true
	? CoinGeckoCoinDetailResponseWithDepth
	: CoinGeckoCoinDetailResponse

/** Result when the request fails and we fall back to `{}` (see fetchCoinGeckoCoinById). */
export type CoinGeckoCoinDetailResult = CoinGeckoCoinDetailResponse | Record<string, never>

/** Same as {@link CoinGeckoCoinDetailResult} but when `depth: true` was requested. */
export type CoinGeckoCoinDetailResultWithDepth = CoinGeckoCoinDetailResponseWithDepth | Record<string, never>

export interface DenominationPriceHistory {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

export interface CgMarketsQueryParams {
	vsCurrency?: string
	order?: string
	perPage?: number
	page: number
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

export interface ProtocolLlamaswapResponse {
	chains?: Array<LlamaswapChain>
}

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
