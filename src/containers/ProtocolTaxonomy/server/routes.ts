import { getMetadataCache, type StaticParamPath } from '~/server/routeRegistry/common'
import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'

const REDIRECTED_PROTOCOLS_LISTING_SLUGS = new Set([
	'cex',
	'dexes',
	'rwa',
	'dexs',
	'derivatives',
	'dex-aggregator',
	'bridge-aggregator'
])

export function getProtocolListingSlugsFromMetadata(metadataCache: MetadataCache): string[] {
	const slugs = new Set<string>()
	const { categories, tags, tagCategoryMap } = metadataCache.categoriesAndTags

	for (const category of categories) {
		const categorySlug = slug(category)
		if (!REDIRECTED_PROTOCOLS_LISTING_SLUGS.has(categorySlug)) {
			slugs.add(categorySlug)
		}
	}

	for (const tag of tags) {
		const tagSlug = slug(tag)
		if (tagCategoryMap[tag] && tagCategoryMap[tag] !== 'RWA' && !REDIRECTED_PROTOCOLS_LISTING_SLUGS.has(tagSlug)) {
			slugs.add(tagSlug)
		}
	}

	return [...slugs]
}

export async function getProtocolListingStaticPaths(): Promise<Array<StaticParamPath<'category'>>> {
	return getProtocolListingSlugsFromMetadata(await getMetadataCache()).map((category) => ({ params: { category } }))
}
