import type { NextApiRequest, NextApiResponse } from 'next'

const ALLOWED_HOSTS = new Set(['icons.llamao.fi', 'token-icons.llamao.fi'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { url } = req.query

	if (!url || typeof url !== 'string') {
		return res.status(400).json({ error: 'url parameter is required' })
	}

	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return res.status(400).json({ error: 'invalid url' })
	}

	if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
		return res.status(403).json({ error: 'host not allowed' })
	}

	try {
		const response = await fetch(parsed.toString())
		if (!response.ok) {
			return res.status(response.status).json({ error: 'failed to fetch icon' })
		}
		const arrayBuffer = await response.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)
		res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png')
		res.setHeader('Cache-Control', 'public, max-age=86400')
		res.send(buffer)
	} catch (error) {
		console.log('Error proxying icon:', error)
		res.status(502).json({ error: 'failed to fetch icon' })
	}
}
