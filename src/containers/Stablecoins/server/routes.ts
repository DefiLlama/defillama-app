import { getMetadataCache, type StaticParamPath } from '~/server/routeRegistry/common'
import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

function dedupeSlugs(slugs: string[]): string[] {
	return [...new Set(slugs)]
}

function getStablecoinChainSlugsFromMetadata(metadataCache: MetadataCache): string[] {
	const slugs = new Set<string>()

	for (const chainSlug in metadataCache.chainMetadata) {
		const metadata = metadataCache.chainMetadata[chainSlug]
		if (!metadata.stablecoins) continue

		const canonicalSlug = slug(metadata.name)
		if (canonicalSlug === 'all') continue

		slugs.add(canonicalSlug)
	}

	return [...slugs]
}

export async function getStablecoinAssetStaticPaths(limit = 1): Promise<Array<StaticParamPath<'peggedasset'>>> {
	const metadataCache = await getMetadataCache()
	return dedupeSlugs(metadataCache.stablecoinPeggedAssetSlugs)
		.slice(0, limit)
		.map((peggedasset) => ({ params: { peggedasset } }))
}

export function resolveStablecoinAssetParamFromMetadata(
	peggedAsset: string,
	metadataCache: MetadataCache
): string | null {
	const peggedAssetSlug = slug(peggedAsset)
	if (!peggedAssetSlug) return null
	return metadataCache.stablecoinPeggedAssetSlugsSet.has(peggedAssetSlug) ? peggedAssetSlug : null
}

export async function getStablecoinSitemapRoutes(metadataCache: MetadataCache): Promise<string[]> {
	const routes: string[] = []

	for (const stablecoinSlug of metadataCache.stablecoinPeggedAssetSlugs) {
		routes.push(`stablecoin/${stablecoinSlug}`)
	}
	for (const chainSlug of getStablecoinChainSlugsFromMetadata(metadataCache)) {
		routes.push(`stablecoins/${chainSlug}`)
	}

	return routes
}
