import {
	COINS_SERVER_URL,
	CONFIG_API,
	DATASETS_SERVER_URL,
	SEARCH_API_TOKEN,
	SEARCH_API_URL,
	SERVER_URL
} from '~/constants'
import { fetchJson, getFastJsonTimeoutMs } from '~/utils/async'
import type {
	CoinsChartResponse,
	LlamaConfigResponse,
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
const TOKEN_LIQUIDITY_API_URL = `${SERVER_URL}/historicalLiquidity`
const LIQUIDITY_API_URL = `${DATASETS_SERVER_URL}/liquidity.json`
const PROTOCOL_LLAMASWAP_API_URL = 'https://llamaswap.github.io/protocol-liquidity'
// DefiLlama Coins API queries
// ---------------------------------------------------------------------------

/** Fetch the global DefiLlama protocol/chain config (chainCoingeckoIds, etc.). */
export async function fetchLlamaConfig(): Promise<LlamaConfigResponse> {
	return fetchJson<LlamaConfigResponse>(CONFIG_API)
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
	return fetchJson<BlockExplorersResponse>(BLOCK_EXPLORERS_API_URL, { timeout: getFastJsonTimeoutMs() })
}
