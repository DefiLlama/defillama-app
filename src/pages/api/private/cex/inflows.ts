import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'
import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'
import { fetchWithPoolingOnServer } from '~/utils/http-client'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { slug, start, end, tokensToExclude } = req.query
	if (typeof slug !== 'string' || typeof start !== 'string' || typeof end !== 'string') {
		return res.status(400).json({ error: 'Missing required parameters: slug, start, end' })
	}

	const startNum = Number(start)
	const endNum = Number(end)
	if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
		return res.status(400).json({ error: 'start and end must be valid numbers' })
	}

	const [{ default: metadataCache }, { resolveCexParamFromMetadata }] = await Promise.all([
		import('~/utils/metadata'),
		import('~/server/routeCache/assets')
	])
	const cexRoute = resolveCexParamFromMetadata(slug, metadataCache)
	if (!cexRoute) {
		return res.status(404).json({ error: 'CEX not found' })
	}

	const upstreamUrl = `${SERVER_URL}/inflows/${encodeURIComponent(cexRoute.canonicalSlug)}/${startNum}?end=${endNum}&tokensToExclude=${encodeURIComponent(typeof tokensToExclude === 'string' ? tokensToExclude : '')}`
	const upstream = await fetchWithPoolingOnServer(upstreamUrl)

	if (!upstream.ok) {
		return res.status(upstream.status).json({ error: `Upstream API returned ${upstream.status}` })
	}

	const data = await upstream.json()
	return res.status(200).json(data)
}

export default withSubscriptionJsonRoute({
	route: '/api/private/cex/inflows',
	errorMessage: 'Internal server error',
	handler
})
