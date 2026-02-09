import type { NextApiRequest, NextApiResponse } from 'next'
import { num, postInfo } from '~/utils/hyperliquid'

export interface HyperliquidBookLevel {
	px: number
	sz: number
	n: number
}

export interface HyperliquidL2Book {
	coin: string
	time: number
	levels: [HyperliquidBookLevel[], HyperliquidBookLevel[]]
}

interface RawBookLevel {
	px: string
	sz: string
	n: number
}

interface RawBook {
	coin: string
	time: number
	levels: [RawBookLevel[], RawBookLevel[]]
}

function mapLevels(levels: RawBookLevel[] = []): HyperliquidBookLevel[] {
	return levels.map((level) => ({
		px: num(level.px),
		sz: num(level.sz),
		n: num(level.n)
	}))
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<HyperliquidL2Book | { error: string }>
) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const coin = typeof req.query.coin === 'string' ? req.query.coin.toUpperCase() : 'BTC'
	const nSigFigs = typeof req.query.nSigFigs === 'string' ? Number(req.query.nSigFigs) : undefined
	const mantissa = typeof req.query.mantissa === 'string' ? Number(req.query.mantissa) : null

	try {
		const payload: Record<string, unknown> = { type: 'l2Book', coin }
		if (Number.isFinite(nSigFigs)) payload.nSigFigs = nSigFigs
		if (mantissa != null && Number.isFinite(mantissa)) payload.mantissa = mantissa

		const raw = await postInfo<RawBook>(payload, 7000)

		const response: HyperliquidL2Book = {
			coin,
			time: raw.time ?? Date.now(),
			levels: [mapLevels(raw.levels?.[0]), mapLevels(raw.levels?.[1])]
		}

		res.setHeader('Cache-Control', 'public, max-age=10')
		return res.status(200).json(response)
	} catch (error) {
		console.log('Failed to fetch l2 book', error)
		return res.status(500).json({ error: 'Failed to fetch l2 book' })
	}
}
