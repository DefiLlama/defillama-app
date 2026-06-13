import { getMetadataCache, type StaticParamPath } from '~/server/routeRegistry/common'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

function dedupeSlugs(slugs: string[]): string[] {
	return [...new Set(slugs)]
}

export async function getDATCompanyStaticPaths(): Promise<Array<StaticParamPath<'company'>>> {
	const metadataCache = await getMetadataCache()
	return dedupeSlugs(metadataCache.digitalAssetTreasuryRoutes.companySlugs).map((company) => ({ params: { company } }))
}

export async function getDATAssetStaticPaths(): Promise<Array<StaticParamPath<'asset'>>> {
	const metadataCache = await getMetadataCache()
	return dedupeSlugs(metadataCache.digitalAssetTreasuryRoutes.assetSlugs).map((asset) => ({ params: { asset } }))
}

export function getDATSitemapRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const companySlug of metadataCache.digitalAssetTreasuryRoutes.companySlugs) {
		routes.push(`digital-asset-treasury/${companySlug}`)
	}
	for (const assetSlug of metadataCache.digitalAssetTreasuryRoutes.assetSlugs) {
		routes.push(`digital-asset-treasuries/${assetSlug}`)
	}

	return routes
}
