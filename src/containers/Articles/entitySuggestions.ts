import { matchSorter } from 'match-sorter'
import { createArticleEntityRef } from './entityLinks'
import type { EntityPreview } from './entityPreviewTypes'
import type { ArticleEntityRef, ArticleEntityType } from './types'

export type ArticleEntitySuggestionItem = ArticleEntityRef & {
	id: string
	source: 'search' | 'static' | 'recent'
	logo?: string | null
	subLabel?: string
	preview?: EntityPreview | null
}

export type ArticleSearchEntityHit = {
	id?: string
	name?: string
	logo?: string | null
	type?: string
	route?: string
	subName?: string
}

const STATIC_FALLBACK: ArticleEntitySuggestionItem[] = [
	{
		...createArticleEntityRef({ entityType: 'metric', slug: 'protocols', label: 'All Protocols', route: '/protocols' }),
		id: 'metric:protocols',
		source: 'static'
	},
	{
		...createArticleEntityRef({ entityType: 'metric', slug: 'chains', label: 'All Chains', route: '/chains' }),
		id: 'metric:chains',
		source: 'static'
	},
	{
		...createArticleEntityRef({ entityType: 'hack', slug: 'hacks', label: 'Hacks' }),
		id: 'hack:hacks',
		source: 'static'
	}
]

const TYPE_MAP: Record<string, ArticleEntityType | undefined> = {
	Protocol: 'protocol',
	Chain: 'chain',
	Stablecoin: 'stablecoin',
	Category: 'category',
	Metric: 'metric',
	Others: 'metric',
	CEX: 'cex',
	Bridge: 'bridge'
}

function deriveSlugFromRoute(route: string, fallback: string): string {
	const cleaned = route.split('?')[0].split('#')[0]
	const segments = cleaned.split('/').filter(Boolean)
	if (segments.length === 0) return fallback
	return segments[segments.length - 1]
}

export function normalizeArticleEntitySearchHit(hit: ArticleSearchEntityHit): ArticleEntitySuggestionItem | null {
	const entityType = hit.type ? TYPE_MAP[hit.type] : undefined
	const label = typeof hit.name === 'string' && hit.name.trim() ? hit.name.trim() : undefined
	const route = typeof hit.route === 'string' && hit.route.trim() ? hit.route.trim() : undefined
	const id = typeof hit.id === 'string' && hit.id.trim() ? hit.id.trim() : undefined
	if (!entityType || !label || !route || !id) return null
	if (!route.startsWith('/')) return null
	if (entityType === 'protocol' && !route.startsWith('/protocol/')) return null
	if (entityType === 'stablecoin' && !route.startsWith('/stablecoin/')) return null

	const slug = deriveSlugFromRoute(route, id)
	const subLabel = typeof hit.subName === 'string' && hit.subName.trim() ? hit.subName.trim() : undefined

	return {
		entityType,
		slug,
		label,
		route,
		id,
		source: 'search',
		logo: typeof hit.logo === 'string' ? hit.logo : null,
		...(subLabel ? { subLabel } : {})
	}
}

export function getStaticArticleEntitySuggestions(query: string, limit = 8): ArticleEntitySuggestionItem[] {
	const normalizedQuery = query.trim()
	if (!normalizedQuery) return STATIC_FALLBACK.slice(0, limit)
	return matchSorter(STATIC_FALLBACK, normalizedQuery, {
		keys: ['label', 'slug', 'entityType'],
		threshold: matchSorter.rankings.CONTAINS
	}).slice(0, limit)
}

function routePathname(route: string): string {
	return route.split('?')[0].split('#')[0]
}

export function mergeArticleEntitySuggestions(
	primary: ArticleEntitySuggestionItem[],
	secondary: ArticleEntitySuggestionItem[],
	limit = 24
): ArticleEntitySuggestionItem[] {
	const seen = new Set<string>()
	const merged: ArticleEntitySuggestionItem[] = []
	for (const item of [...primary, ...secondary]) {
		const dedupeKey = `${item.entityType}:${routePathname(item.route)}`
		if (seen.has(dedupeKey)) continue
		seen.add(dedupeKey)
		merged.push(item)
		if (merged.length >= limit) break
	}
	return merged
}
