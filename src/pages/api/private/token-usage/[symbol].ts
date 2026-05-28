import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'
import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'
import { fetchWithPoolingOnServer } from '~/utils/http-client'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { symbol } = req.query
	const tokenSymbol = typeof symbol === 'string' ? symbol : ''

	if (!tokenSymbol) {
		return res.status(400).json({ error: 'Missing symbol parameter' })
	}

	const upstream = await fetchWithPoolingOnServer(
		`${SERVER_URL}/tokenProtocols/${encodeURIComponent(tokenSymbol.toUpperCase())}`
	)
	if (!upstream.ok) {
		return res.status(upstream.status).json({ error: upstream.statusText })
	}
	const data = await upstream.json()
	return res.status(200).json(data)
}

export default withSubscriptionJsonRoute({
	route: '/api/private/token-usage/[symbol]',
	errorMessage: 'Failed to fetch token usage data',
	handler
})
