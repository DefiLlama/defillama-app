import { CACHE_SERVER, COINS_MCAPS_API, COINS_PRICES_API, CONFIG_API, TOKEN_LIST_API } from '~/constants'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { runBatchPromises } from '~/utils/batchPromises'
import type {
	CgChartResponse,
	ChainGeckoPair,
	CoinMcapsResponse,
	CoinsPricesResponse,
	DenominationPriceHistory,
	GeckoIdResponse,
	IResponseCGMarketsAPI,
	LlamaConfigResponse,
	PriceObject,
	TokenMarketData
} from './types'

function isCGMarketsApiItem(value: unknown): value is IResponseCGMarketsAPI {
	if (typeof value !== 'object' || value === null) return false
	const item = value as Partial<IResponseCGMarketsAPI>
	return typeof item.id === 'string' && typeof item.symbol === 'string' && typeof item.name === 'string'
}

export async function fetchAllCGTokensList(): Promise<Array<IResponseCGMarketsAPI>> {
	const data = await fetchJson<unknown>(TOKEN_LIST_API)
	if (!Array.isArray(data)) {
		throw new Error(`[fetchAllCGTokensList] Expected array response from ${TOKEN_LIST_API}`)
	}

	const validTokens = data.filter(isCGMarketsApiItem)
	const malformedCount = data.length - validTokens.length
	if (malformedCount > 0) {
		postRuntimeLogs(`[fetchAllCGTokensList] Skipped ${malformedCount} malformed token entries from ${TOKEN_LIST_API}`)
	}

	return validTokens
}

export async function fetchLlamaConfig(): Promise<LlamaConfigResponse> {
	return fetchJson<LlamaConfigResponse>(CONFIG_API)
}

export async function fetchChainMcaps(chains: Array<ChainGeckoPair>): Promise<Record<string, number | null>> {
	if (chains.length === 0) {
		return {}
	}

	// Filter out chains without gecko_id
	const validChains: Array<ChainGeckoPair> = chains
		.filter(([_, geckoId]) => geckoId != null && geckoId !== '')
		.map(([chain, geckoId]) => [chain, geckoId])

	if (validChains.length === 0) {
		return {}
	}

	// Split chains into batches of 10
	const batchSize = 10
	const batches: Array<Array<ChainGeckoPair>> = []
	for (let i = 0; i < validChains.length; i += batchSize) {
		batches.push(validChains.slice(i, i + batchSize))
	}

	const batchResults = await runBatchPromises(
		batches,
		(batch) =>
			fetchJson<CoinMcapsResponse>(COINS_MCAPS_API, {
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

	// Merge all results into a single object
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

export async function fetchCoinPrices(coins: Array<string>): Promise<Record<string, PriceObject>> {
	if (coins.length === 0) {
		return {}
	}

	// Split chains into batches of 10
	const batchSize = 10
	const batches: Array<Array<string>> = []
	for (let i = 0; i < coins.length; i += batchSize) {
		batches.push(coins.slice(i, i + batchSize))
	}

	const batchResults = await runBatchPromises(
		batches,
		async (batch) => {
			const response = await fetchJson<CoinsPricesResponse>(`${COINS_PRICES_API}/current/${batch.join(',')}`)
			return response.coins ?? {}
		},
		(batch, err) => {
			postRuntimeLogs(`Failed to fetch prices for batch: ${batch.join(', ')}`)
			postRuntimeLogs(err instanceof Error ? err.message : String(err))
			return {}
		}
	)

	// Merge all results into a single object
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

export async function fetchGeckoIdByAddress(addressData: string): Promise<GeckoIdResponse | null> {
	const [chain, address] = addressData.split(':')
	if (!chain || !address || address === '-') return null

	if (chain === 'coingecko') {
		return { id: address }
	}

	return fetchJson<GeckoIdResponse>(`https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}`).catch(
		() => null
	)
}

export async function fetchCgChartByGeckoId(geckoId: string): Promise<CgChartResponse | null> {
	if (!geckoId) return null
	return fetchJson<CgChartResponse>(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).catch(() => null)
}

export async function fetchTokenPriceByGeckoId(geckoId: string): Promise<PriceObject | null> {
	if (!geckoId) return null
	const prices = await fetchCoinPrices([`coingecko:${geckoId}`])
	return prices[`coingecko:${geckoId}`] ?? null
}

export async function fetchDenominationPriceHistory(geckoId: string): Promise<DenominationPriceHistory> {
	const res = await fetchCgChartByGeckoId(geckoId)
	const data = res?.data

	const prices = Array.isArray(data?.prices) ? (data.prices as Array<[number, number]>) : []
	const mcaps = Array.isArray(data?.mcaps) ? (data.mcaps as Array<[number, number]>) : []
	const volumes = Array.isArray(data?.volumes) ? (data.volumes as Array<[number, number]>) : []

	return prices.length > 0 ? { prices, mcaps, volumes } : { prices: [], mcaps: [], volumes: [] }
}

export async function getTokenMarketDataFromCgChart(geckoId: string): Promise<TokenMarketData | null> {
	if (!geckoId) return null

	const res = await fetchCgChartByGeckoId(geckoId)
	const data = res?.data
	if (!data) return null

	const marketData = data?.coinData?.market_data
	const prices = Array.isArray(data?.prices) ? (data.prices as Array<[number, number]>) : null
	const mcaps = Array.isArray(data?.mcaps) ? (data.mcaps as Array<[number, number]>) : null
	const volumes = Array.isArray(data?.volumes) ? (data.volumes as Array<[number, number]>) : null

	const lastPrice = prices?.[prices.length - 1]?.[1]
	const prevPrice = prices?.[prices.length - 2]?.[1]
	const lastMcap = mcaps?.[mcaps.length - 1]?.[1]
	const lastVolume = volumes?.[volumes.length - 1]?.[1]

	const priceChangePercent =
		typeof lastPrice === 'number' && typeof prevPrice === 'number' && prevPrice !== 0
			? +(((lastPrice - prevPrice) / prevPrice) * 100).toFixed(2)
			: null

	return {
		price: typeof lastPrice === 'number' ? lastPrice : null,
		prevPrice: typeof prevPrice === 'number' ? prevPrice : null,
		priceChangePercent,
		mcap: typeof lastMcap === 'number' ? lastMcap : null,
		volume24h: typeof lastVolume === 'number' ? lastVolume : null,
		circSupply: typeof marketData?.circulating_supply === 'number' ? marketData.circulating_supply : null,
		maxSupply: typeof marketData?.max_supply === 'number' ? marketData.max_supply : null,
		maxSupplyInfinite: typeof marketData?.max_supply_infinite === 'boolean' ? marketData.max_supply_infinite : null
	}
}
