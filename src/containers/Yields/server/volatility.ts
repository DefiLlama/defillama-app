import type { NextApiRequest, NextApiResponse } from 'next'
import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'
import { fetchWithPoolingOnServer } from '~/utils/http-client'

const VOLATILITY_UPSTREAM = process.env.VOLATILITY_UPSTREAM_URL ?? 'https://yields.llama.fi/volatility'

async function handler(_req: NextApiRequest, res: NextApiResponse) {
	const upstream = await fetchWithPoolingOnServer(VOLATILITY_UPSTREAM)
	if (!upstream.ok) {
		return res.status(502).json({ error: 'Upstream error' })
	}

	const data = await upstream.json()
	return res.status(200).json(data)
}

export const yieldsVolatilityHandler = withSubscriptionJsonRoute({
	route: '/api/private/yields/volatility',
	errorMessage: 'Internal server error',
	handler
})
