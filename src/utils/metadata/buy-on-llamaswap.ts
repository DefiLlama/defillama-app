import { fetchCoinGeckoCoinTickersById, fetchCoinGeckoCoinsList } from '~/api/coingecko'
import type { CoinGeckoCoinTickerWithDepth } from '~/api/coingecko.types'
import { LLAMASWAP_CHAINS } from '~/constants/chains'
import { getErrorMessage } from '~/utils/error'
import {
	getSupportedCoinGeckoPlatformsForLlamaswap,
	parseCoinGeckoLlamaswapChainsByTickerVolume
} from './llamaswapCoingecko'
import type { IChainMetadata, IProtocolLlamaswapChain, ProtocolLlamaswapMetadata } from './types'

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
const LLAMASWAP_DISPLAY_NAME_BY_CHAIN = new Map<string, string>()

for (const chain of LLAMASWAP_CHAINS) {
	LLAMASWAP_DISPLAY_NAME_BY_CHAIN.set(chain.llamaswap, chain.displayName)
}

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

function sortChainsByLiquidityDesc<T extends { liquidity?: number }>(a: T, b: T): number {
	return (b.liquidity ?? 0) - (a.liquidity ?? 0)
}

function toProtocolLlamaswapChain(
	chain: Pick<RawLlamaswapChain, 'chain' | 'address'>,
	options?: { best?: boolean }
): IProtocolLlamaswapChain {
	return {
		chain: chain.chain,
		address: chain.address,
		displayName: LLAMASWAP_DISPLAY_NAME_BY_CHAIN.get(chain.chain) ?? chain.chain,
		...(options?.best ? { best: true } : {})
	}
}

export function normalizeProtocolLlamaswapChains(
	entry: Pick<RawProtocolLlamaswapEntry, 'chains'> | null | undefined,
	isLlamaswapList: boolean = false
): IProtocolLlamaswapChain[] | null {
	if (!Array.isArray(entry?.chains) || entry.chains.length === 0) return null

	const sortedChains = entry.chains.slice().sort(sortChainsByLiquidityDesc)
	const normalizedChains: IProtocolLlamaswapChain[] = []

	for (let index = 0; index < sortedChains.length; index += 1) {
		normalizedChains.push(toProtocolLlamaswapChain(sortedChains[index], { best: isLlamaswapList && index === 0 }))
	}

	return normalizedChains
}

/** Fetch the full GitHub Pages LlamaSwap protocol-liquidity dataset keyed by CoinGecko ID. */
export async function fetchProtocolLlamaswapDataset(): Promise<RawProtocolLlamaswapDataset> {
	return fetchJson<RawProtocolLlamaswapDataset>(PROTOCOL_LLAMASWAP_API_URL)
}

function parseCoinGeckoCoinChainsByTickerVolume(coin: {
	platforms?: Record<string, string>
	tickers?: CoinGeckoCoinTickerWithDepth[]
}): IProtocolLlamaswapChain[] {
	return parseCoinGeckoLlamaswapChainsByTickerVolume(coin)
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

	const tickers = await fetchCoinGeckoCoinTickersById(geckoId, {
		order: 'volume_desc',
		depth: true,
		dexPairFormat: 'contract_address'
	})
	return parseCoinGeckoCoinChainsByTickerVolume({
		platforms,
		tickers: 'tickers' in tickers ? (tickers.tickers as CoinGeckoCoinTickerWithDepth[] | undefined) : undefined
	})
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
	existingDataset
}: {
	chains: Record<string, IChainMetadata>
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

	const chainGeckoIds = new Set<string>()
	for (const chainName in chains) {
		const geckoId = chains[chainName]?.gecko_id
		if (geckoId) chainGeckoIds.add(geckoId)
	}

	const missingChainGeckoIds: string[] = []
	for (const geckoId of chainGeckoIds) {
		if (!(geckoId in protocolLlamaswapDataset)) {
			missingChainGeckoIds.push(geckoId)
		}
	}

	for (const geckoIdBatch of batchArray(missingChainGeckoIds, COINGECKO_CHAIN_BATCH_SIZE)) {
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
			protocolLlamaswapDataset[geckoId] = normalizedChains.length > 0 ? normalizedChains : null
		}
	}

	return protocolLlamaswapDataset
}
