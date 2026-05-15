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

export function formatDate(value: string | null) {
	if (!value) return ''
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

/** Per-widget limits for research landing */
export const RESEARCH_LANDING_SECTION_LIMITS = {
	reportsHero: 9,
	latest: 6,
	spotlight: 4,
	interviews: 17,
	reportHighlight: 1,
	insights: 8,
	moreReports: 10,
	introducing: 20,
	collections: 15
} as const
