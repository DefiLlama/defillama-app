import type { NextApiRequest, NextApiResponse } from 'next'
import { FEATURES_SERVER } from '~/constants'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import {
	normalizeResearchCachePaths,
	purgeCloudflareResearchUrls,
	type CloudflarePurgeResult
} from '~/server/cloudflarePurge'
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
	const header = req.headers.authorization
	if (Array.isArray(header)) {
		const first = header.find(Boolean)
		return first ? { Authorization: first } : {}
	}
	return header ? { Authorization: header } : {}
}

function articlePublicPath(article: Pick<ArticleDocument, 'section' | 'slug'> | null | undefined): string | null {
	if (!article || !article.section || !article.slug) return null
	const sectionSlug = ARTICLE_SECTION_SLUGS[article.section]
	return sectionSlug ? `/research/${sectionSlug}/${article.slug}` : null
}

function unpublishInvalidationPaths(before: ArticleDocument | null): string[] {
	const beforePath = articlePublicPath(before)
	const paths = new Set<string>()
	if (beforePath) {
		paths.add('/research')
		paths.add(beforePath)
	}
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

export async function researchUnpublishHandler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	res.setHeader('Cache-Control', 'private, no-store, max-age=0')

	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const articleId = articleIdFromRequest(req)
	if (!articleId) {
		return res.status(400).json({ error: 'Article ID is required' })
	}

	const encodedArticleId = encodeURIComponent(articleId)
	const beforeResponse = await fetch(articleUrl(`/articles/${encodedArticleId}/edit`), {
		headers: authorizationHeader(req)
	})
	if (!beforeResponse.ok) {
		return sendBackendResponse(beforeResponse, res)
	}

	const before = (await readJson<BackendArticleResponse>(beforeResponse))?.article ?? null
	const unpublishResponse = await fetch(articleUrl(`/articles/${encodedArticleId}/unpublish`), {
		headers: authorizationHeader(req),
		method: 'POST'
	})
	if (!unpublishResponse.ok) {
		return sendBackendResponse(unpublishResponse, res)
	}

	const data = await readJson<BackendArticleResponse>(unpublishResponse)
	if (!data?.article) {
		return res.status(502).json({ error: 'Unpublish response did not include an article' })
	}

	const paths = unpublishInvalidationPaths(before)
	const revalidate = await revalidatePaths(paths, res)
	const cloudflare = await purgeCloudflareResearchUrls(paths)

	return res.status(unpublishResponse.status).json({
		...data,
		cache: {
			cloudflare,
			...revalidate
		}
	})
}

export default withApiRouteTelemetry('/api/private/research/articles/[id]/unpublish', researchUnpublishHandler)
