import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'
import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'
import { fetchWithPoolingOnServer } from '~/utils/http-client'

type CexInflowsBatchRequest = {
	cexs?: Array<{
		slug?: unknown
		tokensToExclude?: unknown
	}>
	start?: unknown
	end?: unknown
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const body = req.body as CexInflowsBatchRequest
	const startNum = Number(body.start)
	const endNum = Number(body.end)
	if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
		return res.status(400).json({ error: 'start and end must be valid numbers' })
	}

	if (!Array.isArray(body.cexs) || body.cexs.length === 0) {
		return res.status(400).json({ error: 'cexs must be a non-empty array' })
	}

	const cexRequests: Array<{ slug: string; tokensToExclude?: unknown }> = []
	for (const cex of body.cexs) {
		if (typeof cex.slug !== 'string') {
			return res.status(400).json({ error: 'cexs must include slug values' })
		}
		cexRequests.push({ slug: cex.slug, tokensToExclude: cex.tokensToExclude })
	}

	const [{ default: metadataCache }, { resolveCexParamFromMetadata }] = await Promise.all([
		import('~/utils/metadata'),
		import('~/server/routeCache/assets')
	])
	const protocols: Array<{ protocol: string; tokensToExclude: string[] }> = []
	for (const cex of cexRequests) {
		const cexRoute = resolveCexParamFromMetadata(cex.slug, metadataCache)
		if (!cexRoute) {
			return res.status(404).json({ error: 'CEX not found' })
		}

		protocols.push({
			protocol: cexRoute.canonicalSlug,
			tokensToExclude: typeof cex.tokensToExclude === 'string' && cex.tokensToExclude ? [cex.tokensToExclude] : []
		})
	}

	const upstream = await fetchWithPoolingOnServer(`${SERVER_URL}/inflows/batch`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			protocols,
			startTimestamp: startNum,
			endTimestamp: endNum
		})
	})

	if (!upstream.ok) {
		return res.status(upstream.status).json({ error: `Upstream API returned ${upstream.status}` })
	}

	const data = await upstream.json()
	return res.status(200).json(data)
}

export default withSubscriptionJsonRoute({
	route: '/api/private/cex/inflows/batch',
	method: 'POST',
	errorMessage: 'Internal server error',
	handler
})
