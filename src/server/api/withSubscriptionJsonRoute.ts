import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'
import { requireSubscription } from './requireSubscription'

type SubscriptionJsonRouteOptions<TParams> = {
	route: string
	errorMessage: string
	method?: 'GET' | 'POST'
	getRouteParams?: (req: NextApiRequest, res: NextApiResponse) => TParams | null | Promise<TParams | null>
	handler: (req: NextApiRequest, res: NextApiResponse, params: TParams) => unknown | Promise<unknown>
}

/**
 * Wrapper for strict subscription-gated JSON routes.
 * Routes default to GET, but POST is supported for JSON mutation-style endpoints.
 * Param parsing runs before auth so route-owned shape errors can stay unchanged; everything past that point requires a valid subscription.
 */
export function withSubscriptionJsonRoute<TParams = undefined>({
	route,
	errorMessage,
	method = 'GET',
	getRouteParams,
	handler
}: SubscriptionJsonRouteOptions<TParams>): NextApiHandler {
	return withApiRouteTelemetry(route, async (req, res) => {
		res.setHeader('Cache-Control', 'private, no-store')

		if (req.method !== method) {
			res.setHeader('Allow', [method])
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
