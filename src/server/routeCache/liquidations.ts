import { createProtocolMetadataLookup } from '~/containers/LiquidationsV2/protocolMetadata'
import { resolveChainId, resolveProtocolId } from '~/containers/LiquidationsV2/queries'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import { normalizeLiquidationsTokenSymbol } from '~/utils/metadata/liquidations'
import { getMetadataCache, type StaticParamPath } from './common'

export async function getLiquidationsProtocolStaticPaths(): Promise<Array<StaticParamPath<'protocol'>>> {
	const { getLiquidationsProtocolsResponseFromCache } = await import('~/server/datasetCache/liquidations')
	const protocolsResponse = await getLiquidationsProtocolsResponseFromCache()
	return protocolsResponse.protocols.map((protocol) => ({ params: { protocol } }))
}

export async function resolveLiquidationsProtocolParam(protocol: string): Promise<string | null> {
	const metadataCache = await getMetadataCache()
	const { getLiquidationsProtocolsResponseFromCache } = await import('~/server/datasetCache/liquidations')
	const protocolsResponse = await getLiquidationsProtocolsResponseFromCache()
	const lookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	return resolveProtocolId(protocol, protocolsResponse.protocols, lookup)
}

export async function resolveLiquidationsChainParams(
	protocol: string,
	chain: string
): Promise<{
	protocolId: string
	chainId: string
	metadataCache: MetadataCache
} | null> {
	const metadataCache = await getMetadataCache()
	const { getLiquidationsProtocolsResponseFromCache, getLiquidationsProtocolChainIdsFromCache } =
		await import('~/server/datasetCache/liquidations')
	const protocolsResponse = await getLiquidationsProtocolsResponseFromCache()
	const protocolId = resolveProtocolId(
		protocol,
		protocolsResponse.protocols,
		createProtocolMetadataLookup(metadataCache.protocolMetadata)
	)
	if (!protocolId) return null

	const chainIds = await getLiquidationsProtocolChainIdsFromCache(protocolId)
	const chainId = resolveChainId(chain, chainIds, metadataCache.chainMetadata)
	if (!chainId) return null

	return { protocolId, chainId, metadataCache }
}

export async function resolveTokenLiquidationsParam(symbol: string): Promise<string | null> {
	const normalizedSymbol = normalizeLiquidationsTokenSymbol(symbol)
	if (!normalizedSymbol) return null
	const metadataCache = await getMetadataCache()
	return metadataCache.liquidationsTokenSymbolsSet.has(normalizedSymbol) ? normalizedSymbol : null
}
