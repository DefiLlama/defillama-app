import { FEATURES_SERVER } from '~/constants'
import type {
	ArticleAuthorProfile,
	ArticleCollaborator,
	ArticleDocument,
	ArticleRevision,
	ArticleRevisionListResponse,
	LocalArticleDocument
} from './types'

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
	return `${FEATURES_SERVER.replace(/\/$/, '')}${path}`
}

function nullableText(value: string | null | undefined): string | null {
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	return trimmed === '' ? null : value
}

function buildSavePayload(article: LocalArticleDocument, options: { includeStatus?: boolean } = {}) {
	return {
		title: article.title,
		subtitle: nullableText(article.subtitle),
		slug: article.slug,
		...(options.includeStatus ? { status: article.status } : {}),
		seoTitle: nullableText(article.seoTitle),
		seoDescription: nullableText(article.seoDescription),
		excerpt: nullableText(article.excerpt),
		coverImage: article.coverImage ?? null,
		contentJson: article.contentJson,
		tags: article.tags ?? [],
		featuredRank: typeof article.featuredRank === 'number' ? article.featuredRank : null,
		featuredUntil: article.featuredUntil ? article.featuredUntil : null
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
			body: JSON.stringify(buildSavePayload(article, { includeStatus: true }))
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

export async function discardPendingEdits(id: string, authorizedFetch: AuthorizedFetch): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(id)}/discard-pending`), {
			method: 'POST'
		})
	)
	return data.article
}

export async function listArticleRevisions(
	id: string,
	params: { limit?: number; cursor?: string } = {},
	authorizedFetch: AuthorizedFetch
): Promise<ArticleRevisionListResponse> {
	const search = new URLSearchParams()
	appendSearchParam(search, 'limit', params.limit)
	appendSearchParam(search, 'cursor', params.cursor)
	const suffix = search.toString() ? `?${search.toString()}` : ''
	return parseResponse<ArticleRevisionListResponse>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(id)}/revisions${suffix}`))
	)
}

export async function getArticleRevision(
	articleId: string,
	revisionId: string,
	authorizedFetch: AuthorizedFetch
): Promise<ArticleRevision> {
	const data = await parseResponse<{ revision: ArticleRevision }>(
		await authorizedFetch(
			articleUrl(`/articles/${encodeURIComponent(articleId)}/revisions/${encodeURIComponent(revisionId)}`)
		)
	)
	return data.revision
}

export async function restoreArticleRevisionToPending(
	articleId: string,
	revisionId: string,
	authorizedFetch: AuthorizedFetch
): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(
			articleUrl(
				`/articles/${encodeURIComponent(articleId)}/revisions/${encodeURIComponent(revisionId)}/restore-pending`
			),
			{ method: 'POST' }
		)
	)
	return data.article
}

export async function deleteArticleRevision(
	articleId: string,
	revisionId: string,
	authorizedFetch: AuthorizedFetch
): Promise<void> {
	await parseResponse(
		await authorizedFetch(
			articleUrl(`/articles/${encodeURIComponent(articleId)}/revisions/${encodeURIComponent(revisionId)}`),
			{ method: 'DELETE' }
		)
	)
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

export type AuthorProfileUpdate = {
	displayName?: string
	slug?: string
	bio?: string | null
	avatarUrl?: string | null
	socials?: Record<string, string>
}

export async function getMyAuthorProfile(authorizedFetch: AuthorizedFetch): Promise<ArticleAuthorProfile> {
	const data = await parseResponse<{ author: ArticleAuthorProfile }>(
		await authorizedFetch(articleUrl('/article-authors/me'))
	)
	return data.author
}

export async function updateMyAuthorProfile(
	payload: AuthorProfileUpdate,
	authorizedFetch: AuthorizedFetch
): Promise<ArticleAuthorProfile> {
	const data = await parseResponse<{ author: ArticleAuthorProfile }>(
		await authorizedFetch(articleUrl('/article-authors/me'), {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
	)
	return data.author
}

export async function listCollaborators(
	articleId: string,
	authorizedFetch: AuthorizedFetch
): Promise<ArticleCollaborator[]> {
	const data = await parseResponse<{ collaborators: ArticleCollaborator[] }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(articleId)}/collaborators`))
	)
	return data.collaborators
}

export async function addCollaborator(
	articleId: string,
	email: string,
	authorizedFetch: AuthorizedFetch
): Promise<ArticleCollaborator> {
	const data = await parseResponse<{ collaborator: ArticleCollaborator }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(articleId)}/collaborators`), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		})
	)
	return data.collaborator
}

export async function removeCollaborator(
	articleId: string,
	pbUserId: string,
	authorizedFetch: AuthorizedFetch
): Promise<void> {
	await parseResponse(
		await authorizedFetch(
			articleUrl(`/articles/${encodeURIComponent(articleId)}/collaborators/${encodeURIComponent(pbUserId)}`),
			{ method: 'DELETE' }
		)
	)
}

export async function updateCollaborator(
	articleId: string,
	pbUserId: string,
	patch: { hidden: boolean },
	authorizedFetch: AuthorizedFetch
): Promise<ArticleCollaborator> {
	const data = await parseResponse<{ collaborator: ArticleCollaborator }>(
		await authorizedFetch(
			articleUrl(`/articles/${encodeURIComponent(articleId)}/collaborators/${encodeURIComponent(pbUserId)}`),
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(patch)
			}
		)
	)
	return data.collaborator
}

export async function transferOwnership(
	articleId: string,
	target: { email?: string; pbUserId?: string },
	authorizedFetch: AuthorizedFetch
): Promise<ArticleDocument> {
	const data = await parseResponse<{ article: ArticleDocument }>(
		await authorizedFetch(articleUrl(`/articles/${encodeURIComponent(articleId)}/transfer-owner`), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(target)
		})
	)
	return data.article
}
