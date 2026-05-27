import { COINS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { runBatchPromises } from '~/utils/batchPromises'
import { recordRuntimeError } from '~/utils/telemetry'
import type { CoinsPricesResponse, PriceObject } from './types'

const COINS_PRICES_API_URL = `${COINS_SERVER_URL}/prices`
const COINS_PUBLIC_PRICES_API_URL = 'https://coins.llama.fi/prices'
const COINS_CURRENT_PRICES_POST_API_URL = `${COINS_SERVER_URL}/pro/prices/current`

function shouldFallbackToLegacyCurrentPricesGet(error: unknown): boolean {
	return error instanceof Error && /\[(404|405)\]/.test(error.message)
}

function canUseCurrentPricesPost(): boolean {
	return typeof window === 'undefined' && !!process.env.API_KEY
}

function getCurrentPricesGetApiUrl(): string {
	return typeof window === 'undefined' ? COINS_PRICES_API_URL : COINS_PUBLIC_PRICES_API_URL
}

async function fetchCoinPricesGetBatch(
	coins: Array<string>,
	options?: { searchWidth?: string }
): Promise<Record<string, PriceObject>> {
	const coinsPricesApiUrl = getCurrentPricesGetApiUrl()
	const legacyBatchSize = 10
	const batches: Array<Array<string>> = []
	for (let i = 0; i < coins.length; i += legacyBatchSize) {
		batches.push(coins.slice(i, i + legacyBatchSize))
	}
	const results = await Promise.all(
		batches.map(async (batch) => {
			try {
				const searchParams = new URLSearchParams()
				if (options?.searchWidth) searchParams.set('searchWidth', options.searchWidth)
				const queryString = searchParams.toString()
				const url = `${coinsPricesApiUrl}/current/${batch.join(',')}${queryString ? `?${queryString}` : ''}`
				const response = await fetchJson<CoinsPricesResponse>(url)
				return response.coins ?? {}
			} catch (err) {
				recordRuntimeError(err, 'outboundFetch', {
					target: `${coinsPricesApiUrl}/current`,
					coin_count: batch.length,
					first_coin: batch[0],
					search_width: options?.searchWidth ?? 'default'
				})
				return {}
			}
		})
	)
	return Object.assign({}, ...results)
}

async function fetchCoinPricesPostBatch(
	batch: Array<string>,
	options?: { searchWidth?: string }
): Promise<Record<string, PriceObject>> {
	const response = await fetchJson<CoinsPricesResponse>(COINS_CURRENT_PRICES_POST_API_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			coins: batch,
			...(options?.searchWidth ? { searchWidth: options.searchWidth } : {})
		})
	})
	return response.coins ?? {}
}

/** Fetch current prices for a list of coin identifiers. */
export async function fetchCoinPrices(
	coins: Array<string>,
	options?: { searchWidth?: string }
): Promise<Record<string, PriceObject>> {
	if (coins.length === 0) {
		return {}
	}

	if (!canUseCurrentPricesPost()) {
		return fetchCoinPricesGetBatch(coins, options)
	}

	const batchSize = 100000
	const batches: Array<Array<string>> = []
	for (let i = 0; i < coins.length; i += batchSize) {
		batches.push(coins.slice(i, i + batchSize))
	}

	const batchResults = await runBatchPromises(
		batches,
		async (batch) => {
			try {
				return await fetchCoinPricesPostBatch(batch, options)
			} catch (error) {
				if (shouldFallbackToLegacyCurrentPricesGet(error)) {
					return fetchCoinPricesGetBatch(batch, options)
				}
				throw error
			}
		},
		(batch, err) => {
			recordRuntimeError(err, 'outboundFetch', {
				target: COINS_CURRENT_PRICES_POST_API_URL,
				coin_count: batch.length,
				first_coin: batch[0],
				search_width: options?.searchWidth ?? 'default'
			})
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

/**
 * Fetch the current token price for a CoinGecko id through the DefiLlama prices API.
 * This is keyed by CoinGecko id but is not a direct CoinGecko HTTP request.
 */
export async function fetchCoinPriceByCoinGeckoIdViaLlamaPrices(geckoId: string): Promise<PriceObject | null> {
	if (!geckoId) return null
	const prices = await fetchCoinPrices([`coingecko:${geckoId}`])
	return prices[`coingecko:${geckoId}`] ?? null
}
