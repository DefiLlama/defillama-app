import { FEATURE_SERVER } from '~/constants'
import type { ArticleAuthorProfile, ArticleDocument, LocalArticleDocument } from './types'

type AuthorizedFetch = (url: string, options?: RequestInit) => Promise<Response | null>
type FetchLike = (url: string, options?: RequestInit) => Promise<Response>

export class ArticleApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'ArticleApiError'
		this.status = status
		Object.setPrototypeOf(this, ArticleApiError.prototype)
	}
}

export type ArticleListResponse = {
	items: ArticleDocument[]
	page: number
	perPage: number
	totalItems: number
	totalPages: number
}

export type ArticleAuthorResponse = {
	author: ArticleAuthorProfile
	articles: ArticleDocument[]
}

function articleUrl(path: string) {
	return `${FEATURE_SERVER.replace(/\/$/, '')}${path}`
}

function buildSavePayload(article: LocalArticleDocument) {
	return {
		title: article.title,
		subtitle: article.subtitle,
		slug: article.slug,
		status: article.status,
		seoTitle: article.seoTitle,
		seoDescription: article.seoDescription,
		excerpt: article.excerpt,
		coverImage: article.coverImage ?? null,
		contentJson: article.contentJson,
		tags: article.tags ?? [],
		...(typeof article.featuredRank === 'number' ? { featuredRank: article.featuredRank } : {}),
		...(article.featuredUntil ? { featuredUntil: article.featuredUntil } : {})
	}
}

async function parseResponse<T>(response: Response | null): Promise<T> {
	if (!response) throw new ArticleApiError('Please sign in to continue', 401)
	const text = await response.text()
	const data = text ? JSON.parse(text) : null
	if (!response.ok) {
		const message =
			data && typeof data === 'object' && typeof data.error === 'string'
				? data.error
				: response.statusText || 'Article request failed'
		throw new ArticleApiError(message, response.status)
	}
	return data as T
}

function appendSearchParam(params: URLSearchParams, key: string, value: string | number | undefined) {
	if (value === undefined || value === '') return
	params.set(key, String(value))
}

export async function listArticles(
	params: {
		page?: number
		limit?: number
		query?: string
		tags?: string[]
		entityType?: string
		entitySlug?: string
		sort?: 'featured' | 'newest'
	} = {},
	fetchFn: FetchLike = fetch
): Promise<ArticleListResponse> {
	const search = new URLSearchParams()
	appendSearchParam(search, 'page', params.page)
	appendSearchParam(search, 'limit', params.limit)
	appendSearchParam(search, 'query', params.query)
	appendSearchParam(search, 'tags', params.tags?.join(','))
	appendSearchParam(search, 'entityType', params.entityType)
	appendSearchParam(search, 'entitySlug', params.entitySlug)
	appendSearchParam(search, 'sort', params.sort)
	return parseResponse(await fetchFn(articleUrl(`/articles?${search}`)))
}

export async function getArticleBySlug(slug: string, fetchFn: FetchLike = fetch): Promise<ArticleDocument | null> {
	const response = await fetchFn(articleUrl(`/articles/${encodeURIComponent(slug)}`))
	if (response.status === 404) return null
	const data = await parseResponse<{ article: ArticleDocument }>(response)
	return data.article
}

export async function getAuthorBySlug(slug: string, fetchFn: FetchLike = fetch): Promise<ArticleAuthorResponse | null> {
	const response = await fetchFn(articleUrl(`/article-authors/${encodeURIComponent(slug)}`))
	if (response.status === 404) return null
	return parseResponse<ArticleAuthorResponse>(response)
}

export async function getOwnedArticle(id: string, authorizedFetch: AuthorizedFetch): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(id)}/edit`))
	)
	return data.article
}

export async function createArticle(
	article: LocalArticleDocument,
	authorizedFetch: AuthorizedFetch
): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(articleUrl('/articles'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(buildSavePayload(article))
		})
	)
	return data.article
}

export async function updateArticle(
	id: string,
	article: LocalArticleDocument,
	authorizedFetch: AuthorizedFetch
): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(id)}`), {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(buildSavePayload(article))
		})
	)
	return data.article
}

export async function publishArticle(id: string, authorizedFetch: AuthorizedFetch): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(id)}/publish`), { method: 'POST' })
	)
	return data.article
}

export async function unpublishArticle(id: string, authorizedFetch: AuthorizedFetch): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(id)}/unpublish`), { method: 'POST' })
	)
	return data.article
}

export async function listMyArticles(
	params: { page?: number; limit?: number } = {},
	authorizedFetch: AuthorizedFetch
): Promise<ArticleListResponse> {
	const search = new URLSearchParams()
	appendSearchParam(search, 'page', params.page)
	appendSearchParam(search, 'limit', params.limit)
	return parseResponse(await authorizedFetch(articleUrl(`/articles/mine?${search}`)))
}

export async function deleteArticle(id: string, authorizedFetch: AuthorizedFetch): Promise<void> {
	await parseResponse(await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(id)}`), { method: 'DELETE' }))
}
