import { generateICSContent } from '~/utils/calendar'
import { queryString } from '../params'
import { badRequest } from '../respond'
import { cachedResult } from '../resultCache'
import { defineApiRoute } from '../types'

const CALENDAR_RESULT_TTL_MS = 10 * 60 * 1000

/**
 * Returns a text/calendar body (not JSON), so the pages adapter sends it via
 * res.send instead of toNextHandler.
 */
export const calendarIcs = defineApiRoute({
	route: '/api/dynamic/calendar/[token]',
	handle: async (req) => {
		const token = queryString(req.query, 'token')
		const timestamp = queryString(req.query, 'timestamp')
		const value = queryString(req.query, 'value')
		const name = queryString(req.query, 'name')

		if (!token || !timestamp || !name) {
			return badRequest('Missing required parameters')
		}

		const content = await cachedResult(
			'calendar-ics',
			JSON.stringify([token, timestamp, value ?? null, name]),
			{ ttlMs: CALENDAR_RESULT_TTL_MS, ttlJitter: 0.2 },
			async () =>
				generateICSContent(
					{
						timestamp: Number(timestamp),
						noOfTokens: [Number(value || 0)],
						symbol: String(token),
						description: '',
						name: String(name)
					},
					String(name),
					String(value)
				)
		)

		return {
			status: 200,
			body: content,
			headers: {
				'Content-Type': 'text/calendar',
				'Content-Disposition': `attachment; filename="${String(name)}-unlock.ics"`
			}
		}
	}
})
