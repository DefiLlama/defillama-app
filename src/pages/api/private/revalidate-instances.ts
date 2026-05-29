import { timingSafeEqual } from 'node:crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { normalizeCachePaths } from '~/server/revalidateInstances'
import { withApiRouteTelemetry } from '~/utils/telemetry'

type ResponseData = { revalidated: string[]; revalidateErrors: { path: string; reason: string }[] } | { error: string }

function headerValue(req: NextApiRequest, name: string): string | null {
	const header = req.headers[name]
	if (Array.isArray(header)) return header.find(Boolean) ?? null
	return typeof header === 'string' && header ? header : null
}

function secretsMatch(provided: string, expected: string): boolean {
	const a = Buffer.from(provided)
	const b = Buffer.from(expected)
	if (a.length !== b.length) return false
	return timingSafeEqual(a, b)
}

function parseBody(body: unknown): { dryRun: boolean; paths: string[] } {
	if (typeof body === 'string') {
		try {
			const payload = JSON.parse(body) as { dryRun?: unknown; paths?: unknown }
			return { dryRun: payload?.dryRun === true, paths: normalizeCachePaths(payload?.paths) }
		} catch {
			return { dryRun: false, paths: [] }
		}
	}
	const payload = body as { dryRun?: unknown; paths?: unknown } | null | undefined
	return { dryRun: payload?.dryRun === true, paths: normalizeCachePaths(payload?.paths) }
}

export async function revalidateInstancesHandler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	res.setHeader('Cache-Control', 'private, no-store, max-age=0')

	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const secret = process.env.REVALIDATE_SECRET
	if (!secret) {
		return res.status(503).json({ error: 'Revalidation is not configured' })
	}

	const provided = headerValue(req, 'x-revalidate-secret')
	if (!provided || !secretsMatch(provided, secret)) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { dryRun, paths } = parseBody(req.body)
	const revalidated: string[] = []
	const revalidateErrors: { path: string; reason: string }[] = []

	if (!dryRun) {
		for (const path of paths) {
			try {
				await res.revalidate(path)
				revalidated.push(path)
			} catch (error) {
				revalidateErrors.push({ path, reason: error instanceof Error ? error.message : String(error) })
			}
		}
	}

	return res.status(revalidateErrors.length > 0 ? 500 : 200).json({ revalidateErrors, revalidated })
}

export default withApiRouteTelemetry('/api/private/revalidate-instances', revalidateInstancesHandler)
