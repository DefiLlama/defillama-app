import type { NextApiRequest, NextApiResponse } from 'next'
import { isPreviewableEntityType } from '~/containers/Articles/entityPreviewTypes'
import { buildEntityPreview } from '~/containers/Articles/server/entityPreviewBuilders'
import type { ArticleEntityType } from '~/containers/Articles/types'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const getQueryParam = (value: string | string[] | undefined): string => {
	if (Array.isArray(value)) return value[0] ?? ''
	return value ?? ''
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}
	const type = getQueryParam(req.query.type).trim() as ArticleEntityType
	const slug = getQueryParam(req.query.slug).trim()
	if (!type || !slug) return res.status(400).json({ error: 'type and slug are required' })
	if (!isPreviewableEntityType(type)) return res.status(200).json({ preview: null })

	try {
		const preview = await buildEntityPreview(type, slug)
		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader('public, s-maxage=300, stale-while-revalidate=600', req.url ?? `${type}:${slug}`)
		)
		return res.status(200).json({ preview })
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(200).json({ preview: null })
	}
}

export default withApiRouteTelemetry('/api/research/entities/preview', handler)
