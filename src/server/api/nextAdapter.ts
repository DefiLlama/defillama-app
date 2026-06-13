import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'
import type { ApiRequest, ApiRouteDefinition } from './types'

const NO_STORE = 'no-store'

function toApiRequest(req: NextApiRequest): ApiRequest {
	return {
		method: req.method ?? 'GET',
		url: req.url ?? '',
		query: req.query,
		headers: req.headers,
		body: req.body
	}
}

/**
 * Host a framework-neutral route definition as a Next.js API handler: method
 * guard, route telemetry, jittered Cache-Control on cacheable successes,
 * no-store on errors, and unhandled exceptions mapped to a 500 after being
 * recorded. Porting to another framework means rewriting this file only.
 */
export function toNextHandler(definition: ApiRouteDefinition): NextApiHandler {
	const methods = definition.methods ?? ['GET']

	const handler = async (req: NextApiRequest, res: NextApiResponse) => {
		if (!methods.includes(req.method ?? 'GET')) {
			res.setHeader('Allow', methods.join(', '))
			res.setHeader('Cache-Control', NO_STORE)
			return res.status(405).json({ error: 'Method not allowed' })
		}

		try {
			const result = await definition.handle(toApiRequest(req))

			for (const [name, value] of Object.entries(result.headers ?? {})) {
				res.setHeader(name, value)
			}

			if (!res.hasHeader('Cache-Control')) {
				const cacheable = result.status >= 200 && result.status < 300 && definition.cacheControl
				res.setHeader(
					'Cache-Control',
					// jitterCacheSeconds caps the window relative to the TTL, so this is
					// safe for short-lived headers too.
					cacheable ? jitterCacheControlHeader(definition.cacheControl!, req.url ?? definition.route) : NO_STORE
				)
			}

			return res.status(result.status).json(result.body)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			res.setHeader('Cache-Control', NO_STORE)
			return res.status(500).json({ error: 'Internal server error' })
		}
	}

	return withApiRouteTelemetry(definition.route, handler)
}
