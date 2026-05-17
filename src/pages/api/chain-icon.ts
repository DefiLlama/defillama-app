import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const ICONS_CDN = 'https://icons.llamao.fi/icons'

function buildIconUrl(slug: string): string {
	const normalized = slug.trim().toLowerCase()
	return `${ICONS_CDN}/chains/rsz_${encodeURIComponent(normalized)}?w=48&h=48`
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { slug } = req.query

	if (!slug || typeof slug !== 'string') {
		return res.status(400).json({ error: 'slug parameter is required' })
	}

	try {
		const url = buildIconUrl(slug)
		const response = await fetchWithPoolingOnServer(url)

		if (!response.ok) {
			return res.status(response.status).json({ error: 'Failed to fetch icon' })
		}

		const arrayBuffer = await response.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png')
		res.setHeader('Cache-Control', 'public, max-age=86400')
		res.send(buffer)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch icon' })
	}
}

export default withApiRouteTelemetry('/api/chain-icon', handler)
