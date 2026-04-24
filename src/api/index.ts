import {
	COINS_SERVER_URL,
	CONFIG_API,
	DATASETS_SERVER_URL,
	SEARCH_API_TOKEN,
	SEARCH_API_URL,
	SERVER_URL
} from '~/constants'
import { fetchJson, formatRuntimeLog, postRuntimeLogs } from '~/utils/async'
import { runBatchPromises } from '~/utils/batchPromises'
import { getErrorMessage } from '~/utils/error'
import type {
	CoinsChartResponse,
	CoinsPricesResponse,
	LlamaConfigResponse,
	PriceObject,
	ProtocolLiquidityTokensResponse,
	ProtocolLlamaswapDataset,
	ProtocolTokenLiquidityChart,
	SearchQuery,
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

const COINS_CHART_API_URL = `${COINS_SERVER_URL}/chart`
const COINS_PRICES_API_URL = `${COINS_SERVER_URL}/prices`
const TOKEN_LIQUIDITY_API_URL = `${SERVER_URL}/historicalLiquidity`
const LIQUIDITY_API_URL = `${DATASETS_SERVER_URL}/liquidity.json`
const PROTOCOL_LLAMASWAP_API_URL = 'https://llamaswap.github.io/protocol-liquidity'
// DefiLlama Coins API queries
// ---------------------------------------------------------------------------

/** Fetch the global DefiLlama protocol/chain config (chainCoingeckoIds, etc.). */
export async function fetchLlamaConfig(): Promise<LlamaConfigResponse> {
	return fetchJson<LlamaConfigResponse>(CONFIG_API)
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
				formatRuntimeLog({
					event: 'fetchCoinPrices',
					level: 'error',
					status: 'batch-failed',
					target: `${COINS_PRICES_API_URL}/current`,
					context: { coins: batch, searchWidth: options?.searchWidth ?? 'default' },
					message: getErrorMessage(err)
				}),
				{ level: 'error' }
			)
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
// Protocol queries
// ---------------------------------------------------------------------------

/** Fetch the list of all protocols that have liquidity data available. */
export async function fetchLiquidityTokensDatasetFromNetwork(): Promise<ProtocolLiquidityTokensResponse> {
	return fetchJson<ProtocolLiquidityTokensResponse>(LIQUIDITY_API_URL)
}

/** Fetch the list of all protocols that have liquidity data available. */
export async function fetchLiquidityTokensDataset(): Promise<ProtocolLiquidityTokensResponse> {
	return fetchLiquidityTokensDatasetFromNetwork()
}

export async function fetchLiquidityDatasetEntryByProtocolId(
	protocolId: string
): Promise<ProtocolLiquidityTokensResponse[number] | null> {
	if (!protocolId) {
		return null
	}

	const data = await fetchLiquidityTokensDataset()
	return data.find((entry) => entry.id === protocolId) ?? null
}

/** Fetch the full GitHub Pages LlamaSwap protocol-liquidity dataset keyed by CoinGecko ID. */
export async function fetchProtocolLlamaswapDataset(): Promise<ProtocolLlamaswapDataset> {
	return fetchJson<ProtocolLlamaswapDataset>(PROTOCOL_LLAMASWAP_API_URL)
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
