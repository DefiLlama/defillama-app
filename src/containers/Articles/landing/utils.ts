import { ARTICLE_SECTION_SLUGS, type ArticleSection, type LocalArticleDocument } from '~/containers/Articles/types'

export type ArticleBylineAuthorEntry = {
	name: string
	href: string | null
}

export function getArticleBylineAuthorEntries(article: LocalArticleDocument): ArticleBylineAuthorEntry[] | null {
	if (article.brandByline === true) {
		return [{ name: 'DefiLlama Research', href: '/research' }]
	}
	if (!article.author) return null
	const owner: ArticleBylineAuthorEntry = {
		name: article.author,
		href: article.authorProfile ? `/research/authors/${article.authorProfile.slug}` : null
	}
	const coAuthors = (article.coAuthors ?? []).map((profile) => ({
		name: profile.displayName,
		href: `/research/authors/${profile.slug}`
	}))
	return [owner, ...coAuthors]
}

export function formatDate(value: string | null, emptyLabel = '') {
	if (!value) return emptyLabel
	const date = new Date(value)
	const day = date.getDate()
	const month = date.toLocaleString('en', { month: 'short' })
	const year = date.getFullYear()
	return `${day} ${month} ${year}`
}

export function articleHref(article: { slug: string; section?: ArticleSection | null }): string {
	if (article.section) {
		return `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`
	}
	return '/research'
}

export function readingMinutes(article: { plainText?: string | null; excerpt?: string | null }) {
	const text = article.plainText?.trim() || article.excerpt?.trim() || ''
	const words = text ? text.split(/\s+/).length : 0
	return Math.max(1, Math.ceil(words / 220))
}

/** Per-widget limits for research landing */
export const RESEARCH_LANDING_SECTION_LIMITS = {
	reportsHero: 9,
	latest: 6,
	spotlight: 6,
	interviews: 17,
	reportHighlight: 1,
	insights: 8,
	moreReports: 10,
	spotlightColumn: 20,
	collections: 15
} as const

/**
 * Size of the collections API fetch: sum of all landing section limits.
 * Collections should show N articles not already shown elsewhere; this fetch size
 * ensures enough candidates remain after dedup against every other landing section.
 */
export const RESEARCH_LANDING_COLLECTIONS_FETCH_LIMIT = Object.values(RESEARCH_LANDING_SECTION_LIMITS).reduce(
	(sum, limit) => sum + limit,
	0
)

export function takeUniqueArticles<T extends { id: string }>(
	articles: T[],
	excludedIds: ReadonlySet<string>,
	limit: number
): T[] {
	const result: T[] = []
	for (const article of articles) {
		if (excludedIds.has(article.id)) continue
		result.push(article)
		if (result.length >= limit) break
	}
	return result
}
