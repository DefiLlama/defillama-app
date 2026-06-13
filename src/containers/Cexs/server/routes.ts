import { getMetadataCache, type StaticParamPath } from '~/server/routeRegistry/common'
import { slug } from '~/utils'
import type { MetadataCache } from '~/utils/metadata/artifactContract'
import type { ICexItem } from '~/utils/metadata/types'
import { getCexMarketSlugsFromCache } from './routeData'

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
	const slugs = new Set<string>()
	for (const cex of metadataCache.cexs) {
		if (!cex.slug) continue
		slugs.add(slug(cex.slug))
	}
	return [...slugs]
}

export async function getCexStaticPaths(limit = 10): Promise<Array<StaticParamPath<'cex'>>> {
	return getCexSlugsFromMetadata(await getMetadataCache())
		.slice(0, limit)
		.map((cex) => ({ params: { cex } }))
}

export async function getCexSitemapRoutes(metadataCache: MetadataCache): Promise<string[]> {
	const routes: string[] = []
	const cexSlugs = getCexSlugsFromMetadata(metadataCache)

	for (const cexSlug of cexSlugs) {
		routes.push(`cex/${cexSlug}`)
		routes.push(`cex/assets/${cexSlug}`)
		routes.push(`cex/stablecoins/${cexSlug}`)
	}

	for (const cexSlug of await getCexMarketSlugsFromCache()) {
		routes.push(`cex/markets/${cexSlug}`)
	}

	return routes
}
