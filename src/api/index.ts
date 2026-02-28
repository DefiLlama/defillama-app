import { CACHE_SERVER, COINS_SERVER_URL, CONFIG_API, DATASETS_SERVER_URL, SERVER_URL } from '~/constants'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { runBatchPromises } from '~/utils/batchPromises'
import type {
	CgMarketsQueryParams,
	CgChartResponse,
	CgMarketChartResponse,
	ChainGeckoPair,
	CoinsChartResponse,
	CoinMcapsResponse,
	CoinsPricesResponse,
	DenominationPriceHistory,
	GeckoIdResponse,
	IResponseCGMarketsAPI,
	LlamaConfigResponse,
	PriceObject,
	ProtocolLiquidityToken,
	ProtocolTokenLiquidityChart,
	TwitterPostsResponse
} from './types'

const COINGECKO_MARKETS_API_BASE = 'https://api.coingecko.com/api/v3/coins/markets'
const COINGECKO_CONTRACTS_API_BASE = 'https://api.coingecko.com/api/v3/coins'
const COINGECKO_MARKET_CHART_API_BASE = 'https://api.coingecko.com/api/v3/coins'
const TOKEN_LIST_API_URL = `${DATASETS_SERVER_URL}/tokenlist/sorted.json`
const CG_CHART_CACHE_URL = `${CACHE_SERVER}/cgchart`
const COINS_MCAPS_API_URL = 'https://coins.llama.fi/mcaps' // pro api does not support this endpoint
const COINS_CHART_API_URL = `${COINS_SERVER_URL}/chart`
const COINS_PRICES_API_URL = `${COINS_SERVER_URL}/prices`
const TWITTER_POSTS_API_V2_URL = `${SERVER_URL}/twitter/user`
const TOKEN_LIQUIDITY_API_URL = `${SERVER_URL}/historicalLiquidity`
const LIQUIDITY_API_URL = `${DATASETS_SERVER_URL}/liquidity.json`

// ---------------------------------------------------------------------------
// CoinGecko queries
// ---------------------------------------------------------------------------

function isCGMarketsApiItem(value: unknown): value is IResponseCGMarketsAPI {
	if (typeof value !== 'object' || value === null) return false
	const item = value as Partial<IResponseCGMarketsAPI>
	return typeof item.id === 'string' && typeof item.symbol === 'string' && typeof item.name === 'string'
}

/** Fetch the full sorted token list from the DefiLlama datasets mirror. */
export async function fetchAllCGTokensList(): Promise<Array<IResponseCGMarketsAPI>> {
	const data = await fetchJson<unknown>(TOKEN_LIST_API_URL)
	if (!Array.isArray(data)) {
		throw new Error(`[fetchAllCGTokensList] Expected array response from ${TOKEN_LIST_API_URL}`)
	}

	const validTokens = data.filter(isCGMarketsApiItem)
	const malformedCount = data.length - validTokens.length
	if (malformedCount > 0) {
		postRuntimeLogs(
			`[fetchAllCGTokensList] Skipped ${malformedCount} malformed token entries from ${TOKEN_LIST_API_URL}`
		)
	}

	return validTokens
}

/** Fetch a single page from the CoinGecko /coins/markets endpoint. */
export async function fetchCGMarketsPage({
	page,
	vsCurrency = 'usd',
	order = 'market_cap_desc',
	perPage = 100
}: CgMarketsQueryParams): Promise<Array<IResponseCGMarketsAPI>> {
	const url = new URL(COINGECKO_MARKETS_API_BASE)
	url.searchParams.set('vs_currency', vsCurrency)
	url.searchParams.set('order', order)
	url.searchParams.set('per_page', String(perPage))
	url.searchParams.set('page', String(page))

	const requestUrl = url.toString()
	const data = await fetchJson<unknown>(requestUrl)
	if (!Array.isArray(data)) {
		throw new Error(`[fetchCGMarketsPage] Expected array response from ${requestUrl}`)
	}

	const validTokens = data.filter(isCGMarketsApiItem)
	const malformedCount = data.length - validTokens.length
	if (malformedCount > 0) {
		postRuntimeLogs(`[fetchCGMarketsPage] Skipped ${malformedCount} malformed token entries from ${requestUrl}`)
	}

	return validTokens
}

/**
 * Resolve a CoinGecko ID from a "chain:address" string.
 * Returns `{ id: address }` directly when the chain is "coingecko".
 */
export async function fetchGeckoIdByAddress(addressData: string): Promise<GeckoIdResponse | null> {
	const [chain, address] = addressData.split(':')
	if (!chain || !address || address === '-') return null

	if (chain === 'coingecko') {
		return { id: address }
	}

	return fetchJson<GeckoIdResponse>(`${COINGECKO_CONTRACTS_API_BASE}/${chain}/contract/${address}`).catch(() => null)
}

/**
 * Fetch CoinGecko chart data (prices, mcaps, volumes, coinData) for a token.
 * Tries the DefiLlama cache first, falls back to CoinGecko's market_chart API.
 */
export async function fetchCgChartByGeckoId(
	geckoId: string,
	{ fullChart = true }: { fullChart?: boolean } = {}
): Promise<CgChartResponse | null> {
	if (!geckoId) return null
	const cacheUrl = new URL(`${CG_CHART_CACHE_URL}/${geckoId}`)
	if (fullChart) cacheUrl.searchParams.set('fullChart', 'true')
	const cached = await fetchJson<CgChartResponse>(cacheUrl.toString()).catch(() => null)
	if (cached?.data?.prices) return cached
	const fallbackUrl = new URL(`${COINGECKO_MARKET_CHART_API_BASE}/${geckoId}/market_chart`)
	fallbackUrl.searchParams.set('vs_currency', 'usd')
	fallbackUrl.searchParams.set('days', '365')
	const fallback = await fetchJson<CgMarketChartResponse>(fallbackUrl.toString()).catch(() => null)
	if (!fallback) return null
	return {
		data: {
			prices: fallback.prices,
			mcaps: fallback.market_caps,
			volumes: fallback.total_volumes
		}
	}
}

/** Fetch current price for a single token via the coins.llama.fi prices API. */
export async function fetchTokenPriceByGeckoId(geckoId: string): Promise<PriceObject | null> {
	if (!geckoId) return null
	const prices = await fetchCoinPrices([`coingecko:${geckoId}`])
	return prices[`coingecko:${geckoId}`] ?? null
}

/** Fetch price/mcap/volume history for use as a denomination overlay (e.g. ETH-denominated charts). */
export async function fetchDenominationPriceHistory(geckoId: string): Promise<DenominationPriceHistory> {
	const res = await fetchCgChartByGeckoId(geckoId)
	const data = res?.data

	const prices = Array.isArray(data?.prices) ? (data.prices as Array<[number, number]>) : []
	const mcaps = Array.isArray(data?.mcaps) ? (data.mcaps as Array<[number, number]>) : []
	const volumes = Array.isArray(data?.volumes) ? (data.volumes as Array<[number, number]>) : []

	return prices.length > 0 ? { prices, mcaps, volumes } : { prices: [], mcaps: [], volumes: [] }
}

// ---------------------------------------------------------------------------
// DefiLlama Coins API queries
// ---------------------------------------------------------------------------

/** Fetch the global DefiLlama protocol/chain config (chainCoingeckoIds, etc.). */
export async function fetchLlamaConfig(): Promise<LlamaConfigResponse> {
	return fetchJson<LlamaConfigResponse>(CONFIG_API)
}

/** Fetch market caps for a list of chains, batched in groups of 10. */
export async function fetchChainMcaps(chains: Array<ChainGeckoPair>): Promise<Record<string, number | null>> {
	if (chains.length === 0) {
		return {}
	}

	const validChains: Array<ChainGeckoPair> = chains
		.filter(([_, geckoId]) => geckoId != null && geckoId !== '')
		.map(([chain, geckoId]) => [chain, geckoId])

	if (validChains.length === 0) {
		return {}
	}

	const batchSize = 10
	const batches: Array<Array<ChainGeckoPair>> = []
	for (let i = 0; i < validChains.length; i += batchSize) {
		batches.push(validChains.slice(i, i + batchSize))
	}

	const batchResults = await runBatchPromises(
		batches,
		(batch) =>
			fetchJson<CoinMcapsResponse>(COINS_MCAPS_API_URL, {
				method: 'POST',
				body: JSON.stringify({
					coins: batch.map(([_, geckoId]) => `coingecko:${geckoId}`)
				})
			}),
		(batch, err) => {
			postRuntimeLogs(
				`Failed to fetch mcaps for batch (${batch.map(([_, geckoId]) => geckoId).join(', ')}): ${
					err instanceof Error ? err.message : String(err)
				}`
			)
			return {}
		}
	)

	const mergedMcaps: CoinMcapsResponse = {}
	for (const batchResult of batchResults) {
		Object.assign(mergedMcaps, batchResult)
	}

	return validChains.reduce<Record<string, number | null>>((acc, [chain, geckoId]) => {
		const prefixedGeckoId = `coingecko:${geckoId}`
		if (mergedMcaps[prefixedGeckoId]) {
			acc[chain] = mergedMcaps[prefixedGeckoId]?.mcap ?? null
		}
		return acc
	}, {})
}

/** Fetch current prices for a list of coin identifiers, batched in groups of 10. */
export async function fetchCoinPrices(
	coins: Array<string>,
	options?: { searchWidth?: string }
): Promise<Record<string, PriceObject>> {
	if (coins.length === 0) {
		return {}
	}

	const batchSize = 10
	const batches: Array<Array<string>> = []
	for (let i = 0; i < coins.length; i += batchSize) {
		batches.push(coins.slice(i, i + batchSize))
	}

	const batchResults = await runBatchPromises(
		batches,
		async (batch) => {
			const searchParams = new URLSearchParams()
			if (options?.searchWidth) searchParams.set('searchWidth', options.searchWidth)
			const queryString = searchParams.toString()
			const url = `${COINS_PRICES_API_URL}/current/${batch.join(',')}${queryString ? `?${queryString}` : ''}`
			const response = await fetchJson<CoinsPricesResponse>(url)
			return response.coins ?? {}
		},
		(batch, err) => {
			postRuntimeLogs(
				`Failed to fetch prices for batch: ${batch.join(', ')} (searchWidth=${options?.searchWidth ?? 'default'})`
			)
			postRuntimeLogs(err instanceof Error ? err.message : String(err))
			return {}
		}
	)

	const mergedPrices: Record<string, PriceObject | undefined> = {}
	for (const batchResult of batchResults) {
		Object.assign(mergedPrices, batchResult)
	}

	return coins.reduce<Record<string, PriceObject>>((acc, coin) => {
		const val = mergedPrices[coin]
		if (val !== undefined) acc[coin] = val
		return acc
	}, {})
}

/** Fetch historical price chart for a single coin from the coins.llama.fi chart API. */
export async function fetchCoinsChart(params: {
	coin: string
	start: number
	span: number
	searchWidth?: string
}): Promise<CoinsChartResponse> {
	const { coin, start, span, searchWidth } = params
	if (!coin || !Number.isFinite(start) || !Number.isFinite(span) || span <= 0) return { coins: {} }

	const searchParams = new URLSearchParams({
		start: String(start),
		span: String(span)
	})
	if (searchWidth) searchParams.set('searchWidth', searchWidth)

	return fetchJson<CoinsChartResponse>(`${COINS_CHART_API_URL}/${encodeURIComponent(coin)}?${searchParams.toString()}`)
}

// ---------------------------------------------------------------------------
// Protocol & social queries
// ---------------------------------------------------------------------------

/** Fetch recent Twitter/X posts for a given username. */
export async function fetchTwitterPostsByUsername(username: string): Promise<TwitterPostsResponse | null> {
	if (!username) return null
	return fetchJson<TwitterPostsResponse>(`${TWITTER_POSTS_API_V2_URL}/${encodeURIComponent(username)}`).catch(
		() => null
	)
}

/** Fetch the list of all protocols that have liquidity data available. */
export async function fetchProtocolLiquidityTokens(): Promise<ProtocolLiquidityToken[]> {
	return fetchJson<ProtocolLiquidityToken[]>(LIQUIDITY_API_URL)
}

/** Fetch historical liquidity chart for a specific token. */
export async function fetchProtocolTokenLiquidityChart(tokenId: string): Promise<ProtocolTokenLiquidityChart | null> {
	if (!tokenId) return null
	const encodedTokenId = encodeURIComponent(tokenId.replaceAll('#', '$'))
	return fetchJson<ProtocolTokenLiquidityChart>(`${TOKEN_LIQUIDITY_API_URL}/${encodedTokenId}`).catch(() => null)
}
