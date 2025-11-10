import { NextApiRequest, NextApiResponse } from 'next'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		const videoPath = join(process.cwd(), 'public', 'assets', 'llamaai.mp4')
		const videoStats = statSync(videoPath)
		const videoSize = videoStats.size

		// Parse Range header
		const range = req.headers.range

		if (range) {
			// Extract start and end from Range header (e.g., "bytes=0-1" or "bytes=0-")
			const parts = range.replace(/bytes=/, '').split('-')
			const start = parseInt(parts[0], 10)
			const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1
			const chunkSize = end - start + 1

			// Set headers for partial content
			res.writeHead(206, {
				'Content-Range': `bytes ${start}-${end}/${videoSize}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunkSize,
				'Content-Type': 'video/mp4',
				'Cache-Control': 'public, max-age=31536000, immutable'
			})

			// Create read stream for the requested range
			const videoStream = createReadStream(videoPath, { start, end })
			videoStream.on('error', (error) => {
				console.error('Stream error:', error)
				if (!res.headersSent) {
					res.status(500).json({ error: 'Stream error' })
				}
			})
			videoStream.pipe(res)
		} else {
			// No range requested, send entire file
			res.writeHead(200, {
				'Content-Length': videoSize,
				'Content-Type': 'video/mp4',
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'public, max-age=31536000, immutable'
			})
			const videoStream = createReadStream(videoPath)
			videoStream.on('error', (error) => {
				console.error('Stream error:', error)
				if (!res.headersSent) {
					res.status(500).json({ error: 'Stream error' })
				}
			})
			videoStream.pipe(res)
		}
	} catch (error) {
		console.error('Error serving video:', error)
		return res.status(500).json({ error: 'Failed to serve video' })
	}
}

