import { useQuery } from '@tanstack/react-query'
import { CACHE_SERVER, CG_TOKEN_API, COINS_MCAPS_API, COINS_PRICES_API, CONFIG_API, TOKEN_LIST_API } from '~/constants'
import { fetchApi, fetchJson, postRuntimeLogs } from '~/utils/async'
import type { IResponseCGMarketsAPI } from './types'

function getCGMarketsDataURLs() {
	const urls: string[] = []
	const maxPage = 20
	for (let page = 1; page <= maxPage; page++) {
		urls.push(`${CG_TOKEN_API.replace('<PLACEHOLDER>', `${page}`)}`)
	}
	return urls
}

export const useFetchCoingeckoTokensList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['coingeckotokenslist'],
		queryFn: () => fetchApi(getCGMarketsDataURLs())
	})

	return {
		data: data?.flat(),
		error,
		isLoading
	}
}

export async function retryCoingeckoRequest<T>(func: () => Promise<T>, retries: number): Promise<T | {}> {
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
	return {}
}

export async function getAllCGTokensList(): Promise<Array<IResponseCGMarketsAPI>> {
	const data = await fetchJson(TOKEN_LIST_API)

	return data
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
	const currentMinute = new Date().getMinutes()
	const currentSecond = new Date().getSeconds()
	const nextMinute = minutesForRollover.find((m) => m > currentMinute) ?? Math.min(...minutesForRollover) + 60
	const maxAge = nextMinute * 60 - currentMinute * 60 - currentSecond
	return maxAge
}

export async function fetchChainMcaps(chains: Array<[string, string]>) {
	if (chains.length === 0) {
		return {}
	}

	// Filter out chains without gecko_id
	const validChains = chains
		.filter(([_, geckoId]) => geckoId != null && geckoId !== '')
		.map(([chain, geckoId]) => [chain, `coingecko:${geckoId}`] as const)

	if (validChains.length === 0) {
		return {}
	}

	// Split chains into batches of 10
	const batchSize = 10
	const batches = []
	for (let i = 0; i < validChains.length; i += batchSize) {
		batches.push(validChains.slice(i, i + batchSize))
	}

	// Fetch mcaps for each batch
	const batchPromises = batches.map(async (batch) => {
		try {
			const response = await fetchJson(COINS_MCAPS_API, {
				method: 'POST',
				body: JSON.stringify({
					coins: batch
				})
			})
			return response
		} catch (err) {
			postRuntimeLogs(`Failed to fetch mcaps for batch: ${batch.join(', ')}`)
			postRuntimeLogs(err)
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

	return validChains.reduce<Record<string, number | null>>((acc, [chain, prefixedGeckoId]) => {
		if (mergedMcaps[prefixedGeckoId]) {
			acc[chain] = mergedMcaps[prefixedGeckoId]?.mcap ?? null
		}
		return acc
	}, {})
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
			const response = await fetchJson(`${COINS_PRICES_API}/current/${batch.join(',')}`)
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
	const mergedPrices = {}
	for (const batchResult of batchResults) {
		Object.assign(mergedPrices, batchResult)
	}

	return coins.reduce(
		(acc, coin) => {
			if (mergedPrices[coin]) {
				acc[coin] = mergedPrices[coin] ?? null
			}
			return acc
		},
		{} as Record<string, PriceObject>
	)
}

type PriceObject = {
	confidence: number
	decimals: number
	price: number
	symbol: string
	timestamp: number
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

export async function getTokenMarketDataFromCgChart(geckoId: string): Promise<TokenMarketData | null> {
	if (!geckoId) return null

	const res = await fetchJson(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).catch(() => null as any)
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
