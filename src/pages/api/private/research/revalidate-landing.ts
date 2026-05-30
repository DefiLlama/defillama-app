import type { NextApiRequest, NextApiResponse } from 'next'
import { FEATURES_SERVER } from '~/constants'
import { purgeCloudflareResearchUrls, type CloudflarePurgeResult } from '~/server/cloudflarePurge'
import {
	assertRevalidateFanoutSucceeded,
	fanoutRevalidate,
	type InstanceRevalidateResult
} from '~/server/revalidateInstances'
import { withApiRouteTelemetry } from '~/utils/telemetry'

type CacheUpdateResult = {
	cloudflare: CloudflarePurgeResult
	instances: InstanceRevalidateResult[]
	revalidateErrors: { path: string; reason: string }[]
	revalidated: string[]
}

type ResponseData = CacheUpdateResult | { error: string }

function articleUrl(path: string) {
	return `${FEATURES_SERVER.replace(/\/$/, '')}${path}`
}

function authorizationHeader(req: NextApiRequest): Record<string, string> {
	const header = req.headers.authorization
	if (Array.isArray(header)) {
		const first = header.find(Boolean)
		return first ? { Authorization: first } : {}
	}
	return header ? { Authorization: header } : {}
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

async function revalidateResearchLanding(res: NextApiResponse<ResponseData>) {
	const path = '/research'
	try {
		await res.revalidate(path)
		return { revalidateErrors: [], revalidated: [path] }
	} catch (error) {
		return {
			revalidateErrors: [{ path, reason: error instanceof Error ? error.message : String(error) }],
			revalidated: []
		}
	}
}

export async function researchLandingRevalidateHandler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	res.setHeader('Cache-Control', 'private, no-store, max-age=0')

	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const headers = authorizationHeader(req)
	if (!headers.Authorization) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const authCheck = await fetch(articleUrl('/articles/mine?limit=1'), { headers })
	if (!authCheck.ok) {
		return sendBackendResponse(authCheck, res)
	}

	const revalidate = await revalidateResearchLanding(res)
	if (revalidate.revalidateErrors.length > 0) {
		return res.status(502).json({ error: `Local revalidation failed: ${JSON.stringify(revalidate.revalidateErrors)}` })
	}
	const fanout = await fanoutRevalidate(['/research'])
	try {
		assertRevalidateFanoutSucceeded(fanout, ['/research'])
	} catch (error) {
		return res.status(502).json({ error: error instanceof Error ? error.message : String(error) })
	}
	const cloudflare = await purgeCloudflareResearchUrls(['/research'])

	return res.status(200).json({
		cloudflare,
		instances: fanout.instances,
		...revalidate
	})
}

export default withApiRouteTelemetry('/api/private/research/revalidate-landing', researchLandingRevalidateHandler)
