type CoinGeckoPrecision =
	| 'full'
	| '0'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	| '10'
	| '11'
	| '12'
	| '13'
	| '14'
	| '15'
	| '16'
	| '17'
	| '18'

type CoinGeckoIncludeTokens = 'top' | 'all'

type CoinGeckoDexPairFormat = 'contract_address' | 'symbol'

type CoinGeckoCoinTickersOrder = 'trust_score_desc' | 'trust_score_asc' | 'volume_desc' | 'volume_asc'

type CoinGeckoCoinMarketChartInterval = '5m' | 'hourly' | 'daily'

type CoinGeckoDerivativeExchangesOrder =
	| 'name_asc'
	| 'name_desc'
	| 'open_interest_btc_asc'
	| 'open_interest_btc_desc'
	| 'trade_volume_24h_btc_asc'
	| 'trade_volume_24h_btc_desc'

type ResolveBooleanOption<TValue, TDefault extends boolean> = TValue extends boolean ? TValue : TDefault

type OptionValue<TOptions, TKey extends PropertyKey> = TOptions extends Record<TKey, infer TValue> ? TValue : never

type DefaultedBooleanOption<TOptions, TKey extends PropertyKey, TDefault extends boolean> = ResolveBooleanOption<
	OptionValue<TOptions, TKey>,
	TDefault
>

type CoinGeckoConditionalField<TEnabled extends boolean, TKey extends PropertyKey, TValue> = TEnabled extends false
	? { [K in TKey]?: never }
	: { [K in TKey]?: TValue }

interface CoinGeckoRoi {
	times?: number | null
	currency?: string | null
	percentage?: number | null
}

export interface IResponseCGMarketsAPI {
	ath?: number | null
	ath_change_percentage?: number | null
	ath_date?: string | null
	atl?: number | null
	atl_change_percentage?: number | null
	atl_date?: string | null
	circulating_supply?: number | null
	current_price?: number | null
	fully_diluted_valuation?: number | null
	high_24h?: number | null
	id: string
	image?: string
	image2?: string
	last_updated?: string
	low_24h?: number | null
	market_cap?: number | null
	market_cap_change_24h?: number | null
	market_cap_change_percentage_24h?: number | null
	market_cap_rank?: number | null
	market_cap_rank_with_rehypothecated?: number | null
	max_supply?: number | null
	name: string
	price_change_24h?: number | null
	price_change_percentage_24h?: number | null
	price_change_percentage_1h_in_currency?: number | null
	price_change_percentage_24h_in_currency?: number | null
	price_change_percentage_7d_in_currency?: number | null
	price_change_percentage_14d_in_currency?: number | null
	price_change_percentage_30d_in_currency?: number | null
	price_change_percentage_200d_in_currency?: number | null
	price_change_percentage_1y_in_currency?: number | null
	roi?: CoinGeckoRoi | null
	sparkline_in_7d?: {
		price?: number[]
	}
	symbol: string
	total_supply?: number | null
	total_volume?: number | null
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
				trust_score?: string | null
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

export interface FetchCoinGeckoSimplePriceOptions {
	vsCurrencies: string | string[]
	ids?: string | string[]
	names?: string | string[]
	symbols?: string | string[]
	includeTokens?: CoinGeckoIncludeTokens
	includeMarketCap?: boolean
	include24hrVol?: boolean
	include24hrChange?: boolean
	includeLastUpdatedAt?: boolean
	precision?: CoinGeckoPrecision
}

type CoinGeckoSimplePriceValue = Record<string, number | null | undefined> & { last_updated_at?: number }

export type CoinGeckoSimplePriceResponse = Record<string, CoinGeckoSimplePriceValue | undefined>

export interface FetchCoinGeckoExchangesOptions {
	perPage?: number
	maxPages?: number
}

export interface CoinGeckoExchange {
	id: string
	name: string
	year_established?: number | null
	country?: string | null
	description?: string
	url?: string
	image?: string
	has_trading_incentive?: boolean | null
	trust_score?: number
	trust_score_rank?: number
	trade_volume_24h_btc?: number
}

export interface FetchCoinGeckoDerivativesExchangesOptions extends FetchCoinGeckoExchangesOptions {
	order?: CoinGeckoDerivativeExchangesOrder
}

export interface CoinGeckoDerivativeExchange {
	name: string
	id: string
	open_interest_btc?: number
	trade_volume_24h_btc?: string
	number_of_perpetual_pairs?: number
	number_of_futures_pairs?: number
	image?: string
	year_established?: number | null
	country?: string | null
	description?: string
	url?: string
}

/** Per-chain token metadata from CoinGecko GET /coins/{id} (`detail_platforms`). */
interface CoinGeckoDetailPlatform {
	decimal_place?: number | null
	contract_address?: string
	geckoterminal_url?: string
}

/** CoinGecko GET /coins/{id}/tickers row when `depth=false` (2% orderbook costs omitted). */
interface CoinGeckoCoinTicker {
	base?: string
	target?: string
	market?: {
		name?: string
		identifier?: string
		has_trading_incentive?: boolean
		logo?: string
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

/** Same as {@link CoinGeckoCoinTicker} plus 2% orderbook depth when `depth=true`. */
export interface CoinGeckoCoinTickerWithDepth extends CoinGeckoCoinTicker {
	cost_to_move_up_usd?: number
	cost_to_move_down_usd?: number
}

export interface FetchCoinGeckoCoinTickersByIdOptions {
	exchangeIds?: string | string[]
	includeExchangeLogo?: boolean
	order?: CoinGeckoCoinTickersOrder
	depth?: boolean
	dexPairFormat?: CoinGeckoDexPairFormat
}

/** Multi-currency numeric maps as returned by CoinGecko `market_data`. */
type CoinGeckoCurrencyNumberMap = Partial<Record<string, number | null>>

interface CoinGeckoCoinMarketData {
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
	sparkline_7d?: {
		price?: number[]
	}
	[key: string]: unknown
}

interface CoinGeckoCoinImage {
	thumb?: string
	small?: string
	large?: string
}

interface CoinGeckoCoinLinks {
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
 * Shared body of CoinGecko GET /coins/{id} and GET /coins/{asset_platform_id}/contract/{contract_address}.
 * Some fields are present only when specific query params are enabled.
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
	categories_details?: Array<Record<string, unknown>>
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

export interface FetchCoinGeckoCoinByIdOptions {
	localization?: boolean
	tickers?: boolean
	marketData?: boolean
	communityData?: boolean
	developerData?: boolean
	sparkline?: boolean
	includeCategoriesDetails?: boolean
	dexPairFormat?: CoinGeckoDexPairFormat
}

export type CoinGeckoCoinDetailResponseForOptions<TOptions = undefined> = CoinGeckoCoinDetailBody &
	CoinGeckoConditionalField<DefaultedBooleanOption<TOptions, 'tickers', true>, 'tickers', CoinGeckoCoinTicker[]> &
	CoinGeckoConditionalField<
		DefaultedBooleanOption<TOptions, 'marketData', true>,
		'market_data',
		CoinGeckoCoinMarketData
	> &
	CoinGeckoConditionalField<
		DefaultedBooleanOption<TOptions, 'communityData', true>,
		'community_data',
		Record<string, unknown>
	> &
	CoinGeckoConditionalField<
		DefaultedBooleanOption<TOptions, 'developerData', true>,
		'developer_data',
		Record<string, unknown>
	> &
	CoinGeckoConditionalField<
		DefaultedBooleanOption<TOptions, 'includeCategoriesDetails', false>,
		'categories_details',
		Array<Record<string, unknown>>
	>

type CoinGeckoCoinDetailResponse = CoinGeckoCoinDetailResponseForOptions

export type CoinGeckoCoinDetailResultForOptions<TOptions = undefined> =
	| CoinGeckoCoinDetailResponseForOptions<TOptions>
	| Record<string, never>

export type CoinGeckoCoinDetailResult = CoinGeckoCoinDetailResultForOptions

export type CoinGeckoCoinByContractAddressResponse = CoinGeckoCoinDetailResponse

export type CoinGeckoCoinTickersResponseForOptions<TOptions = undefined> = {
	name?: string
	tickers?: Array<
		DefaultedBooleanOption<TOptions, 'depth', false> extends true ? CoinGeckoCoinTickerWithDepth : CoinGeckoCoinTicker
	>
}

export type CoinGeckoCoinTickersResultForOptions<TOptions = undefined> =
	| CoinGeckoCoinTickersResponseForOptions<TOptions>
	| Record<string, never>

export interface FetchCoinGeckoCoinMarketChartByIdOptions {
	vsCurrency?: string
	days?: string | number
	interval?: CoinGeckoCoinMarketChartInterval
	precision?: CoinGeckoPrecision
}

export interface DenominationPriceHistory {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}
