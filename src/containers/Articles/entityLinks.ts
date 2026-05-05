import type { ArticleEntityRef, ArticleEntityType } from './types'

export const ARTICLE_ENTITY_TYPES = ['protocol', 'chain', 'stablecoin', 'metric', 'hack', 'category', 'cex', 'bridge'] as const

export const VALID_ENTITY_TYPES: ReadonlySet<ArticleEntityType> = new Set(ARTICLE_ENTITY_TYPES)

export function isValidArticleEntityType(value: unknown): value is ArticleEntityType {
	return typeof value === 'string' && VALID_ENTITY_TYPES.has(value as ArticleEntityType)
}

export function getArticleEntityRoute(entityType: ArticleEntityType, slug: string) {
	switch (entityType) {
		case 'protocol':
			return `/protocol/${slug}`
		case 'chain':
			return `/chain/${slug}`
		case 'stablecoin':
			return `/stablecoin/${slug}`
		case 'category':
			return `/protocols/${slug}`
		case 'hack':
			return slug && slug !== 'hacks' ? `/hacks?search=${encodeURIComponent(slug)}` : '/hacks'
		case 'metric':
			return `/${slug}`
		case 'cex':
			return `/cex/${slug}`
		case 'bridge':
			return `/bridge/${slug}`
		default:
			return `/${slug}`
	}
}

export function createArticleEntityRef(value: {
	entityType: ArticleEntityType
	slug: string
	label?: string
	route?: string
}): ArticleEntityRef {
	const slug = value.slug.trim()
	return {
		entityType: value.entityType,
		slug,
		label: value.label?.trim() || slug,
		route: value.route || getArticleEntityRoute(value.entityType, slug)
	}
}
