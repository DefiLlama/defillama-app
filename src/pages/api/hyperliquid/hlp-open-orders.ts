import type { NextApiRequest, NextApiResponse } from 'next'
import { HLP_VAULTS, HlpVaultKey, num, safePostInfo } from '~/utils/hyperliquid'

interface RawOpenOrder {
	coin: string
	limitPx: string
	oid: number
	side: 'A' | 'B' | 'S'
	sz: string
	timestamp: number
}

export interface HlpOpenOrder {
	coin: string
	limitPx: number
	oid: number
	side: 'Buy' | 'Sell'
	sz: number
	timestamp: number
	vault: HlpVaultKey
}

function mapOrders(raw: RawOpenOrder[], vault: HlpVaultKey): HlpOpenOrder[] {
	return raw.map((order) => ({
		coin: order.coin,
		limitPx: num(order.limitPx),
		oid: order.oid,
		side: order.side === 'B' ? 'Buy' : 'Sell',
		sz: num(order.sz),
		timestamp: order.timestamp,
		vault
	}))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HlpOpenOrder[] | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const [ordersA, ordersB] = await Promise.all([
			safePostInfo<RawOpenOrder[]>({ type: 'openOrders', user: HLP_VAULTS.A }, [], 8000),
			safePostInfo<RawOpenOrder[]>({ type: 'openOrders', user: HLP_VAULTS.B }, [], 8000)
		])

		const combined = [...mapOrders(ordersA, 'A'), ...mapOrders(ordersB, 'B')]
		res.setHeader('Cache-Control', 'public, max-age=30')
		return res.status(200).json(combined)
	} catch (error) {
		console.log('Failed to fetch HLP open orders', error)
		return res.status(500).json({ error: 'Failed to fetch HLP open orders' })
	}
}
