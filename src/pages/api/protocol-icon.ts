import type { NextApiRequest, NextApiResponse } from 'next'

const ICONS_CDN = 'https://icons.llamao.fi/icons'

function buildIconUrl(slug: string): string {
	const normalized = slug
		.trim()
		.toLowerCase()
		.replace(/[()'"]/g, '')
		.replace(/\s+/g, '-')
		.replace(/[^\w.!&-]/g, '')
	return `${ICONS_CDN}/protocols/${normalized}?w=48&h=48`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { slug } = req.query

	if (!slug || typeof slug !== 'string') {
		return res.status(400).json({ error: 'slug parameter is required' })
	}

	try {
		const url = buildIconUrl(slug)
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
		console.log('Error fetching icon:', error)
		res.status(500).json({ error: 'Failed to fetch icon' })
	}
}
