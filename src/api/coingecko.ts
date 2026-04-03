import { CACHE_SERVER, COINGECKO_KEY, DATASETS_SERVER_URL } from '~/constants'
import { LLAMASWAP_CHAINS } from '~/constants/chains'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import type {
	CgChartResponse,
	CgMarketChartResponse,
	CoinGeckoCoinByContractAddressResponse,
	CoinGeckoCoinDetailBody,
	CoinGeckoCoinDetailResultForOptions,
	CoinGeckoCoinDetailResponseForOptions,
	CoinGeckoCoinTickerWithDepth,
	CoinGeckoCoinTickersResponseForOptions,
	CoinGeckoCoinTickersResultForOptions,
	CoinGeckoDerivativeExchange,
	CoinGeckoExchange,
	CoinGeckoSimplePriceResponse,
	DenominationPriceHistory,
	FetchCoinGeckoCoinByIdOptions,
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
const CG_CHART_CACHE_URL = `${CACHE_SERVER}/cgchart`
const COINGECKO_EXCHANGES_MAX_PAGE_SIZE = 250
const COINGECKO_TICKERS_PAGE_SIZE = 100
const EVM_HEX_ADDRESS_RE = /^0x[a-fA-F0-9]+$/

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
	breakOnPartialPage = true
}: {
	fetchPage: (page: number) => Promise<T[]>
	pageSize: number
	breakOnPartialPage?: boolean
}): Promise<T[]> {
	const results: T[] = []

	for (let page = 1; ; page++) {
		const pageItems = await fetchPage(page)
		if (pageItems.length === 0) break

		results.push(...pageItems)

		if (breakOnPartialPage && pageItems.length < pageSize) break
	}

	return results
}

function isCGMarketsApiItem(value: unknown): value is IResponseCGMarketsAPI {
	if (typeof value !== 'object' || value === null) return false
	const item = value as Partial<IResponseCGMarketsAPI>
	return typeof item.id === 'string' && typeof item.symbol === 'string' && typeof item.name === 'string'
}

function normalizeCoinGeckoTickerTokenRef(value: string): string {
	const tokenRef = value.trim()
	if (EVM_HEX_ADDRESS_RE.test(tokenRef)) return tokenRef.toLowerCase()
	return tokenRef
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
	const malformedCount = data.length - validTokens.length
	if (malformedCount > 0) {
		postRuntimeLogs(
			`[fetchCoinGeckoTokensListFromDataset] Skipped ${malformedCount} malformed token entries from ${TOKEN_LIST_API_URL}`
		)
	}

	return validTokens
}

/**
 * Fetch all pages from CoinGecko GET /exchanges.
 * This endpoint documents `page` and `per_page`, so callers receive the combined result set.
 */
export async function fetchCoinGeckoExchanges({
	perPage = COINGECKO_EXCHANGES_MAX_PAGE_SIZE
}: FetchCoinGeckoExchangesOptions = {}): Promise<CoinGeckoExchange[]> {
	const pageSize = Math.min(Math.max(1, perPage), COINGECKO_EXCHANGES_MAX_PAGE_SIZE)

	return fetchAllPaginatedCoinGeckoResults<CoinGeckoExchange>({
		pageSize,
		fetchPage: async (page) => {
			const url = createCoinGeckoUrl('/exchanges')
			setQueryParam(url, 'per_page', pageSize)
			setQueryParam(url, 'page', page)
			return fetchCoinGeckoJson<CoinGeckoExchange[]>(url.pathname, url)
		}
	})
}

/**
 * Fetch all pages from CoinGecko GET /derivatives/exchanges.
 * The docs expose `page` and `per_page`, so pagination is handled internally here.
 */
export async function fetchCoinGeckoDerivativesExchanges({
	order,
	perPage = 100
}: FetchCoinGeckoDerivativesExchangesOptions = {}): Promise<CoinGeckoDerivativeExchange[]> {
	const pageSize = Math.max(1, perPage)

	return fetchAllPaginatedCoinGeckoResults<CoinGeckoDerivativeExchange>({
		pageSize,
		breakOnPartialPage: false,
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
 * From a CoinGecko ticker list, aggregate `converted_volume.usd` for each `platforms` entry where
 * a ticker row's `base` or `target` equals that chain's contract address.
 */
function parseCoinGeckoCoinChainsByTickerVolume(
	coin: Pick<CoinGeckoCoinDetailBody, 'platforms'> & { tickers?: CoinGeckoCoinTickerWithDepth[] }
): Array<{ chain: string; address: string }> {
	const platforms = coin.platforms
	if (!platforms || Object.keys(platforms).length === 0) return []
	const tickers = coin.tickers
	if (!tickers?.length) return []

	const rows: Array<{ chain: string; address: string; norm: string; volumeUsd: number }> = []
	for (const [chain, address] of Object.entries(platforms)) {
		const trimmed = address?.trim()
		if (!trimmed) continue
		rows.push({
			chain,
			address: trimmed,
			norm: normalizeCoinGeckoTickerTokenRef(trimmed),
			volumeUsd: 0
		})
	}

	if (rows.length === 0) return []

	for (const ticker of tickers) {
		const volumeUsd = Number(ticker.converted_volume?.usd) || 0
		const base = ticker.base ? normalizeCoinGeckoTickerTokenRef(String(ticker.base)) : ''
		const target = ticker.target ? normalizeCoinGeckoTickerTokenRef(String(ticker.target)) : ''

		for (const row of rows) {
			if (base === row.norm || target === row.norm) row.volumeUsd += volumeUsd
		}
	}

	rows.sort((a, b) => b.volumeUsd - a.volumeUsd)

	return rows
		.map(({ chain, address }) => {
			const llamaswapChain = LLAMASWAP_CHAINS.find((candidate) => candidate.gecko === chain)
			if (!llamaswapChain) return null
			return {
				chain: llamaswapChain.llamaswap,
				address
			}
		})
		.filter((chain): chain is { chain: string; address: string } => chain !== null)
}

/**
 * Fetch all pages from CoinGecko GET /coins/{id}/tickers.
 * CoinGecko documents this endpoint as paginated to 100 rows, so the module combines every page.
 */
async function fetchCoinGeckoCoinTickersById<
	TOptions extends FetchCoinGeckoCoinTickersByIdOptions | undefined = undefined
>(geckoId: string, options?: TOptions): Promise<CoinGeckoCoinTickersResultForOptions<TOptions>> {
	if (!geckoId) return {} as CoinGeckoCoinTickersResultForOptions<TOptions>

	try {
		const tickers: Array<
			CoinGeckoCoinTickersResponseForOptions<TOptions>['tickers'] extends Array<infer T> ? T : never
		> = []
		let name: string | undefined

		for (let page = 1; ; page++) {
			const url = createCoinGeckoUrl(`/coins/${encodeURIComponent(geckoId)}/tickers`)
			setQueryParam(url, 'exchange_ids', options?.exchangeIds)
			setQueryParam(url, 'include_exchange_logo', options?.includeExchangeLogo)
			setQueryParam(url, 'page', page)
			setQueryParam(url, 'order', options?.order)
			setQueryParam(url, 'depth', options?.depth)
			setQueryParam(url, 'dex_pair_format', options?.dexPairFormat)

			const response = await fetchCoinGeckoJson<CoinGeckoCoinTickersResponseForOptions<TOptions>>(url.pathname, url)
			if (!name) name = response.name
			const pageTickers = response.tickers ?? []
			if (pageTickers.length === 0) break

			tickers.push(...pageTickers)

			if (pageTickers.length < COINGECKO_TICKERS_PAGE_SIZE) break
		}

		return { name, tickers } as CoinGeckoCoinTickersResultForOptions<TOptions>
	} catch {
		return {} as CoinGeckoCoinTickersResultForOptions<TOptions>
	}
}

/**
 * Fetch the coin's platforms and all ticker pages, then map them into chain/address pairs sorted
 * by aggregate CoinGecko ticker volume.
 */
export async function fetchCoinGeckoCoinChainsByTickerVolume(
	geckoId: string
): Promise<Array<{ chain: string; address: string }>> {
	if (!geckoId) return []

	const coin = await fetchCoinGeckoCoinById(geckoId, {
		localization: false,
		tickers: false,
		marketData: false,
		communityData: false,
		developerData: false
	})
	const tickers = (await fetchCoinGeckoCoinTickersById(geckoId, {
		order: 'volume_desc',
		depth: true,
		dexPairFormat: 'contract_address'
	})) as { tickers?: CoinGeckoCoinTickerWithDepth[] }

	return parseCoinGeckoCoinChainsByTickerVolume({
		platforms: coin.platforms,
		tickers: tickers.tickers
	})
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

/**
 * Fetch chart data for a CoinGecko id, using the DefiLlama chart cache first and falling back to
 * CoinGecko GET /coins/{id}/market_chart when the cache misses.
 */
export async function fetchCoinGeckoChartByIdWithCacheFallback(
	geckoId: string,
	{ fullChart = true }: { fullChart?: boolean } = {}
): Promise<CgChartResponse | null> {
	if (!geckoId) return null

	const cacheUrl = new URL(`${CG_CHART_CACHE_URL}/${geckoId}`)
	if (fullChart) cacheUrl.searchParams.set('fullChart', 'true')

	const cached = await fetchJson<CgChartResponse>(cacheUrl.toString()).catch(() => null)
	if (cached?.data?.prices) return cached

	const fallback = await fetchCoinGeckoCoinMarketChartById(geckoId, {
		vsCurrency: 'usd',
		days: fullChart ? 'max' : 365
	})
	if (!fallback) return null

	return {
		data: {
			prices: fallback.prices,
			mcaps: fallback.market_caps,
			volumes: fallback.total_volumes
		}
	}
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
