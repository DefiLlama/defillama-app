import type { NextApiRequest, NextApiResponse } from 'next'
import { num, postInfo } from '~/utils/hyperliquid'

export interface HyperliquidCandle {
	t: number
	T: number
	s: string
	i: string
	o: number
	c: number
	h: number
	l: number
	v: number
	n: number
}

interface RawCandle {
	t: number
	T: number
	s: string
	i: string
	o: string | number
	c: string | number
	h: string | number
	l: string | number
	v: string | number
	n: number
}

const INTERVAL_TO_MS: Record<string, number> = {
	'1m': 60_000,
	'3m': 3 * 60_000,
	'5m': 5 * 60_000,
	'15m': 15 * 60_000,
	'30m': 30 * 60_000,
	'1h': 60 * 60_000,
	'4h': 4 * 60 * 60_000,
	'1d': 24 * 60 * 60_000
}

function normalizeInterval(interval: string | undefined) {
	return interval && INTERVAL_TO_MS[interval] ? interval : '1m'
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<HyperliquidCandle[] | { error: string }>
) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const coin = typeof req.query.coin === 'string' ? req.query.coin.toUpperCase() : 'BTC'
	const interval = normalizeInterval(typeof req.query.interval === 'string' ? req.query.interval : '1m')
	const requestedLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200
	const limit = Math.max(20, Math.min(500, Number.isFinite(requestedLimit) ? requestedLimit : 200))
	const endTime = Date.now()
	const startTime = endTime - INTERVAL_TO_MS[interval] * limit

	try {
		const raw = await postInfo<RawCandle[]>(
			{
				type: 'candleSnapshot',
				req: {
					coin,
					interval,
					startTime,
					endTime
				}
			},
			7000
		)

		const candles = raw
			.map((candle) => ({
				t: candle.t,
				T: candle.T,
				s: candle.s,
				i: candle.i,
				o: num(candle.o),
				c: num(candle.c),
				h: num(candle.h),
				l: num(candle.l),
				v: num(candle.v),
				n: num(candle.n)
			}))
			.filter((candle) => candle.t > 0)
			.slice(-limit)

		res.setHeader('Cache-Control', 'public, max-age=10')
		return res.status(200).json(candles)
	} catch (error) {
		console.log('Failed to fetch candles', error)
		return res.status(500).json({ error: 'Failed to fetch candles' })
	}
}
