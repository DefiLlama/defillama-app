import type { NextApiRequest, NextApiResponse } from 'next'
import { slug } from '~/utils'
import { generateICSContent } from '~/utils/calendar'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	const { token } = req.query
	const { timestamp, value, name } = req.query

	if (!token || !timestamp || !name) {
		return res.status(400).json({ error: 'Missing required parameters' })
	}

	const event = {
		timestamp: Number(timestamp),
		noOfTokens: [Number(value || 0)],
		symbol: String(token),
		description: '',
		name: String(name)
	}

	const content = generateICSContent(event, String(name), String(value))
	const filename = `${slug(String(name))}-unlock.ics`

	res.setHeader('Content-Type', 'text/calendar')
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
	res.send(content)
}
