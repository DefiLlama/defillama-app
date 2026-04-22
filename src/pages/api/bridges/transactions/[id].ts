import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBridgeTransactions } from '~/containers/Bridges/api'

export const config = {
	api: {
		responseLimit: false
	}
}

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		res.setHeader('Cache-Control', 'no-store')
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const idParam = getQueryParam(req.query.id)
	const startParam = getQueryParam(req.query.starttimestamp)
	const endParam = getQueryParam(req.query.endtimestamp)

	if (!idParam) {
		res.setHeader('Cache-Control', 'no-store')
		return res.status(400).json({ error: 'id parameter is required' })
	}

	const startTimestamp = Number(startParam)
	const endTimestamp = Number(endParam)

	if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
		res.setHeader('Cache-Control', 'no-store')
		return res.status(400).json({ error: 'starttimestamp and endtimestamp must be valid numbers' })
	}

	if (startTimestamp >= endTimestamp) {
		res.setHeader('Cache-Control', 'no-store')
		return res.status(400).json({ error: 'starttimestamp must be less than endtimestamp' })
	}

	try {
		const data = await fetchBridgeTransactions(idParam, startTimestamp, endTimestamp)
		res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
		return res.status(200).json(data)
	} catch (error) {
		res.setHeader('Cache-Control', 'no-store')
		console.error(`Failed to fetch bridge transactions for ${idParam}:`, error)
		return res.status(500).json({ error: 'Failed to fetch bridge transactions' })
	}
}
