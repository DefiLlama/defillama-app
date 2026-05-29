import type { NextApiRequest, NextApiResponse } from 'next'
import { FEATURES_SERVER } from '~/constants'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import {
	normalizeResearchCachePaths,
	purgeCloudflareResearchUrls,
	type CloudflarePurgeResult
} from '~/server/cloudflarePurge'
import {
	assertRevalidateFanoutSucceeded,
	checkRevalidateFanoutReady,
	fanoutRevalidate,
	type InstanceRevalidateResult
} from '~/server/revalidateInstances'
import { withApiRouteTelemetry } from '~/utils/telemetry'

type BackendArticleResponse = {
	article: ArticleDocument
}

type CacheUpdateResult = {
	cloudflare: CloudflarePurgeResult
	instances: InstanceRevalidateResult[]
	revalidateErrors: { path: string; reason: string }[]
	revalidated: string[]
}

type ResponseData = (BackendArticleResponse & { cache?: CacheUpdateResult }) | { error: string }

type ResearchInvalidationTargets = {
	purgePaths: string[]
	revalidatePaths: string[]
}

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

function sectionPathForArticlePath(articlePath: string): string {
	return articlePath.split('/').slice(0, 3).join('/')
}

function unpublishInvalidationTargets(before: ArticleDocument | null): ResearchInvalidationTargets {
	const beforePath = articlePublicPath(before)
	const purgePaths = new Set<string>()
	const nextPaths = new Set<string>()
	if (beforePath) {
		purgePaths.add('/research')
		purgePaths.add(beforePath)
		nextPaths.add('/research')
		const sectionPath = sectionPathForArticlePath(beforePath)
		if (sectionPath !== beforePath) {
			purgePaths.add(sectionPath)
			nextPaths.add(sectionPath)
		}
	}
	return {
		purgePaths: normalizeResearchCachePaths(Array.from(purgePaths)),
		revalidatePaths: normalizeResearchCachePaths(Array.from(nextPaths))
	}
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

async function assertFanoutReady(paths: string[]) {
	const fanout = await checkRevalidateFanoutReady(paths)
	assertRevalidateFanoutSucceeded(fanout, paths)
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
	const targets = unpublishInvalidationTargets(before)
	try {
		await assertFanoutReady(targets.revalidatePaths)
	} catch (error) {
		return res.status(502).json({ error: error instanceof Error ? error.message : String(error) })
	}

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

	const revalidate = await revalidatePaths(targets.revalidatePaths, res)
	if (revalidate.revalidateErrors.length > 0) {
		return res.status(502).json({ error: `Local revalidation failed: ${JSON.stringify(revalidate.revalidateErrors)}` })
	}
	const fanout = await fanoutRevalidate(targets.revalidatePaths)
	try {
		assertRevalidateFanoutSucceeded(fanout, targets.revalidatePaths)
	} catch (error) {
		return res.status(502).json({ error: error instanceof Error ? error.message : String(error) })
	}
	const cloudflare = await purgeCloudflareResearchUrls(targets.purgePaths)

	return res.status(unpublishResponse.status).json({
		...data,
		cache: {
			cloudflare,
			instances: fanout.instances,
			...revalidate
		}
	})
}

export default withApiRouteTelemetry('/api/private/research/articles/[id]/unpublish', researchUnpublishHandler)
