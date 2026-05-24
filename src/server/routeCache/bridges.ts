import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

export function resolveBridgeProtocolParamFromMetadata(bridge: string, metadataCache: MetadataCache): string | null {
	const bridgeSlug = slug(bridge)
	if (!bridgeSlug) return null
	return metadataCache.bridgeProtocolSlugs.includes(bridgeSlug) ? bridgeSlug : null
}

export function resolveBridgeChainParamFromMetadata(chain: string, metadataCache: MetadataCache): string | null {
	const chainSlug = slug(chain)
	if (!chainSlug) return null
	return metadataCache.bridgeChainSlugs.includes(chainSlug)
		? (metadataCache.bridgeChainSlugToName[chainSlug] ?? chain)
		: null
}

export function getBridgeRoutesFromMetadata(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const bridgeSlug of metadataCache.bridgeProtocolSlugs) {
		if (bridgeSlug) routes.push(`bridge/${bridgeSlug}`)
	}
	for (const chainSlug of metadataCache.bridgeChainSlugs) {
		if (chainSlug) routes.push(`bridges/${chainSlug}`)
	}

	return routes
}
