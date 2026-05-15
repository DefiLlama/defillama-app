import type { FetchLike } from '../api'
import { getArticleBySlug, listArticles, listArticlesByTag } from '../api'
import { EDITORIAL_TAGS } from '../editorialTags'
import { RESEARCH_LANDING_SECTION_LIMITS } from '../landing/utils'
import { toLightweightArticleDocuments } from '../lightweight'
import type { ArticleDocument, ArticleSection, LightweightArticleDocument } from '../types'

export type ResearchLandingData = {
	heroReports: LightweightArticleDocument[]
	latest: LightweightArticleDocument[]
	spotlight: LightweightArticleDocument[]
	interviews: LightweightArticleDocument[]
	highlight: LightweightArticleDocument[]
	insights: LightweightArticleDocument[]
	moreReports: LightweightArticleDocument[]
	spotlightColumn: LightweightArticleDocument[]
	collections: LightweightArticleDocument[]
}

export type ResearchSectionIndexData = {
	items: LightweightArticleDocument[]
	totalItems: number
}

function itemsOrEmpty<T>(
	settled: PromiseSettledResult<T>[],
	index: number,
	pickItems: (value: T) => ArticleDocument[]
): LightweightArticleDocument[] {
	const result = settled[index]
	if (result?.status === 'fulfilled') return toLightweightArticleDocuments(pickItems(result.value))
	return []
}

export async function fetchResearchLandingData(fetchFn: FetchLike): Promise<ResearchLandingData> {
	const settled = await Promise.allSettled([
		listArticlesByTag(EDITORIAL_TAGS['reports-hero'].slug, RESEARCH_LANDING_SECTION_LIMITS.reportsHero, fetchFn),
		listArticlesByTag(EDITORIAL_TAGS.latest.slug, RESEARCH_LANDING_SECTION_LIMITS.latest, fetchFn),
		listArticlesByTag(EDITORIAL_TAGS.spotlight.slug, RESEARCH_LANDING_SECTION_LIMITS.spotlight, fetchFn),
		listArticles({ section: 'interview', limit: RESEARCH_LANDING_SECTION_LIMITS.interviews }, fetchFn),
		listArticlesByTag(
			EDITORIAL_TAGS['report-highlight'].slug,
			RESEARCH_LANDING_SECTION_LIMITS.reportHighlight,
			fetchFn
		),
		listArticlesByTag(EDITORIAL_TAGS.insights.slug, RESEARCH_LANDING_SECTION_LIMITS.insights, fetchFn),
		listArticles(
			{
				section: 'report',
				sort: 'newest',
				limit: RESEARCH_LANDING_SECTION_LIMITS.moreReports
			},
			fetchFn
		),
		listArticles(
			{
				section: 'spotlight',
				sort: 'newest',
				limit: RESEARCH_LANDING_SECTION_LIMITS.spotlightColumn
			},
			fetchFn
		),
		listArticles({ sort: 'newest', limit: RESEARCH_LANDING_SECTION_LIMITS.collections }, fetchFn)
	])

	const data: ResearchLandingData = {
		heroReports: itemsOrEmpty(settled, 0, (value) => value.items),
		latest: itemsOrEmpty(settled, 1, (value) => value.items),
		spotlight: itemsOrEmpty(settled, 2, (value) => value.items),
		interviews: itemsOrEmpty(settled, 3, (value) => value.items),
		highlight: itemsOrEmpty(settled, 4, (value) => value.items),
		insights: itemsOrEmpty(settled, 5, (value) => value.items),
		moreReports: itemsOrEmpty(settled, 6, (value) => value.items),
		spotlightColumn: itemsOrEmpty(settled, 7, (value) => value.items),
		collections: itemsOrEmpty(settled, 8, (value) => value.items)
	}

	if (settled.every((result) => result.status === 'rejected')) {
		const firstRejected = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected')
		throw firstRejected?.reason ?? new Error('Failed to load research')
	}

	return data
}

export async function fetchResearchSectionIndex(
	section: ArticleSection,
	fetchFn: FetchLike
): Promise<ResearchSectionIndexData> {
	const data = await listArticles({ section, sort: 'newest', limit: 60 }, fetchFn)
	return {
		items: toLightweightArticleDocuments(data.items),
		totalItems: data.totalItems
	}
}

export async function fetchPublishedArticleBySlug(slug: string, fetchFn: FetchLike): Promise<ArticleDocument | null> {
	const article = await getArticleBySlug(slug, fetchFn)
	if (!article || article.status !== 'published') return null
	return article
}
