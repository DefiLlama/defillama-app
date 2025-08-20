import { useQuery } from '@tanstack/react-query'
import { CG_TOKEN_API, COINS_MCAPS_API, COINS_PRICES_API, TOKEN_LIST_API } from '~/constants/index'
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

export async function retryCoingeckoRequest(func, retries) {
	for (let i = 0; i < retries; i++) {
		try {
			const resp = await func()
			return resp
		} catch (e) {
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
		.map(([chain, geckoId]) => [chain, `coingecko:${geckoId}`])

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
	const mergedMcaps = {}
	batchResults.forEach((batchResult) => {
		Object.assign(mergedMcaps, batchResult)
	})

	return validChains.reduce((acc, [chain, geckoId]) => {
		if (mergedMcaps[`coingecko:${geckoId}`]) {
			acc[chain] = mergedMcaps[`coingecko:${geckoId}`]?.mcap ?? null
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
	batchResults.forEach((batchResult) => {
		Object.assign(mergedPrices, batchResult)
	})

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
