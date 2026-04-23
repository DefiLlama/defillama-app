import { fetchLiquidityTokensDataset, fetchProtocolLlamaswapDataset } from '~/api'
import { fetchCoinGeckoCoinsList } from '~/api/coingecko'
import type { ProtocolLiquidityTokensResponse } from '~/api/types'
import { getLlamaswapChainByGeckoPlatform, LLAMASWAP_CHAINS } from '~/constants/chains'
import { buildChainMatchSet } from '~/utils/chainNormalizer'
import { getErrorMessage } from '~/utils/error'
import { mergeProtocolLlamaswapChains, normalizeProtocolLlamaswapChains } from '~/utils/llamaswapChains'
import { getSupportedCoinGeckoPlatformsForLlamaswap, normalizeEvmContractAddress } from '~/utils/llamaswapCoingecko'
import type { IChainMetadata, IProtocolLlamaswapChain, IProtocolMetadata, ProtocolLlamaswapMetadata } from './types'

const CHAIN_NATIVE_TOKEN_FALLBACKS: Record<string, IProtocolLlamaswapChain[]> = {
	hyperliquid: [
		{ chain: 'hyperevm', address: '0x0000000000000000000000000000000000000000', displayName: 'Hyperliquid' }
	]
}

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

function getLlamaswapChainByMatch(value: string | null | undefined): string | null {
	if (!value) return null

	for (const matchKey of buildChainMatchSet([value])) {
		const llamaswapChain = MATCH_KEY_TO_LLAMASWAP.get(matchKey)
		if (llamaswapChain) return llamaswapChain
	}

	return null
}

function buildPoolCoverageUsdByChainAddress(liquidityTokens: ProtocolLiquidityTokensResponse): Map<string, number> {
	const poolCoverageUsdByChainAddress = new Map<string, number>()

	for (const token of liquidityTokens) {
		for (const pool of token.tokenPools ?? []) {
			const llamaswapChain = getLlamaswapChainByMatch(pool.chain)
			if (!llamaswapChain) continue

			const poolCoverageUsd = Number(pool.tvlUsd)
			if (!Number.isFinite(poolCoverageUsd)) continue

			for (const underlyingToken of pool.underlyingTokens ?? []) {
				const address = normalizeEvmContractAddress(underlyingToken)
				if (!address) continue

				const key = `${llamaswapChain}:${address}`
				poolCoverageUsdByChainAddress.set(key, (poolCoverageUsdByChainAddress.get(key) ?? 0) + poolCoverageUsd)
			}
		}
	}

	return poolCoverageUsdByChainAddress
}

function rankSupportedPlatformsByPoolCoverage(
	platforms: Record<string, string> | null | undefined,
	poolCoverageUsdByChainAddress: Map<string, number>
): IProtocolLlamaswapChain[] {
	const supportedPlatforms = getSupportedCoinGeckoPlatformsForLlamaswap(platforms)
	const rankedChains: Array<IProtocolLlamaswapChain & { index: number; poolCoverageUsd: number }> = []

	for (const platform in supportedPlatforms) {
		const address = supportedPlatforms[platform]
		const llamaswapChain = getLlamaswapChainByGeckoPlatform(platform)
		if (!llamaswapChain) continue

		rankedChains.push({
			chain: llamaswapChain.llamaswap,
			address,
			displayName: llamaswapChain.displayName,
			index: rankedChains.length,
			poolCoverageUsd: poolCoverageUsdByChainAddress.get(`${llamaswapChain.llamaswap}:${address}`) ?? 0
		})
	}

	rankedChains.sort((a, b) => b.poolCoverageUsd - a.poolCoverageUsd || a.index - b.index)

	return rankedChains
		.filter(({ poolCoverageUsd }) => poolCoverageUsd > 0)
		.map(({ index: _index, poolCoverageUsd: _poolCoverageUsd, ...chain }) => chain)
}

function mergeAndNormalizeProtocolChains({
	geckoId,
	chainGeckoIds,
	chainMetadataByGeckoId,
	primary,
	secondary
}: {
	geckoId: string
	chainGeckoIds: Set<string>
	chainMetadataByGeckoId: Map<string, IChainMetadata>
	primary: IProtocolLlamaswapChain[] | null | undefined
	secondary: IProtocolLlamaswapChain[] | null | undefined
}): IProtocolLlamaswapChain[] | null {
	const mergedChains = mergeProtocolLlamaswapChains(primary, secondary)

	return chainGeckoIds.has(geckoId)
		? normalizeChainGeckoIdLlamaswapChains(mergedChains, chainMetadataByGeckoId.get(geckoId))
		: mergedChains
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
	const [protocolLlamaswapRaw, coinsList, liquidityTokens] = await Promise.all([
		fetchProtocolLlamaswapDataset(),
		fetchCoinGeckoCoinsList({ includePlatform: true }),
		fetchLiquidityTokensDataset()
	])
	const protocolLlamaswapDataset: ProtocolLlamaswapMetadata = {}
	const poolCoverageUsdByChainAddress = buildPoolCoverageUsdByChainAddress(liquidityTokens)

	for (const geckoId in protocolLlamaswapRaw) {
		protocolLlamaswapDataset[geckoId] = normalizeProtocolLlamaswapChains(protocolLlamaswapRaw[geckoId], true)
	}

	const platformsByGeckoId = new Map<string, Record<string, string>>()
	for (const coin of coinsList) {
		if (!coin.id || !coin.platforms) continue
		platformsByGeckoId.set(coin.id, coin.platforms)
	}

	const chainMetadataByGeckoId = new Map<string, IChainMetadata>()
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

		relevantGeckoIds.add(geckoId)
	}

	for (const geckoId of excludedProtocolGeckoIds) {
		delete protocolLlamaswapDataset[geckoId]
	}

	for (const geckoId of relevantGeckoIds) {
		try {
			const mergedChains = mergeAndNormalizeProtocolChains({
				geckoId,
				chainGeckoIds,
				chainMetadataByGeckoId,
				primary: protocolLlamaswapDataset[geckoId],
				secondary: rankSupportedPlatformsByPoolCoverage(platformsByGeckoId.get(geckoId), poolCoverageUsdByChainAddress)
			})

			if (mergedChains?.length) {
				protocolLlamaswapDataset[geckoId] = mergedChains
			} else {
				delete protocolLlamaswapDataset[geckoId]
			}
		} catch (error) {
			console.error(
				`[metadata] failed to backfill CoinGecko buy-on-llamaswap chains for ${geckoId}: ${getErrorMessage(error)}`
			)
		}
	}

	if (existingDataset) {
		for (const geckoId in existingDataset) {
			if (excludedProtocolGeckoIds.has(geckoId) || protocolLlamaswapDataset[geckoId]?.length) continue

			const mergedChains = mergeAndNormalizeProtocolChains({
				geckoId,
				chainGeckoIds,
				chainMetadataByGeckoId,
				primary: null,
				secondary: existingDataset[geckoId]
			})

			if (mergedChains?.length) {
				protocolLlamaswapDataset[geckoId] = mergedChains
			}
		}
	}

	for (const geckoId of chainGeckoIds) {
		if (protocolLlamaswapDataset[geckoId]?.length) continue
		const fallback = CHAIN_NATIVE_TOKEN_FALLBACKS[geckoId]
		if (fallback) {
			protocolLlamaswapDataset[geckoId] = fallback
		}
	}

	return protocolLlamaswapDataset
}
