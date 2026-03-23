import type { NextApiRequest, NextApiResponse } from 'next'
import {
	getCexAnalyticsMarketShare,
	getCexAnalyticsSnapshot,
	getCexAnalyticsTotals
} from '~/server/cexAnalytics/queries'

type View = 'snapshot' | 'totals' | 'share'

const isView = (value: string | undefined): value is View =>
	value === 'snapshot' || value === 'totals' || value === 'share'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const view = typeof req.query.view === 'string' ? req.query.view : 'snapshot'
		if (!isView(view)) {
			res.status(400).json({ error: 'Invalid cex analytics view' })
			return
		}

		if (view === 'snapshot') {
			res.status(200).json(await getCexAnalyticsSnapshot())
			return
		}

		if (view === 'totals') {
			res.status(200).json(await getCexAnalyticsTotals())
			return
		}

		const metric = req.query.metric === 'spot' ? 'spot' : 'derivatives'
		const requestedTopN = typeof req.query.topN === 'string' ? Number(req.query.topN) : 8
		const topN = Number.isFinite(requestedTopN) ? Math.min(Math.max(Math.trunc(requestedTopN), 1), 12) : 8
		res.status(200).json(await getCexAnalyticsMarketShare(metric, topN))
	} catch (error) {
		console.log('Error fetching cex analytics data:', error)
		res.status(500).json({ error: 'Failed to fetch cex analytics data' })
	}
}
