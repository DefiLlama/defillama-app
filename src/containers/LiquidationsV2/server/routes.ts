import { createProtocolMetadataLookup } from '~/containers/LiquidationsV2/protocolMetadata'
import { resolveChainId, resolveProtocolId } from '~/containers/LiquidationsV2/queries'
import { getMetadataCache, type StaticParamPath } from '~/server/routeRegistry/common'
import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import { getLiquidationsProtocolChainIds, getLiquidationsProtocolsList } from './dataset'
import { getLiquidationsSitemapProtocolChainsFromCache } from './routeData'

export async function getLiquidationsProtocolStaticPaths(): Promise<Array<StaticParamPath<'protocol'>>> {
	const protocolsResponse = await getLiquidationsProtocolsList()
	return protocolsResponse.protocols.map((protocol) => ({ params: { protocol } }))
}

export async function resolveLiquidationsProtocolParam(protocol: string): Promise<string | null> {
	const metadataCache = await getMetadataCache()
	const protocolsResponse = await getLiquidationsProtocolsList()
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
	const protocolsResponse = await getLiquidationsProtocolsList()
	const protocolId = resolveProtocolId(
		protocol,
		protocolsResponse.protocols,
		createProtocolMetadataLookup(metadataCache.protocolMetadata)
	)
	if (!protocolId) return null

	const chainIds = await getLiquidationsProtocolChainIds(protocolId)
	const chainId = resolveChainId(chain, chainIds, metadataCache.chainMetadata)
	if (!chainId) return null

	return { protocolId, chainId, metadataCache }
}

export async function getLiquidationsSitemapRoutes(metadataCache: MetadataCache): Promise<string[]> {
	const routes: string[] = []
	const protocolChainIds = await getLiquidationsSitemapProtocolChainsFromCache()

	for (const { protocolId, chainIds } of protocolChainIds) {
		routes.push(`liquidations/${protocolId}`)
		for (const chainId of chainIds) {
			const chainMetadata = metadataCache.chainMetadata[slug(chainId)]
			const chainSlug = slug(chainMetadata?.name ?? chainId)
			if (chainSlug) routes.push(`liquidations/${protocolId}/${chainSlug}`)
		}
	}

	return routes
}
