import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'
import { validateSubscription } from '~/utils/apiAuth'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type CexInflowsBatchRequest = {
	cexs?: Array<{
		slug?: unknown
		tokensToExclude?: unknown
	}>
	start?: unknown
	end?: unknown
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const auth = await validateSubscription(req.headers.authorization)
	if (auth.valid === false) {
		return res.status(auth.status).json({ error: auth.error })
	}

	const body = req.body as CexInflowsBatchRequest
	const startNum = Number(body.start)
	const endNum = Number(body.end)
	if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
		return res.status(400).json({ error: 'start and end must be valid numbers' })
	}

	if (!Array.isArray(body.cexs) || body.cexs.length === 0) {
		return res.status(400).json({ error: 'cexs must be a non-empty array' })
	}

	const protocols: Array<{ protocol: string; tokensToExclude: string[] }> = []
	for (const cex of body.cexs) {
		if (typeof cex.slug !== 'string') {
			return res.status(400).json({ error: 'cexs must include slug values' })
		}

		protocols.push({
			protocol: cex.slug,
			tokensToExclude: typeof cex.tokensToExclude === 'string' && cex.tokensToExclude ? [cex.tokensToExclude] : []
		})
	}

	try {
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
		res.setHeader('Cache-Control', 'private, no-store')
		return res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Internal server error' })
	}
}

export default withApiRouteTelemetry('/api/cex/inflows/batch', handler)
