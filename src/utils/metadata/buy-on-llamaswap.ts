import { fetchCoinGeckoCoinsList } from '~/api/coingecko'
import { LLAMASWAP_CHAINS } from '~/constants/chains'
import { buildChainMatchSet } from '~/utils/chainNormalizer'
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
const LLAMASWAP_SUPPORTED_PROTOCOL_CHAIN_SET = buildChainMatchSet(
	LLAMASWAP_CHAINS.flatMap(({ displayName, llamaswap, gecko, geckoAliases = [] }) => [
		displayName,
		llamaswap,
		gecko,
		...geckoAliases
	])
)
const MATCH_KEY_TO_LLAMASWAP = new Map<string, string>()

for (const { displayName, llamaswap, gecko, geckoAliases = [] } of LLAMASWAP_CHAINS) {
	for (const matchKey of buildChainMatchSet([displayName, llamaswap, gecko, ...geckoAliases])) {
		MATCH_KEY_TO_LLAMASWAP.set(matchKey, llamaswap)
	}
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

/** Fetch the full GitHub Pages LlamaSwap protocol-liquidity dataset keyed by CoinGecko ID. */
export async function fetchProtocolLlamaswapDataset(): Promise<RawProtocolLlamaswapDataset> {
	return fetchJson<RawProtocolLlamaswapDataset>(PROTOCOL_LLAMASWAP_API_URL)
}

export function protocolHasOnlyUnsupportedLlamaswapChains(
	protocol: Pick<IProtocolMetadata, 'chains'> | null | undefined
): boolean {
	const protocolChains = protocol?.chains
	if (!protocolChains?.length) return false

	for (const chain of buildChainMatchSet(protocolChains)) {
		if (LLAMASWAP_SUPPORTED_PROTOCOL_CHAIN_SET.has(chain)) return false
	}

	return true
}

export function sortProtocolLlamaswapChainsByMetadataOrder(
	llamaswapChains: IProtocolLlamaswapChain[],
	protocol: Pick<IProtocolMetadata, 'chains'> | null | undefined
): IProtocolLlamaswapChain[] {
	const protocolChains = protocol?.chains
	if (!protocolChains?.length || llamaswapChains.length <= 1) return llamaswapChains

	const chainByLlamaswap = new Map(llamaswapChains.map((chain) => [chain.chain, chain] as const))

	const orderedChains: IProtocolLlamaswapChain[] = []
	const addedChains = new Set<string>()

	for (const protocolChain of protocolChains) {
		for (const matchKey of buildChainMatchSet([protocolChain])) {
			const llamaswapChain = MATCH_KEY_TO_LLAMASWAP.get(matchKey)
			if (!llamaswapChain || addedChains.has(llamaswapChain)) continue

			const chain = chainByLlamaswap.get(llamaswapChain)
			if (!chain) continue

			addedChains.add(llamaswapChain)
			orderedChains.push(chain)
			break
		}
	}

	for (const chain of llamaswapChains) {
		if (addedChains.has(chain.chain)) continue
		orderedChains.push(chain)
	}

	return orderedChains
}

function getNativeLlamaswapChainForMetadataChain(chainMetadata: IChainMetadata | null | undefined): string | null {
	if (!chainMetadata) return null

	for (const matchKey of buildChainMatchSet([chainMetadata.name, chainMetadata.id, chainMetadata.gecko_id ?? ''])) {
		const llamaswapChain = MATCH_KEY_TO_LLAMASWAP.get(matchKey)
		if (llamaswapChain) return llamaswapChain
	}

	return null
}

export function normalizeChainGeckoIdLlamaswapChains(
	llamaswapChains: IProtocolLlamaswapChain[] | null | undefined,
	chainMetadata: IChainMetadata | null | undefined
): IProtocolLlamaswapChain[] | null {
	if (!llamaswapChains?.length) return llamaswapChains ?? null

	const nativeLlamaswapChain = getNativeLlamaswapChainForMetadataChain(chainMetadata)
	const normalizedChains = llamaswapChains.map(({ best: _best, ...chain }) => chain)
	if (!nativeLlamaswapChain) return normalizedChains

	const nativeIndex = normalizedChains.findIndex((chain) => chain.chain === nativeLlamaswapChain)
	if (nativeIndex <= 0) return normalizedChains

	return [
		normalizedChains[nativeIndex],
		...normalizedChains.slice(0, nativeIndex),
		...normalizedChains.slice(nativeIndex + 1)
	]
}

async function fetchCoinGeckoCoinChainsByPlatform(
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

	const chainMetadataByGeckoId = new Map<string, IChainMetadata>()
	const protocolByGeckoId = new Map<string, IProtocolMetadata>()
	const chainGeckoIds = new Set<string>()
	const excludedProtocolGeckoIds = new Set<string>()
	const relevantGeckoIds = new Set<string>()

	for (const chainName in chains) {
		const chainMetadata = chains[chainName]
		const geckoId = chainMetadata?.gecko_id
		if (!geckoId) continue
		chainMetadataByGeckoId.set(geckoId, chainMetadata)
		chainGeckoIds.add(geckoId)
		relevantGeckoIds.add(geckoId)
	}

	for (const protocolId in protocols) {
		const protocol = protocols[protocolId]
		const geckoId = protocol?.gecko_id
		if (!geckoId) continue

		if (protocolHasOnlyUnsupportedLlamaswapChains(protocol)) {
			if (!chainGeckoIds.has(geckoId)) excludedProtocolGeckoIds.add(geckoId)
			continue
		}

		protocolByGeckoId.set(geckoId, protocol)
		relevantGeckoIds.add(geckoId)
	}

	for (const geckoId of excludedProtocolGeckoIds) {
		delete protocolLlamaswapDataset[geckoId]
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

						const normalizedChains = sortProtocolLlamaswapChainsByMetadataOrder(
							await fetchCoinGeckoCoinChainsByPlatform(geckoId, supportedPlatforms),
							protocolByGeckoId.get(geckoId)
						)
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
			const mergedChains = mergeProtocolLlamaswapChains(protocolLlamaswapDataset[geckoId], normalizedChains)
			protocolLlamaswapDataset[geckoId] = chainGeckoIds.has(geckoId)
				? normalizeChainGeckoIdLlamaswapChains(mergedChains, chainMetadataByGeckoId.get(geckoId))
				: mergedChains
		}
	}

	return protocolLlamaswapDataset
}
