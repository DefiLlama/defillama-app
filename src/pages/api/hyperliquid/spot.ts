import type { NextApiRequest, NextApiResponse } from 'next'
import { num, postInfo } from '~/utils/hyperliquid'

interface SpotToken {
	name: string
	index: number
	isCanonical: boolean
}

interface SpotPair {
	name: string
	tokens: [number, number]
	index: number
	isCanonical: boolean
}

interface SpotAssetCtx {
	dayNtlVlm: string
	markPx: string
	midPx?: string
	prevDayPx: string
}

export interface SpotMarket {
	name: string
	markPx: number
	prevDayPx: number
	dayNtlVlm: number
	change24hPct: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SpotMarket[] | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const [meta, ctxs] = await postInfo<[{ tokens: SpotToken[]; universe: SpotPair[] }, SpotAssetCtx[]]>({
			type: 'spotMetaAndAssetCtxs'
		})

		const tokensByIndex = new Map(meta.tokens.map((t) => [t.index, t.name]))

		const resolveName = (name: string) =>
			name.replace(/@(\d+)/g, (_, idx) => tokensByIndex.get(Number(idx)) ?? `@${idx}`)

		const markets: SpotMarket[] = meta.universe
			.map((pair, i) => {
				const ctx = ctxs[i]
				if (!ctx) return null
				const markPx = num(ctx.markPx)
				const prevDayPx = num(ctx.prevDayPx)
				return {
					name: resolveName(pair.name),
					markPx,
					prevDayPx,
					dayNtlVlm: num(ctx.dayNtlVlm),
					change24hPct: prevDayPx ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0
				}
			})
			.filter((m): m is SpotMarket => m !== null && m.dayNtlVlm > 0)

		res.setHeader('Cache-Control', 'public, max-age=60')
		return res.status(200).json(markets)
	} catch (error) {
		console.log('Failed to fetch Hyperliquid spot data', error)
		return res.status(500).json({ error: 'Failed to fetch spot data' })
	}
}
