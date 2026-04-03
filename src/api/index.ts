import {
	COINS_SERVER_URL,
	CONFIG_API,
	DATASETS_SERVER_URL,
	SEARCH_API_TOKEN,
	SEARCH_API_URL,
	SERVER_URL
} from '~/constants'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { runBatchPromises } from '~/utils/batchPromises'
import { getErrorMessage } from '~/utils/error'
import { normalizeProtocolLlamaswapChains } from '~/utils/llamaswapChains'
import type { IProtocolLlamaswapChain as BuyOnLlamaswapChain } from '~/utils/metadata/types'
import type {
	ChainGeckoPair,
	CoinsChartResponse,
	CoinMcapsResponse,
	CoinsPricesResponse,
	ProtocolLlamaswapDataset,
	ProtocolLlamaswapEntry,
	LlamaConfigResponse,
	PriceObject,
	ProtocolLiquidityTokensResponse,
	ProtocolTokenLiquidityChart,
	SearchQuery,
	TwitterPostsResponse,
	BlockExplorersResponse
} from './types'

// ---------------------------------------------------------------------------
// DefiLlama multi-search API
// ---------------------------------------------------------------------------

/** Generic search API helper for the DefiLlama multi-search endpoint. */
export async function searchApi<T = Record<string, unknown>>(query: SearchQuery): Promise<Array<T>> {
	return fetchJson(SEARCH_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${SEARCH_API_TOKEN}`
		},
		body: JSON.stringify({ queries: [query] })
	}).then((res) => res?.results?.[0]?.hits ?? [])
}

// ---------------------------------------------------------------------------
// Shared APIs
// ---------------------------------------------------------------------------

const COINS_MCAPS_API_URL = 'https://coins.llama.fi/mcaps' // pro api does not support this endpoint
const COINS_CHART_API_URL = `${COINS_SERVER_URL}/chart`
const COINS_PRICES_API_URL = `${COINS_SERVER_URL}/prices`
const TWITTER_POSTS_API_V2_URL = `${SERVER_URL}/twitter/user`
const TOKEN_LIQUIDITY_API_URL = `${SERVER_URL}/historicalLiquidity`
const LIQUIDITY_API_URL = `${DATASETS_SERVER_URL}/liquidity.json`
const PROTOCOL_LLAMASWAP_API_URL = 'https://llamaswap.github.io/protocol-liquidity'
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
				`Failed to fetch mcaps for batch (${batch.map(([_, geckoId]) => geckoId).join(', ')}): ${getErrorMessage(err)}`
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
			postRuntimeLogs(getErrorMessage(err))
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
export async function fetchLiquidityTokensDataset(): Promise<ProtocolLiquidityTokensResponse> {
	return fetchJson<ProtocolLiquidityTokensResponse>(LIQUIDITY_API_URL)
}

/** Fetch the full GitHub Pages LlamaSwap protocol-liquidity dataset keyed by CoinGecko ID. */
export async function fetchProtocolLlamaswapDataset(): Promise<ProtocolLlamaswapDataset> {
	return fetchJson<ProtocolLlamaswapDataset>(PROTOCOL_LLAMASWAP_API_URL)
}

/** Fetch LlamaSwap-supported chains for a protocol token by CoinGecko ID. */
export async function fetchProtocolLlamaswapChainsByGeckoId(geckoId: string): Promise<BuyOnLlamaswapChain[] | null> {
	if (!geckoId) return null

	return fetchJson<ProtocolLlamaswapEntry>(`${PROTOCOL_LLAMASWAP_API_URL}/${encodeURIComponent(geckoId)}.json`)
		.then((data) => normalizeProtocolLlamaswapChains(data))
		.catch(() => null)
}

/** Fetch historical liquidity chart for a specific token. */
export async function fetchProtocolTokenLiquidityChart(tokenId: string): Promise<ProtocolTokenLiquidityChart | null> {
	if (!tokenId) return null
	const encodedTokenId = encodeURIComponent(tokenId.replaceAll('#', '$'))
	return fetchJson<ProtocolTokenLiquidityChart>(`${TOKEN_LIQUIDITY_API_URL}/${encodedTokenId}`).catch(() => null)
}

// ---------------------------------------------------------------------------
// Block Explorers
// ---------------------------------------------------------------------------

const BLOCK_EXPLORERS_API_URL = `${DATASETS_SERVER_URL}/blockExplorers.json`

/** Fetch block explorer URLs for all chains from the datasets server. */
export async function fetchBlockExplorers(): Promise<BlockExplorersResponse> {
	return fetchJson<BlockExplorersResponse>(BLOCK_EXPLORERS_API_URL)
}
