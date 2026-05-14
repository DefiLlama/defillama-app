import dayjs from 'dayjs'
import { COINGECKO_KEY, COINS_CHART_API, DATASETS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'
import type {
	CgChartResponse,
	CgMarketChartResponse,
	CoinGeckoCoinByContractAddressResponse,
	CoinGeckoCoinDetailResultForOptions,
	CoinGeckoCoinListItem,
	CoinGeckoCoinDetailResponseForOptions,
	CoinGeckoCoinTickersResponseForOptions,
	CoinGeckoCoinTickersResultForOptions,
	CoinGeckoDerivativeExchange,
	CoinGeckoExchange,
	CoinGeckoSimplePriceResponse,
	DenominationPriceHistory,
	FetchCoinGeckoCoinByIdOptions,
	FetchCoinGeckoCoinsListOptions,
	FetchCoinGeckoCoinMarketChartByIdOptions,
	FetchCoinGeckoCoinTickersByIdOptions,
	FetchCoinGeckoDerivativesExchangesOptions,
	FetchCoinGeckoExchangesOptions,
	FetchCoinGeckoSimplePriceOptions,
	GeckoIdResponse,
	IResponseCGMarketsAPI
} from './coingecko.types'
import { fetchCoinPrices } from './index'

const COINGECKO_API_BASE_URL = COINGECKO_KEY
	? 'https://pro-api.coingecko.com/api/v3'
	: 'https://api.coingecko.com/api/v3'

const COINGECKO_REQUEST_HEADERS = COINGECKO_KEY ? { 'x-cg-pro-api-key': COINGECKO_KEY } : undefined
const TOKEN_LIST_API_URL = `${DATASETS_SERVER_URL}/tokenlist/sorted.json`
const COINGECKO_EXCHANGES_MAX_PAGE_SIZE = 250
const COINGECKO_TICKERS_PAGE_SIZE = 100
const CG_CHART_CACHE_TTL_SECONDS = 60 * 60
const CG_CHART_LOCAL_API_PATH = '/api/cache/cgchart'

function createCoinGeckoUrl(pathname: string): URL {
	return new URL(pathname.replace(/^\//, ''), `${COINGECKO_API_BASE_URL}/`)
}

function setQueryParam(url: URL, key: string, value: string | number | boolean | string[] | undefined | null): void {
	if (value === undefined || value === null) return
	if (Array.isArray(value)) {
		if (value.length === 0) return
		url.searchParams.set(key, value.join(','))
		return
	}
	url.searchParams.set(key, String(value))
}

async function fetchCoinGeckoJson<T>(pathname: string, url: URL = createCoinGeckoUrl(pathname)): Promise<T> {
	return fetchJson<T>(url.toString(), { headers: COINGECKO_REQUEST_HEADERS })
}

async function fetchAllPaginatedCoinGeckoResults<T>({
	fetchPage,
	pageSize,
	breakOnPartialPage = true,
	maxPages = 1000
}: {
	fetchPage: (page: number) => Promise<T[]>
	pageSize: number
	breakOnPartialPage?: boolean
	maxPages?: number
}): Promise<T[]> {
	const results: T[] = []
	const safeMaxPages = Math.max(1, maxPages)
	let terminated = false

	for (let page = 1; page <= safeMaxPages; page++) {
		const pageItems = await fetchPage(page)
		if (pageItems.length === 0) {
			terminated = true
			break
		}

		results.push(...pageItems)

		if (breakOnPartialPage && pageItems.length < pageSize) {
			terminated = true
			break
		}
	}

	if (!terminated) {
		throw new Error(
			`[fetchAllPaginatedCoinGeckoResults] Reached maxPages=${safeMaxPages} without termination (pageSize=${pageSize}, breakOnPartialPage=${breakOnPartialPage})`
		)
	}

	return results
}

function isCGMarketsApiItem(value: unknown): value is IResponseCGMarketsAPI {
	if (typeof value !== 'object' || value === null) return false
	const item = value as Partial<IResponseCGMarketsAPI>
	return typeof item.id === 'string' && typeof item.symbol === 'string' && typeof item.name === 'string'
}

/**
 * Fetch the full sorted CoinGecko token list from the DefiLlama datasets mirror.
 * This is not a direct CoinGecko API call.
 */
export async function fetchCoinGeckoTokensListFromDataset(): Promise<Array<IResponseCGMarketsAPI>> {
	const data = await fetchJson<unknown>(TOKEN_LIST_API_URL)
	if (!Array.isArray(data)) {
		throw new Error(`[fetchCoinGeckoTokensListFromDataset] Expected array response from ${TOKEN_LIST_API_URL}`)
	}

	const validTokens = data.filter(isCGMarketsApiItem)

	return validTokens
}

/**
 * Fetch all pages from CoinGecko GET /exchanges.
 * This endpoint documents `page` and `per_page`, so callers receive the combined result set.
 */
export async function fetchCoinGeckoExchanges({
	perPage = COINGECKO_EXCHANGES_MAX_PAGE_SIZE,
	maxPages
}: FetchCoinGeckoExchangesOptions = {}): Promise<CoinGeckoExchange[]> {
	const pageSize = Math.min(Math.max(1, perPage), COINGECKO_EXCHANGES_MAX_PAGE_SIZE)

	return fetchAllPaginatedCoinGeckoResults<CoinGeckoExchange>({
		pageSize,
		maxPages,
		fetchPage: async (page) => {
			const url = createCoinGeckoUrl('/exchanges')
			setQueryParam(url, 'per_page', pageSize)
			setQueryParam(url, 'page', page)
			return fetchCoinGeckoJson<CoinGeckoExchange[]>(url.pathname, url)
		}
	})
}

/** Fetch CoinGecko GET /coins/list with optional platforms included. */
export async function fetchCoinGeckoCoinsList({
	includePlatform = false,
	status = 'active'
}: FetchCoinGeckoCoinsListOptions = {}): Promise<CoinGeckoCoinListItem[]> {
	const url = createCoinGeckoUrl('/coins/list')
	setQueryParam(url, 'include_platform', includePlatform)
	setQueryParam(url, 'status', status)
	return fetchCoinGeckoJson<CoinGeckoCoinListItem[]>(url.pathname, url)
}

/**
 * Fetch all pages from CoinGecko GET /derivatives/exchanges.
 * The docs expose `page` and `per_page`, so pagination is handled internally here.
 */
export async function fetchCoinGeckoDerivativesExchanges({
	order,
	perPage = 100,
	maxPages = 1000
}: FetchCoinGeckoDerivativesExchangesOptions = {}): Promise<CoinGeckoDerivativeExchange[]> {
	const pageSize = Math.max(1, perPage)

	return fetchAllPaginatedCoinGeckoResults<CoinGeckoDerivativeExchange>({
		pageSize,
		breakOnPartialPage: false,
		maxPages,
		fetchPage: async (page) => {
			const url = createCoinGeckoUrl('/derivatives/exchanges')
			setQueryParam(url, 'order', order)
			setQueryParam(url, 'per_page', pageSize)
			setQueryParam(url, 'page', page)
			return fetchCoinGeckoJson<CoinGeckoDerivativeExchange[]>(url.pathname, url)
		}
	})
}

/** Fetch CoinGecko simple prices by ids, names, or symbols. */
export async function fetchCoinGeckoSimplePrice({
	vsCurrencies,
	ids,
	names,
	symbols,
	includeTokens,
	includeMarketCap,
	include24hrVol,
	include24hrChange,
	includeLastUpdatedAt,
	precision
}: FetchCoinGeckoSimplePriceOptions): Promise<CoinGeckoSimplePriceResponse> {
	const url = createCoinGeckoUrl('/simple/price')
	setQueryParam(url, 'vs_currencies', vsCurrencies)
	setQueryParam(url, 'ids', ids)
	setQueryParam(url, 'names', names)
	setQueryParam(url, 'symbols', symbols)
	setQueryParam(url, 'include_tokens', includeTokens)
	setQueryParam(url, 'include_market_cap', includeMarketCap)
	setQueryParam(url, 'include_24hr_vol', include24hrVol)
	setQueryParam(url, 'include_24hr_change', include24hrChange)
	setQueryParam(url, 'include_last_updated_at', includeLastUpdatedAt)
	setQueryParam(url, 'precision', precision)
	return fetchCoinGeckoJson<CoinGeckoSimplePriceResponse>(url.pathname, url)
}

/** Fetch the CoinGecko coin payload by asset platform and contract address. */
async function fetchCoinGeckoCoinByContractAddress(
	assetPlatformId: string,
	contractAddress: string
): Promise<CoinGeckoCoinByContractAddressResponse | null> {
	if (!assetPlatformId || !contractAddress) return null

	return fetchCoinGeckoJson<CoinGeckoCoinByContractAddressResponse>(
		`/coins/${encodeURIComponent(assetPlatformId)}/contract/${encodeURIComponent(contractAddress)}`
	).catch(() => null)
}

/**
 * Resolve a CoinGecko coin id from a `chain:address` token reference.
 * For `coingecko:<id>` inputs, the CoinGecko id is returned directly without a network call.
 */
export async function fetchCoinGeckoIdByAddress(addressData: string): Promise<GeckoIdResponse | null> {
	const [chain, address] = addressData.split(':')
	if (!chain || !address || address === '-') return null

	if (chain === 'coingecko') return { id: address }

	const coin = await fetchCoinGeckoCoinByContractAddress(chain, address)
	return coin?.id ? { id: coin.id } : null
}

const DEFAULT_FETCH_COIN_DETAIL_OPTIONS: Required<FetchCoinGeckoCoinByIdOptions> = {
	localization: true,
	tickers: true,
	marketData: true,
	communityData: true,
	developerData: true,
	sparkline: false,
	includeCategoriesDetails: false,
	dexPairFormat: 'contract_address'
}

/**
 * Fetch CoinGecko coin metadata from GET /coins/{id}.
 * Query flags control which optional sections CoinGecko includes in the response body.
 */
export async function fetchCoinGeckoCoinById<TOptions extends FetchCoinGeckoCoinByIdOptions | undefined = undefined>(
	geckoId: string,
	options?: TOptions
): Promise<CoinGeckoCoinDetailResultForOptions<TOptions>> {
	if (!geckoId) return {} as CoinGeckoCoinDetailResultForOptions<TOptions>

	const query = { ...DEFAULT_FETCH_COIN_DETAIL_OPTIONS, ...options }
	const url = createCoinGeckoUrl(`/coins/${encodeURIComponent(geckoId)}`)
	setQueryParam(url, 'localization', query.localization)
	setQueryParam(url, 'tickers', query.tickers)
	setQueryParam(url, 'market_data', query.marketData)
	setQueryParam(url, 'community_data', query.communityData)
	setQueryParam(url, 'developer_data', query.developerData)
	setQueryParam(url, 'sparkline', query.sparkline)
	setQueryParam(url, 'include_categories_details', query.includeCategoriesDetails)
	setQueryParam(url, 'dex_pair_format', query.dexPairFormat)

	return fetchCoinGeckoJson<CoinGeckoCoinDetailResponseForOptions<TOptions>>(url.pathname, url).catch(
		() => ({}) as CoinGeckoCoinDetailResultForOptions<TOptions>
	)
}

/**
 * Fetch all pages from CoinGecko GET /coins/{id}/tickers.
 * CoinGecko documents this endpoint as paginated to 100 rows, so the module combines every page.
 */
export async function fetchCoinGeckoCoinTickersById<
	TOptions extends FetchCoinGeckoCoinTickersByIdOptions | undefined = undefined
>(geckoId: string, options?: TOptions): Promise<CoinGeckoCoinTickersResultForOptions<TOptions>> {
	if (!geckoId) return {} as CoinGeckoCoinTickersResultForOptions<TOptions>

	try {
		let name: string | undefined
		const tickers = await fetchAllPaginatedCoinGeckoResults<
			CoinGeckoCoinTickersResponseForOptions<TOptions>['tickers'] extends Array<infer T> ? T : never
		>({
			pageSize: COINGECKO_TICKERS_PAGE_SIZE,
			maxPages: options?.maxPages,
			fetchPage: async (page) => {
				const url = createCoinGeckoUrl(`/coins/${encodeURIComponent(geckoId)}/tickers`)
				setQueryParam(url, 'exchange_ids', options?.exchangeIds)
				setQueryParam(url, 'include_exchange_logo', options?.includeExchangeLogo)
				setQueryParam(url, 'page', page)
				setQueryParam(url, 'order', options?.order)
				setQueryParam(url, 'depth', options?.depth)
				setQueryParam(url, 'dex_pair_format', options?.dexPairFormat)

				const response = await fetchCoinGeckoJson<CoinGeckoCoinTickersResponseForOptions<TOptions>>(url.pathname, url)
				if (!name) name = response.name
				return response.tickers ?? []
			}
		})

		return { name, tickers } as CoinGeckoCoinTickersResultForOptions<TOptions>
	} catch {
		return {} as CoinGeckoCoinTickersResultForOptions<TOptions>
	}
}

/** Fetch CoinGecko historical market chart data from GET /coins/{id}/market_chart. */
async function fetchCoinGeckoCoinMarketChartById(
	geckoId: string,
	{ vsCurrency = 'usd', days = 1, interval, precision }: FetchCoinGeckoCoinMarketChartByIdOptions = {}
): Promise<CgMarketChartResponse | null> {
	if (!geckoId) return null

	const url = createCoinGeckoUrl(`/coins/${encodeURIComponent(geckoId)}/market_chart`)
	setQueryParam(url, 'vs_currency', vsCurrency)
	setQueryParam(url, 'days', days)
	setQueryParam(url, 'interval', interval)
	setQueryParam(url, 'precision', precision)

	return fetchCoinGeckoJson<CgMarketChartResponse>(url.pathname, url).catch(() => null)
}

interface LlamaCoinsChartResponse {
	coins?: Record<string, { prices?: Array<{ timestamp: number; price: number }> }>
}

async function fetchLlamaPricesFallback(geckoId: string, fullChart: boolean): Promise<Array<[number, number]> | null> {
	const startUnix = dayjs().subtract(1, 'year').startOf('day').unix()
	const url = `${COINS_CHART_API}/coingecko:${encodeURIComponent(geckoId)}?start=${startUnix}&span=${
		fullChart ? '1000' : '365'
	}`
	const response = await fetchJson<LlamaCoinsChartResponse>(url).catch(() => null)
	const series = response?.coins?.[`coingecko:${geckoId}`]?.prices
	if (!series?.length) return null
	return series.map((point) => [point.timestamp * 1000, point.price] as [number, number])
}

async function fetchCgChartFresh(geckoId: string, fullChart: boolean): Promise<CgChartResponse['data'] | null> {
	const [marketChart, coinData] = await Promise.all([
		fetchCoinGeckoCoinMarketChartById(geckoId, {
			vsCurrency: 'usd',
			days: fullChart ? 'max' : 365
		}),
		fetchCoinGeckoCoinById(geckoId)
	])

	let prices: Array<[number, number]> | undefined = marketChart?.prices
	if (!prices) {
		const llamaPrices = await fetchLlamaPricesFallback(geckoId, fullChart)
		if (llamaPrices) prices = llamaPrices
	}

	if (!prices) return null

	return {
		prices,
		mcaps: marketChart?.market_caps,
		volumes: marketChart?.total_volumes,
		coinData: coinData as CgChartResponse['data']['coinData']
	}
}

export async function getCachedCgChartData(
	geckoId: string,
	fullChart: boolean
): Promise<CgChartResponse['data'] | null> {
	if (!geckoId) return null
	const cacheKey = `cgchart_${geckoId}${fullChart ? '_full' : ''}`
	const cached = await getObjectCache<CgChartResponse['data']>(cacheKey)
	if (cached?.prices) return cached

	const fresh = await fetchCgChartFresh(geckoId, fullChart)
	if (fresh?.prices) {
		await setObjectCache(cacheKey, fresh, CG_CHART_CACHE_TTL_SECONDS)
	}
	return fresh
}

export async function fetchCoinGeckoChartByIdWithCacheFallback(
	geckoId: string,
	{ fullChart = true }: { fullChart?: boolean } = {}
): Promise<CgChartResponse | null> {
	if (!geckoId) return null

	if (typeof window === 'undefined') {
		const data = await getCachedCgChartData(geckoId, fullChart)
		return data ? { data } : null
	}

	const url = new URL(`${CG_CHART_LOCAL_API_PATH}/${encodeURIComponent(geckoId)}`, window.location.origin)
	if (fullChart) url.searchParams.set('fullChart', 'true')
	const response = await fetchJson<CgChartResponse>(url.toString()).catch(() => null)
	return response?.data?.prices ? response : null
}

/**
 * Fetch the current token price for a CoinGecko id through the DefiLlama prices API.
 * This is keyed by CoinGecko id but is not a direct CoinGecko HTTP request.
 */
export async function fetchCoinPriceByCoinGeckoIdViaLlamaPrices(geckoId: string) {
	if (!geckoId) return null
	const prices = await fetchCoinPrices([`coingecko:${geckoId}`])
	return prices[`coingecko:${geckoId}`] ?? null
}

/**
 * Fetch price, market cap, and volume history for a CoinGecko id to use as a denomination overlay.
 * This uses the same cache-first chart path as `fetchCoinGeckoChartByIdWithCacheFallback`.
 */
export async function fetchDenominationPriceHistoryByCoinGeckoId(geckoId: string): Promise<DenominationPriceHistory> {
	const chart = await fetchCoinGeckoChartByIdWithCacheFallback(geckoId)
	const data = chart?.data

	const prices = Array.isArray(data?.prices) ? data.prices : []
	const mcaps = Array.isArray(data?.mcaps) ? data.mcaps : []
	const volumes = Array.isArray(data?.volumes) ? data.volumes : []

	return prices.length > 0 ? { prices, mcaps, volumes } : { prices: [], mcaps: [], volumes: [] }
}
