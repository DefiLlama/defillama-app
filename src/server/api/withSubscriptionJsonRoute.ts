import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'
import { requireSubscription } from './requireSubscription'

type SubscriptionJsonRouteOptions<TParams> = {
	route: string
	errorMessage: string
	getRouteParams?: (req: NextApiRequest, res: NextApiResponse) => TParams | null | Promise<TParams | null>
	handler: (req: NextApiRequest, res: NextApiResponse, params: TParams) => unknown | Promise<unknown>
}

export function withSubscriptionJsonRoute<TParams = undefined>({
	route,
	errorMessage,
	getRouteParams,
	handler
}: SubscriptionJsonRouteOptions<TParams>): NextApiHandler {
	return withApiRouteTelemetry(route, async (req, res) => {
		res.setHeader('Cache-Control', 'private, no-store')

		if (req.method !== 'GET') {
			res.setHeader('Allow', ['GET'])
			return res.status(405).json({ error: 'Method Not Allowed' })
		}

		const params = getRouteParams ? await getRouteParams(req, res) : (undefined as TParams)
		if (params === null) return

		try {
			const auth = await requireSubscription(req.headers.authorization, res)
			if (!auth) return

			return await handler(req, res, params)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return res.status(500).json({ error: errorMessage })
		}
	})
}
