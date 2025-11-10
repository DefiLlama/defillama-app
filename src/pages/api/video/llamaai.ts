import { createReadStream, statSync } from 'fs'
import { join } from 'path'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Handle OPTIONS for CORS
	if (req.method === 'OPTIONS') {
		res.setHeader('Access-Control-Allow-Origin', '*')
		res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
		res.setHeader('Access-Control-Allow-Headers', 'Range')
		res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')
		return res.status(200).end()
	}

	if (req.method !== 'GET' && req.method !== 'HEAD') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		const videoPath = join(process.cwd(), 'public', 'assets', 'llamaai.mp4')
		const videoStats = statSync(videoPath)
		const videoSize = videoStats.size
		// Generate ETag based on file modification time and size for cache validation
		const etag = `"${videoStats.mtime.getTime()}-${videoSize}"`

		// Parse Range header - check both Range and cf-range (Cloudflare)
		// Cloudflare may modify the Range header, so check multiple sources
		const rangeHeaderRaw = req.headers.range || req.headers['cf-range'] || req.headers['cf-requested-range']

		// Normalize to string (handle array case)
		const rangeHeader = Array.isArray(rangeHeaderRaw) ? rangeHeaderRaw[0] : rangeHeaderRaw

		// Check if client has cached version (If-None-Match header)
		const ifNoneMatch = req.headers['if-none-match']
		if (ifNoneMatch === etag && !rangeHeader) {
			// Client has current version, return 304 Not Modified
			res.writeHead(304, {
				ETag: etag,
				'Cache-Control': 'public, max-age=3600, must-revalidate'
			})
			return res.end()
		}

		// Debug logging (remove in production if needed)
		if (process.env.NODE_ENV === 'development') {
			console.log('Video request:', {
				method: req.method,
				range: rangeHeader,
				etag,
				ifNoneMatch,
				allHeaders: Object.keys(req.headers).filter((k) => k.toLowerCase().includes('range'))
			})
		}

		if (rangeHeader) {
			// Extract start and end from Range header (e.g., "bytes=0-1" or "bytes=0-")
			const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/)
			if (!rangeMatch) {
				// Invalid range format, send full file
				res.writeHead(200, {
					'Content-Length': videoSize,
					'Content-Type': 'video/mp4',
					'Accept-Ranges': 'bytes',
					// Use must-revalidate so Cloudflare checks with origin before serving cached content
					// This allows code changes to take effect while still benefiting from caching
					'Cache-Control': 'public, max-age=3600, must-revalidate',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges'
				})
				if (req.method === 'HEAD') {
					return res.end()
				}
				const videoStream = createReadStream(videoPath)
				videoStream.pipe(res)
				return
			}

			const start = parseInt(rangeMatch[1], 10)
			const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : videoSize - 1

			// Validate range
			if (start < 0 || start >= videoSize || end < start || end >= videoSize) {
				// Invalid range, send 416 Range Not Satisfiable
				res.writeHead(416, {
					'Content-Range': `bytes */${videoSize}`,
					'Accept-Ranges': 'bytes',
					'Content-Type': 'video/mp4'
				})
				return res.end()
			}

			const chunkSize = end - start + 1

			// Set headers for partial content
			// IMPORTANT: Use Cache-Control: no-cache for range requests to prevent Cloudflare caching issues
			// Cloudflare caches responses, but range requests need different cache keys based on Range header
			res.writeHead(206, {
				'Content-Range': `bytes ${start}-${end}/${videoSize}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunkSize.toString(),
				'Content-Type': 'video/mp4',
				// Don't cache range requests - Cloudflare doesn't handle them well
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
				// Vary header tells Cloudflare to cache different responses for different Range headers
				Vary: 'Range, Accept-Encoding',
				// Cloudflare-specific headers
				'X-Content-Type-Options': 'nosniff',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Allow-Headers': 'Range',
				'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges'
			})

			// For HEAD requests, don't send body
			if (req.method === 'HEAD') {
				return res.end()
			}

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
				ETag: etag,
				// Use must-revalidate so Cloudflare checks with origin before serving cached content
				// This allows code changes to take effect while still benefiting from caching
				// max-age=3600 means cache for 1 hour, but must revalidate with origin
				'Cache-Control': 'public, max-age=3600, must-revalidate',
				// Cloudflare-specific headers
				'X-Content-Type-Options': 'nosniff',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Allow-Headers': 'Range',
				'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges'
			})

			// For HEAD requests, don't send body
			if (req.method === 'HEAD') {
				return res.end()
			}

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
