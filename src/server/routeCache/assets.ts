import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import type { ICexItem } from '~/utils/metadata/types'
import { getMetadataCache, type StaticParamPath } from './common'

const REDIRECTED_PROTOCOLS_LISTING_SLUGS = new Set([
	'cex',
	'dexes',
	'rwa',
	'dexs',
	'derivatives',
	'dex-aggregator',
	'bridge-aggregator'
])

export type CexRoute = {
	metadata: ICexItem
	canonicalSlug: string
}

export function resolveCexParamFromMetadata(cex: string, metadataCache: MetadataCache): CexRoute | null {
	const normalizedCex = slug(cex)
	if (!normalizedCex) return null

	for (const metadata of metadataCache.cexs) {
		const cexSlug = metadata.slug ? slug(metadata.slug) : ''
		if (cexSlug && (cexSlug === normalizedCex || slug(metadata.name) === normalizedCex)) {
			return {
				metadata,
				canonicalSlug: cexSlug
			}
		}
	}

	return null
}

export async function resolveCexParam(cex: string): Promise<CexRoute | null> {
	return resolveCexParamFromMetadata(cex, await getMetadataCache())
}

export function getCexSlugsFromMetadata(metadataCache: MetadataCache): string[] {
	const slugs: string[] = []
	const seen = new Set<string>()
	for (const cex of metadataCache.cexs) {
		if (!cex.slug) continue
		const cexSlug = slug(cex.slug)
		if (cexSlug && !seen.has(cexSlug)) {
			seen.add(cexSlug)
			slugs.push(cexSlug)
		}
	}
	return slugs
}

export async function getCexStaticPaths(limit = 10): Promise<Array<StaticParamPath<'cex'>>> {
	return getCexSlugsFromMetadata(await getMetadataCache())
		.slice(0, limit)
		.map((cex) => ({ params: { cex } }))
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

export function getProtocolListingSlugsFromMetadata(metadataCache: MetadataCache): string[] {
	const slugs: string[] = []
	const seen = new Set<string>()
	const { categories, tags, tagCategoryMap } = metadataCache.categoriesAndTags

	for (const category of categories) {
		const categorySlug = slug(category)
		if (categorySlug && !seen.has(categorySlug) && !REDIRECTED_PROTOCOLS_LISTING_SLUGS.has(categorySlug)) {
			seen.add(categorySlug)
			slugs.push(categorySlug)
		}
	}

	for (const tag of tags) {
		const tagSlug = slug(tag)
		if (
			tagSlug &&
			!seen.has(tagSlug) &&
			tagCategoryMap[tag] &&
			tagCategoryMap[tag] !== 'RWA' &&
			!REDIRECTED_PROTOCOLS_LISTING_SLUGS.has(tagSlug)
		) {
			seen.add(tagSlug)
			slugs.push(tagSlug)
		}
	}

	return slugs
}

function dedupeSlugs(slugs: string[]): string[] {
	const deduped: string[] = []
	const seen = new Set<string>()
	for (const item of slugs) {
		if (!item || seen.has(item)) continue
		seen.add(item)
		deduped.push(item)
	}
	return deduped
}

export async function getProtocolListingStaticPaths(): Promise<Array<StaticParamPath<'category'>>> {
	return getProtocolListingSlugsFromMetadata(await getMetadataCache()).map((category) => ({ params: { category } }))
}

export async function getNarrativeCategoryStaticPaths(): Promise<Array<StaticParamPath<'category'>>> {
	const metadataCache = await getMetadataCache()
	return dedupeSlugs(metadataCache.narrativeCategories.ids).map((category) => ({ params: { category } }))
}

export async function getDATCompanyStaticPaths(): Promise<Array<StaticParamPath<'company'>>> {
	const metadataCache = await getMetadataCache()
	return dedupeSlugs(metadataCache.digitalAssetTreasuryRoutes.companySlugs).map((company) => ({ params: { company } }))
}

export async function getDATAssetStaticPaths(): Promise<Array<StaticParamPath<'asset'>>> {
	const metadataCache = await getMetadataCache()
	return dedupeSlugs(metadataCache.digitalAssetTreasuryRoutes.assetSlugs).map((asset) => ({ params: { asset } }))
}
