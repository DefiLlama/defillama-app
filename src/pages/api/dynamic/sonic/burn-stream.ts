import type { NextApiRequest, NextApiResponse } from 'next'

export const config = {
	api: {
		responseLimit: false
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive'
	})

	let upstream: Response | null = null
	const abortController = new AbortController()

	try {
		upstream = await fetch('https://burn.soniclabs.com/api/burn-stream', {
			headers: { Accept: 'text/event-stream' },
			signal: abortController.signal
		})

		if (!upstream.ok || !upstream.body) {
			res.write('event: error\ndata: {"error":"upstream_failed"}\n\n')
			res.end()
			return
		}

		const reader = upstream.body.getReader()
		const decoder = new TextDecoder()

		const pump = async () => {
			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					const chunk = decoder.decode(value, { stream: true })
					res.write(chunk)
				}
			} catch {
				// Connection closed or read error
			}
			res.end()
		}

		req.on('close', () => {
			abortController.abort()
			reader.cancel()
		})

		await pump()
	} catch {
		res.write('event: error\ndata: {"error":"connection_failed"}\n\n')
		res.end()
	}
}
