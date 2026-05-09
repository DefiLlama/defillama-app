import type { NextApiRequest, NextApiResponse } from 'next'
import { searchApi } from '~/api'
import {
	getStaticArticleEntitySuggestions,
	mergeArticleEntitySuggestions,
	normalizeArticleEntitySearchHit,
	type ArticleEntitySuggestionItem,
	type ArticleSearchEntityHit
} from '~/containers/Articles/entitySuggestions'
import { buildChainPreview, buildProtocolPreview } from '~/containers/Articles/server/entityPreviewBuilders'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type ResponseData = { entities: ArticleEntitySuggestionItem[] } | { error: string }

const getQueryParam = (value: string | string[] | undefined): string => {
	if (Array.isArray(value)) return value[0] ?? ''
	return value ?? ''
}

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const query = getQueryParam(req.query.q).trim()
	const staticSuggestions = getStaticArticleEntitySuggestions(query)

	try {
		const hits = await searchApi<ArticleSearchEntityHit>({
			indexUid: 'pages',
			limit: 24,
			offset: 0,
			q: query,
			filter: [
				[
					'type = Protocol',
					'type = Chain',
					'type = Stablecoin',
					'type = Category',
					'type = Metric',
					'type = Others',
					'type = CEX',
					'type = Bridge'
				]
			]
		})

		const searchSuggestions = hits
			.map((hit) => normalizeArticleEntitySearchHit(hit))
			.filter((item): item is ArticleEntitySuggestionItem => item !== null)

		const enriched = await Promise.all(
			searchSuggestions.map(async (item) => {
				try {
					if (item.entityType === 'protocol') {
						const preview = await buildProtocolPreview(item.slug)
						if (preview) return { ...item, preview, logo: item.logo ?? preview.logo ?? null }
					} else if (item.entityType === 'chain' && item.route.startsWith('/chain/')) {
						const preview = await buildChainPreview(item.slug)
						if (preview) return { ...item, preview, logo: item.logo ?? preview.logo ?? null }
					}
				} catch {}
				return item
			})
		)

		res.setHeader('Cache-Control', 'public, max-age=60')
		return res.status(200).json({
			entities: mergeArticleEntitySuggestions(enriched, staticSuggestions)
		})
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(200).json({ entities: staticSuggestions })
	}
}

export default withApiRouteTelemetry('/api/research/entities/search', handler)
