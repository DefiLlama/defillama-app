import { CACHE_SERVER, COINS_MCAPS_API, COINS_PRICES_API, CONFIG_API, TOKEN_LIST_API } from '~/constants'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import type { IResponseCGMarketsAPI } from './types'

export async function retryCoingeckoRequest<T>(func: () => Promise<T>, retries: number): Promise<T | null> {
	for (let i = 0; i < retries; i++) {
		try {
			const resp = await func()
			return resp
		} catch {
			if ((i + 1) % 3 === 0 && retries > 3) {
				await new Promise((resolve) => setTimeout(resolve, 10e3))
			}
			continue
		}
	}
	return null
}

function isCGMarketsApiItem(value: unknown): value is IResponseCGMarketsAPI {
	if (typeof value !== 'object' || value === null) return false
	const item = value as Partial<IResponseCGMarketsAPI>
	return typeof item.id === 'string' && typeof item.symbol === 'string' && typeof item.name === 'string'
}

export async function getAllCGTokensList(): Promise<Array<IResponseCGMarketsAPI>> {
	const data = await fetchJson<unknown>(TOKEN_LIST_API)
	if (!Array.isArray(data)) {
		throw new Error(`[getAllCGTokensList] Expected array response from ${TOKEN_LIST_API}`)
	}

	const validTokens = data.filter(isCGMarketsApiItem)
	const malformedCount = data.length - validTokens.length
	if (malformedCount > 0) {
		postRuntimeLogs(
			`[getAllCGTokensList] Skipped ${malformedCount} malformed token entries from ${TOKEN_LIST_API}`
		)
	}

	return validTokens
}

interface LlamaConfigResponse {
	chainCoingeckoIds: Record<
		string,
		{
			symbol?: string
			stablecoins?: string[]
			parent?: {
				chain: string
				types: string[]
			}
		}
	>
}

export async function fetchLlamaConfig(): Promise<LlamaConfigResponse> {
	return fetchJson<LlamaConfigResponse>(CONFIG_API)
}

//:00 -> adapters start running, they take up to 15mins
//:20 -> storeProtocols starts running, sets cache expiry to :21 of next hour
//:22 -> we rebuild all pages
export function maxAgeForNext(minutesForRollover: number[] = [22]) {
	// minutesForRollover is an array of minutes in the hour that we want to revalidate
	const now = new Date()
	const currentMinute = now.getMinutes()
	const currentSecond = now.getSeconds()
	const nextMinute = minutesForRollover.find((m) => m > currentMinute) ?? Math.min(...minutesForRollover) + 60
	const maxAge = nextMinute * 60 - currentMinute * 60 - currentSecond
	return maxAge
}

export async function fetchChainMcaps(chains: Array<[string, string]>) {
	if (chains.length === 0) {
		return {}
	}

	// Filter out chains without gecko_id
	const validChains: Array<[string, string]> = chains
		.filter(([_, geckoId]) => geckoId != null && geckoId !== '')
		.map(([chain, geckoId]) => [chain, geckoId])

	if (validChains.length === 0) {
		return {}
	}

	// Split chains into batches of 10
	const batchSize = 10
	const batches: Array<readonly [string, string][]> = []
	for (let i = 0; i < validChains.length; i += batchSize) {
		batches.push(validChains.slice(i, i + batchSize))
	}

	// Fetch mcaps for each batch
	const batchPromises = batches.map(async (batch) => {
		try {
			const response = await fetchJson(COINS_MCAPS_API, {
				method: 'POST',
				body: JSON.stringify({
					coins: batch.map(([_, geckoId]) => `coingecko:${geckoId}`)
				})
			})
			return response
		} catch (err) {
			postRuntimeLogs(
				`Failed to fetch mcaps for batch (${batch.map(([_, geckoId]) => geckoId).join(', ')}): ${
					err instanceof Error ? err.message : String(err)
				}`
			)
			return {}
		}
	})

	// Wait for all batches to complete
	const batchResults = await Promise.all(batchPromises)

	// Merge all results into a single object
	const mergedMcaps: Record<string, { mcap?: number | null }> = {}
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

type PriceObject = {
	confidence: number
	decimals: number
	price: number
	symbol: string
	timestamp: number
}

export async function fetchCoinPrices(coins: Array<string>) {
	if (coins.length === 0) {
		return {}
	}

	// Split chains into batches of 10
	const batchSize = 10
	const batches = []
	for (let i = 0; i < coins.length; i += batchSize) {
		batches.push(coins.slice(i, i + batchSize))
	}

	// Fetch prices for each batch
	const batchPromises = batches.map(async (batch) => {
		try {
			const response = await fetchJson<{ coins?: Record<string, PriceObject | undefined> }>(
				`${COINS_PRICES_API}/current/${batch.join(',')}`
			)
			return response.coins ?? {}
		} catch (err) {
			postRuntimeLogs(`Failed to fetch prices for batch: ${batch.join(', ')}`)
			postRuntimeLogs(err)
			return {}
		}
	})

	// Wait for all batches to complete
	const batchResults = await Promise.all(batchPromises)

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

type TokenMarketData = {
	price: number | null
	prevPrice: number | null
	priceChangePercent: number | null
	mcap: number | null
	volume24h: number | null
	circSupply: number | null
	maxSupply: number | null
	maxSupplyInfinite: boolean | null
}

type CgChartResponse = {
	data?: {
		coinData?: {
			market_data?: {
				circulating_supply?: number
				max_supply?: number
				max_supply_infinite?: boolean
			}
		}
		prices?: Array<[number, number]>
		mcaps?: Array<[number, number]>
		volumes?: Array<[number, number]>
	}
}

export async function getTokenMarketDataFromCgChart(geckoId: string): Promise<TokenMarketData | null> {
	if (!geckoId) return null

	const res = await fetchJson<CgChartResponse>(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).catch(() => null)
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
