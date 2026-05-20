import type { ArticlePathItem } from '~/containers/Articles/api'
import { ARTICLE_SECTIONS, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import type { SitemapUrlEntry } from '~/utils/sitemapXml'

export function articlePathToSitemapPath(item: ArticlePathItem): string | null {
	const sectionSlug = ARTICLE_SECTION_SLUGS[item.section]
	if (!sectionSlug) return null
	return `research/${sectionSlug}/${item.slug}`
}

function isParseableIsoDate(value: string): boolean {
	if (!value) return false
	return Number.isFinite(Date.parse(value))
}

const RESEARCH_HUB_ENTRY: SitemapUrlEntry = { path: 'research' }

const RESEARCH_SECTION_ENTRIES: SitemapUrlEntry[] = ARTICLE_SECTIONS.map((section) => ({
	path: `research/${ARTICLE_SECTION_SLUGS[section]}`
}))

export function buildResearchSitemapEntries(articlePaths: ArticlePathItem[] = []): SitemapUrlEntry[] {
	const articleEntries = articlePaths.flatMap((item): SitemapUrlEntry[] => {
		const path = articlePathToSitemapPath(item)
		if (!path) return []

		return [
			{
				path,
				lastmod: isParseableIsoDate(item.updatedAt) ? item.updatedAt : undefined
			}
		]
	})

	return [RESEARCH_HUB_ENTRY, ...RESEARCH_SECTION_ENTRIES, ...articleEntries]
}
