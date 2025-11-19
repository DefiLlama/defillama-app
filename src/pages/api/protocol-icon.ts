import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { url } = req.query

	if (!url || typeof url !== 'string') {
		return res.status(400).json({ error: 'URL parameter is required' })
	}

	try {
		const response = await fetch(url)

		if (!response.ok) {
			return res.status(response.status).json({ error: 'Failed to fetch icon' })
		}

		const arrayBuffer = await response.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png')
		res.setHeader('Cache-Control', 'public, max-age=86400')
		res.setHeader('Access-Control-Allow-Origin', '*')
		res.send(buffer)
	} catch (error) {
		console.error('Error fetching icon:', error)
		res.status(500).json({ error: 'Failed to fetch icon' })
	}
}
