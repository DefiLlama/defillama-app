import type { NextApiRequest, NextApiResponse } from 'next'
import { FEATURES_SERVER } from '~/constants'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import {
	normalizeResearchCachePaths,
	purgeCloudflareResearchUrls,
	type CloudflarePurgeResult
} from '~/server/cloudflarePurge'
import { subscriptionAuthHeader } from '~/utils/apiAuth'
import { withApiRouteTelemetry } from '~/utils/telemetry'

type BackendArticleResponse = {
	article: ArticleDocument
}

type CacheUpdateResult = {
	cloudflare: CloudflarePurgeResult
	revalidateErrors: { path: string; reason: string }[]
	revalidated: string[]
}

type ResponseData = (BackendArticleResponse & { cache?: CacheUpdateResult }) | { error: string }

function articleUrl(path: string) {
	return `${FEATURES_SERVER.replace(/\/$/, '')}${path}`
}

function articleIdFromRequest(req: NextApiRequest): string | null {
	const { id } = req.query
	if (Array.isArray(id)) return id[0] || null
	return typeof id === 'string' && id ? id : null
}

function authorizationHeader(req: NextApiRequest): Record<string, string> {
	const header = subscriptionAuthHeader(req.headers)
	return header ? { Authorization: header } : {}
}

function articlePublicPath(
	article: Pick<ArticleDocument, 'section' | 'slug' | 'status'> | null | undefined
): string | null {
	if (!article || article.status !== 'published' || !article.section || !article.slug) return null
	const sectionSlug = ARTICLE_SECTION_SLUGS[article.section]
	return sectionSlug ? `/research/${sectionSlug}/${article.slug}` : null
}

function publishInvalidationPaths(before: ArticleDocument | null, after: ArticleDocument): string[] {
	const beforePath = articlePublicPath(before)
	const afterPath = articlePublicPath(after)
	const paths = new Set<string>()
	if (beforePath || afterPath) paths.add('/research')
	if (beforePath) paths.add(beforePath)
	if (afterPath) paths.add(afterPath)
	return normalizeResearchCachePaths(Array.from(paths))
}

async function readJson<T>(response: Response): Promise<T | null> {
	const text = await response.text()
	return text ? (JSON.parse(text) as T) : null
}

function parseJsonObject(body: string): ResponseData | null {
	try {
		const payload = JSON.parse(body)
		return payload && typeof payload === 'object' ? (payload as ResponseData) : null
	} catch {
		return null
	}
}

async function sendBackendResponse(response: Response, res: NextApiResponse<ResponseData>) {
	const body = await response.text()
	if (body) {
		const payload = parseJsonObject(body)
		if (payload) return res.status(response.status).json(payload)
	}

	return res.status(response.status).json({ error: body || response.statusText || 'Article request failed' })
}

async function revalidatePaths(paths: string[], res: NextApiResponse<ResponseData>) {
	const revalidated: string[] = []
	const revalidateErrors: CacheUpdateResult['revalidateErrors'] = []

	for (const path of paths) {
		try {
			await res.revalidate(path)
			revalidated.push(path)
		} catch (error) {
			revalidateErrors.push({ path, reason: error instanceof Error ? error.message : String(error) })
		}
	}

	return { revalidateErrors, revalidated }
}

function publishRequestBodyFromQuery(req: NextApiRequest): string {
	const raw = req.query.goLiveAt
	if (raw === undefined) return JSON.stringify({})
	const value = Array.isArray(raw) ? raw[0] : raw
	if (value === '' || value === 'null') return JSON.stringify({ goLiveAt: null })
	return JSON.stringify({ goLiveAt: value })
}

export async function researchPublishHandler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	res.setHeader('Cache-Control', 'private, no-store, max-age=0')

	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const articleId = articleIdFromRequest(req)
	if (!articleId) {
		return res.status(400).json({ error: 'Article ID is required' })
	}

	const encodedArticleId = encodeURIComponent(articleId)
	const headers = {
		...authorizationHeader(req),
		'Content-Type': 'application/json'
	}
	const beforeResponse = await fetch(articleUrl(`/articles/${encodedArticleId}/edit`), {
		headers: authorizationHeader(req)
	})
	if (!beforeResponse.ok) {
		return sendBackendResponse(beforeResponse, res)
	}

	const before = (await readJson<BackendArticleResponse>(beforeResponse))?.article ?? null
	const publishBody = publishRequestBodyFromQuery(req)
	const publishResponse = await fetch(articleUrl(`/articles/${encodedArticleId}/publish`), {
		headers,
		method: 'POST',
		body: publishBody
	})
	if (!publishResponse.ok) {
		return sendBackendResponse(publishResponse, res)
	}

	const data = await readJson<BackendArticleResponse>(publishResponse)
	if (!data?.article) {
		return res.status(502).json({ error: 'Publish response did not include an article' })
	}

	const paths = publishInvalidationPaths(before, data.article)
	const revalidate = await revalidatePaths(paths, res)
	const cloudflare = await purgeCloudflareResearchUrls(paths)

	return res.status(publishResponse.status).json({
		...data,
		cache: {
			cloudflare,
			...revalidate
		}
	})
}

export default withApiRouteTelemetry('/api/research/articles/[id]/publish', researchPublishHandler)
