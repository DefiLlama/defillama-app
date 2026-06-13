import type { MetadataCache } from '~/utils/metadata/artifactContract'

export function getOracleSitemapRoutes(metadataCache: MetadataCache): string[] {
	const routes: string[] = []
	const { oracleNameBySlug, chainSlugsByOracleSlug, chainNameBySlug } = metadataCache.oracleRoutes

	for (const oracleSlug in oracleNameBySlug) {
		routes.push(`oracles/${oracleSlug}`)
		for (const chainSlug of chainSlugsByOracleSlug[oracleSlug] ?? []) {
			routes.push(`oracles/${oracleSlug}/${chainSlug}`)
		}
	}
	for (const chainSlug in chainNameBySlug) {
		routes.push(`oracles/chain/${chainSlug}`)
	}

	return routes
}
