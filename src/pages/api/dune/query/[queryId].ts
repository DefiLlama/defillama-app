import type { NextApiRequest, NextApiResponse } from 'next'

const DUNE_API_URL = 'https://api.dune.com/api/v1'
const DUNE_API_KEY = process.env.DUNE_API_KEY

const ALLOWED_QUERY_IDS = new Set([
	'5441979',
	'5519671',
	'5747940',
	'5870774',
	'5695247',
	'5582217',
	'5524703',
	'5449746',
	'5305217',
	'5305223',
	'5449825'
])

const cache = new Map<string, { data: unknown; fetchedAt: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const refreshing = new Set<string>()

function refreshInBackground(queryId: string) {
	if (refreshing.has(queryId)) return
	refreshing.add(queryId)
	console.log(`[dune] background REFRESH started query=${queryId}`)

	fetch(`${DUNE_API_URL}/query/${queryId}/results`, {
		headers: { 'X-Dune-API-Key': 'YdjmcWGRqalcfxfIdyqCH0e7jIRHJzUL' }
	})
		.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
		.then((data) => {
			cache.set(queryId, { data, fetchedAt: Date.now() })
			console.log(`[dune] background REFRESH done query=${queryId}`)
		})
		.catch((err) => console.log(`[dune] background REFRESH failed query=${queryId}`, err))
		.finally(() => refreshing.delete(queryId))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { queryId } = req.query
	if (typeof queryId !== 'string' || !ALLOWED_QUERY_IDS.has(queryId)) {
		return res.status(400).json({ error: 'Invalid query ID' })
	}

	if (!DUNE_API_KEY) {
		return res.status(500).json({ error: 'DUNE_API_KEY not configured' })
	}

	const cached = cache.get(queryId)

	if (cached) {
		const ageMs = Date.now() - cached.fetchedAt
		const isStale = ageMs >= CACHE_TTL_MS
		console.log(`[dune] cache HIT query=${queryId} age=${Math.round(ageMs / 1000)}s stale=${isStale}`)
		if (isStale) refreshInBackground(queryId)
		res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
		return res.status(200).json(cached.data)
	}

	console.log(`[dune] cache MISS query=${queryId}, fetching from Dune API`)

	try {
		const response = await fetch(`${DUNE_API_URL}/query/${queryId}/results`, {
			headers: { 'X-Dune-API-Key': DUNE_API_KEY }
		})

		if (!response.ok) {
			console.log(`[dune] Dune API error query=${queryId} status=${response.status}`)
			return res.status(response.status).json({ error: `Dune API error: ${response.status}` })
		}

		const data = await response.json()
		cache.set(queryId, { data, fetchedAt: Date.now() })
		console.log(`[dune] cache SET query=${queryId}`)

		res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
		return res.status(200).json(data)
	} catch (error) {
		console.log('Failed to fetch Dune query results', error)
		return res.status(500).json({ error: 'Failed to fetch Dune data' })
	}
}
