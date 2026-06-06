import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { validateSubscription } from '~/utils/apiAuth'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

export type DownloadAccess = 'preview' | 'trial' | 'paid'

type DownloadRouteOptions<TParams> = {
	route: string
	getRouteParams?: (req: NextApiRequest, res: NextApiResponse) => TParams | null | Promise<TParams | null>
	handler: (
		req: NextApiRequest,
		res: NextApiResponse,
		access: DownloadAccess,
		params: TParams
	) => unknown | Promise<unknown>
}

/**
 * Wrapper for CSV download routes, which intentionally keep unauthenticated preview access.
 * It owns the shared private cache header, GET-only handling, telemetry, and auth-to-access mapping; route handlers own CSV shape and data fetching.
 */
export function withDownloadRoute<TParams = undefined>({
	route,
	getRouteParams,
	handler
}: DownloadRouteOptions<TParams>): NextApiHandler {
	return withApiRouteTelemetry(route, async (req, res) => {
		res.setHeader('Cache-Control', 'private, no-store')

		if (req.method !== 'GET') {
			res.setHeader('Allow', ['GET'])
			return res.status(405).json({ error: 'Method Not Allowed' })
		}

		const params = getRouteParams ? await getRouteParams(req, res) : (undefined as TParams)
		if (params === null) return

		try {
			const auth = await validateSubscription(req.headers.authorization)
			const access: DownloadAccess = auth.valid ? (auth.isTrial ? 'trial' : 'paid') : 'preview'

			return await handler(req, res, access, params)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return res.status(500).json({ error: 'Internal server error' })
		}
	})
}
