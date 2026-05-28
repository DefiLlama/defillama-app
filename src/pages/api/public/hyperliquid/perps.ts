import type { NextApiRequest, NextApiResponse } from 'next'
import { annualizeFunding, nullableNum, num, postInfo } from '~/utils/hyperliquid'

interface PerpAsset {
	name: string
	szDecimals: number
	maxLeverage: number
	onlyIsolated?: boolean
}

interface PerpAssetCtx {
	dayNtlVlm: string
	dayBaseVlm?: string
	funding: string
	openInterest: string
	markPx: string
	midPx?: string
	oraclePx: string
	prevDayPx: string
	premium?: string | null
	impactPxs?: [string, string] | null
}

export interface PerpMarket {
	name: string
	maxLeverage: number
	markPx: number
	prevDayPx: number
	dayNtlVlm: number
	openInterest: number
	funding: number
	fundingAnnualized: number
	change24hPct: number
	midPx?: number
	oraclePx?: number
	premium?: number | null
	impactBidPx?: number | null
	impactAskPx?: number | null
	dayBaseVlm?: number | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PerpMarket[] | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const [meta, ctxs] = await postInfo<[{ universe: PerpAsset[] }, PerpAssetCtx[]]>({ type: 'metaAndAssetCtxs' })

		const markets: PerpMarket[] = meta.universe.map((asset, i) => {
			const ctx = ctxs[i]
			const markPx = num(ctx?.markPx)
			const prevDayPx = num(ctx?.prevDayPx)
			const funding = num(ctx?.funding)
			const openInterestBase = num(ctx?.openInterest)
			const impactBidPx = nullableNum(ctx?.impactPxs?.[0])
			const impactAskPx = nullableNum(ctx?.impactPxs?.[1])
			return {
				name: asset.name,
				maxLeverage: asset.maxLeverage,
				markPx,
				prevDayPx,
				dayNtlVlm: num(ctx?.dayNtlVlm),
				openInterest: openInterestBase * markPx,
				funding,
				fundingAnnualized: annualizeFunding(funding, '8h') ?? 0,
				change24hPct: prevDayPx ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0,
				midPx: num(ctx?.midPx),
				oraclePx: num(ctx?.oraclePx),
				premium: nullableNum(ctx?.premium),
				impactBidPx,
				impactAskPx,
				dayBaseVlm: nullableNum(ctx?.dayBaseVlm)
			}
		})

		res.setHeader('Cache-Control', 'public, max-age=60')
		return res.status(200).json(markets)
	} catch (error) {
		console.log('Failed to fetch Hyperliquid perps data', error)
		return res.status(500).json({ error: 'Failed to fetch perps data' })
	}
}
