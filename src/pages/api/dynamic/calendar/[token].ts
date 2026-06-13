// port: framework-native adapter (text/calendar body, not JSON)
import type { NextApiRequest, NextApiResponse } from 'next'
import { calendarIcs } from '~/server/api/routes/calendar'
import { withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const result = await calendarIcs.handle({
		method: req.method ?? 'GET',
		url: req.url ?? '',
		query: req.query,
		headers: req.headers
	})

	for (const [name, value] of Object.entries(result.headers ?? {})) {
		res.setHeader(name, value)
	}

	if (typeof result.body === 'string') {
		return res.status(result.status).send(result.body)
	}
	return res.status(result.status).json(result.body)
}

export default withApiRouteTelemetry('/api/dynamic/calendar/[token]', handler)
