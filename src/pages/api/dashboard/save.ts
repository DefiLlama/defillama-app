import type { NextApiRequest, NextApiResponse } from 'next'
import { FEATURES_SERVER } from '~/constants'
import { purgeCloudflareDashboardUrls, type CloudflarePurgeResult } from '~/server/cloudflarePurge'
import { withApiRouteTelemetry } from '~/utils/telemetry'

type DashboardSaveResponse = Record<string, unknown> | { error: string }

function dashboardUrl(path: string) {
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

function backendDashboardBody(data: Record<string, unknown>) {
	const { visibility, tags, description, aiGenerated, ...dashboardData } = data
	return {
		data: dashboardData,
		visibility: visibility || 'private',
		tags: Array.isArray(tags) ? tags : [],
		description: typeof description === 'string' ? description : '',
		aiGenerated: aiGenerated || null
	}
}

async function sendBackendResponse(response: Response, res: NextApiResponse<DashboardSaveResponse>) {
	const body = await response.text()
	if (body) {
		try {
			return res.status(response.status).json(JSON.parse(body))
		} catch {}
	}
	return res.status(response.status).json({ error: body || response.statusText || 'Dashboard save failed' })
}

export async function dashboardSaveHandler(req: NextApiRequest, res: NextApiResponse<DashboardSaveResponse>) {
	res.setHeader('Cache-Control', 'private, no-store, max-age=0')

	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const headers = authorizationHeader(req)
	if (!headers.Authorization) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
	const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : null
	const data = body.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : null
	if (!data) {
		return res.status(400).json({ error: 'Dashboard data is required' })
	}

	const upstream = await fetch(dashboardUrl(id ? `/dashboards/${encodeURIComponent(id)}` : '/dashboards'), {
		body: JSON.stringify(backendDashboardBody(data)),
		headers: {
			...headers,
			'Content-Type': 'application/json'
		},
		method: 'POST'
	})

	if (!upstream.ok) {
		return sendBackendResponse(upstream, res)
	}

	const dashboard = (await upstream.json()) as Record<string, unknown>
	const savedId = typeof dashboard.id === 'string' ? dashboard.id : id
	let cloudflare: CloudflarePurgeResult | null = null
	if (savedId) {
		cloudflare = await purgeCloudflareDashboardUrls(savedId)
	}

	res.setHeader('X-Cloudflare-Purge-Status', cloudflare?.status ?? 'skipped')
	return res.status(upstream.status).json(dashboard)
}

export default withApiRouteTelemetry('/api/dashboard/save', dashboardSaveHandler)
