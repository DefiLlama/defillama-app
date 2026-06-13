import { getMetadataCache, type StaticParamPath } from '~/server/routeRegistry/common'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

function dedupeSlugs(slugs: string[]): string[] {
	return [...new Set(slugs)]
}

export async function getNarrativeCategoryStaticPaths(): Promise<Array<StaticParamPath<'category'>>> {
	const metadataCache = await getMetadataCache()
	return dedupeSlugs(metadataCache.narrativeCategories.ids).map((category) => ({ params: { category } }))
}

export function getNarrativeSitemapRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []

	for (const categoryId of metadataCache.narrativeCategories.ids) {
		routes.push(`narrative-tracker/${categoryId}`)
	}

	return routes
}
