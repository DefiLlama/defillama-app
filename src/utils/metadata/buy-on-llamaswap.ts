import { fetchCoinGeckoCoinsList } from '~/api/coingecko'
import { getErrorMessage } from '~/utils/error'
import { mergeProtocolLlamaswapChains, normalizeProtocolLlamaswapChains } from '~/utils/llamaswapChains'
import {
	getSupportedCoinGeckoPlatformsForLlamaswap,
	mapSupportedCoinGeckoPlatformsToLlamaswapChains
} from '~/utils/llamaswapCoingecko'
import type { IChainMetadata, IProtocolLlamaswapChain, IProtocolMetadata, ProtocolLlamaswapMetadata } from './types'

type RawLlamaswapChain = {
	chain: string
	chainId: number
	address: string
	priceImpact: number
	liquidity?: number
}

type RawProtocolLlamaswapEntry = {
	name: string
	slug: string
	symbol: string
	geckoId: string
	chains?: Array<RawLlamaswapChain>
	updatedAt?: string
}

type RawProtocolLlamaswapDataset = Record<string, RawProtocolLlamaswapEntry>

const PROTOCOL_LLAMASWAP_API_URL = 'https://llamaswap.github.io/protocol-liquidity'
const COINGECKO_CHAIN_BATCH_SIZE = 8

function previewResponseBody(body: string, length = 200): string {
	return body.replace(/\s+/g, ' ').trim().slice(0, length)
}

function sanitizeUrlForMetadataLogs(inputUrl: string): string {
	try {
		const parsed = new URL(inputUrl)
		let pathname = parsed.pathname

		pathname = pathname.replace(/^\/[^/]+\/api(\/|$)/, '/').replace(/^\/api(\/|$)/, '/')
		pathname = pathname.replace(/^\/[^/]+\/rwa(\/|$)/, '/rwa$1')
		pathname = pathname.replace(/^\/[^/]+\/rwa-perps(\/|$)/, '/rwa-perps$1')
		pathname = pathname.replace(/^\/[^/]+\/bridges(\/|$)/, '/bridges$1')

		return `${pathname}${parsed.search}${parsed.hash}` || '/'
	} catch {
		return inputUrl
	}
}

async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init)
	const body = await res.text()
	const contentType = res.headers.get('content-type') ?? 'unknown'
	const urlToLog = sanitizeUrlForMetadataLogs(url)
	if (!res.ok) {
		throw new Error(
			`Metadata request failed for URL: ${urlToLog} (status ${res.status}). Body preview: "${previewResponseBody(body)}"`
		)
	}

	try {
		return JSON.parse(body) as T
	} catch (error) {
		throw new Error(
			`Failed to parse JSON for URL: ${urlToLog} (status ${res.status}, content-type ${contentType}). Body preview: "${previewResponseBody(
				body
			)}". Original error: ${getErrorMessage(error)}`
		)
	}
}

/** Fetch the full GitHub Pages LlamaSwap protocol-liquidity dataset keyed by CoinGecko ID. */
export async function fetchProtocolLlamaswapDataset(): Promise<RawProtocolLlamaswapDataset> {
	return fetchJson<RawProtocolLlamaswapDataset>(PROTOCOL_LLAMASWAP_API_URL)
}

async function fetchCoinGeckoCoinChainsByTickerVolume(
	geckoId: string,
	platforms: Record<string, string>
): Promise<IProtocolLlamaswapChain[]> {
	if (!geckoId) return []

	let hasPlatforms = false
	for (const _chain in platforms) {
		hasPlatforms = true
		break
	}
	if (!hasPlatforms) return []

	// Disabled the CoinGecko /coins/:id/tickers backfill and append every supported platform instead.
	return mapSupportedCoinGeckoPlatformsToLlamaswapChains(platforms)
}

function batchArray<T>(items: T[], batchSize: number): T[][] {
	const batches: T[][] = []
	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize))
	}
	return batches
}

export async function buildProtocolLlamaswapDataset({
	chains,
	protocols,
	existingDataset
}: {
	chains: Record<string, IChainMetadata>
	protocols: Record<string, IProtocolMetadata>
	existingDataset?: ProtocolLlamaswapMetadata
}): Promise<ProtocolLlamaswapMetadata> {
	const [protocolLlamaswapRaw, coinsList] = await Promise.all([
		fetchProtocolLlamaswapDataset(),
		fetchCoinGeckoCoinsList({ includePlatform: true })
	])
	const protocolLlamaswapDataset: ProtocolLlamaswapMetadata = {}

	for (const geckoId in protocolLlamaswapRaw) {
		protocolLlamaswapDataset[geckoId] = normalizeProtocolLlamaswapChains(protocolLlamaswapRaw[geckoId], true)
	}

	if (existingDataset) {
		for (const geckoId in existingDataset) {
			if (!(geckoId in protocolLlamaswapDataset)) {
				protocolLlamaswapDataset[geckoId] = existingDataset[geckoId]
			}
		}
	}

	const platformsByGeckoId = new Map<string, Record<string, string>>()
	for (const coin of coinsList) {
		if (!coin.id || !coin.platforms) continue
		platformsByGeckoId.set(coin.id, coin.platforms)
	}

	const relevantGeckoIds = new Set<string>()

	for (const chainName in chains) {
		const geckoId = chains[chainName]?.gecko_id
		if (geckoId) relevantGeckoIds.add(geckoId)
	}

	for (const protocolId in protocols) {
		const geckoId = protocols[protocolId]?.gecko_id
		if (geckoId) relevantGeckoIds.add(geckoId)
	}

	for (const geckoIdBatch of batchArray([...relevantGeckoIds], COINGECKO_CHAIN_BATCH_SIZE)) {
		const backfilledBatchPromises: Array<Promise<[string, IProtocolLlamaswapChain[]] | null>> = []

		for (const geckoId of geckoIdBatch) {
			backfilledBatchPromises.push(
				(async (): Promise<[string, IProtocolLlamaswapChain[]] | null> => {
					try {
						const platforms = platformsByGeckoId.get(geckoId)
						if (!platforms) return [geckoId, []]

						const supportedPlatforms = getSupportedCoinGeckoPlatformsForLlamaswap(platforms)
						if (Object.keys(supportedPlatforms).length === 0) return [geckoId, []]

						const normalizedChains = await fetchCoinGeckoCoinChainsByTickerVolume(geckoId, supportedPlatforms)
						return [geckoId, normalizedChains]
					} catch (error) {
						console.error(
							`[metadata] failed to backfill CoinGecko buy-on-llamaswap chains for ${geckoId}: ${getErrorMessage(error)}`
						)
						return null
					}
				})()
			)
		}

		const backfilledBatch = await Promise.all(backfilledBatchPromises)

		for (const entry of backfilledBatch) {
			if (!entry) continue
			const [geckoId, normalizedChains] = entry
			protocolLlamaswapDataset[geckoId] = mergeProtocolLlamaswapChains(
				protocolLlamaswapDataset[geckoId],
				normalizedChains
			)
		}
	}

	return protocolLlamaswapDataset
}
