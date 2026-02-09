import type { NextApiRequest, NextApiResponse } from 'next'
import { annualizeFunding, postInfo } from '~/utils/hyperliquid'

type HlVenueEntry = [string, { fundingRate: string; nextFundingTime: number } | null]
type HlPredictedRow = [string, HlVenueEntry[]]

export interface PredictedFunding {
	coin: string
	hlRate: number | null
	binanceRate: number | null
	bybitRate: number | null
	spread: number | null
	nextFundingTime: number | null
	venueRates: Record<string, number | null>
	bestCexRate: number | null
	spreadToBestCex: number | null
}

const CEX_VENUES = ['BinPerp', 'BybitPerp', 'OkxPerp']

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<PredictedFunding[] | { error: string }>
) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const raw = await postInfo<HlPredictedRow[]>({ type: 'predictedFundings' })

		const result: PredictedFunding[] = raw.map(([coin, venues]) => {
			const venueMap = new Map(
				venues.filter(([, info]) => info != null) as [string, { fundingRate: string; nextFundingTime: number }][]
			)
			const venueRates: Record<string, number | null> = {}

			for (const [name, info] of venueMap.entries()) {
				const isHl = name === 'HlPerp'
				venueRates[name] = annualizeFunding(info.fundingRate, isHl ? 'hourly' : '8h')
			}

			const hlRate = venueRates.HlPerp ?? null
			const binanceRate = venueRates.BinPerp ?? null
			const bybitRate = venueRates.BybitPerp ?? null
			const nextFundingTime = venueMap.get('HlPerp')?.nextFundingTime ?? null

			const cexRates = CEX_VENUES.map((name) => venueRates[name]).filter((v): v is number => typeof v === 'number')
			const bestCexRate = cexRates.length > 0 ? Math.min(...cexRates) : null

			return {
				coin,
				hlRate,
				binanceRate,
				bybitRate,
				spread: hlRate != null && binanceRate != null ? hlRate - binanceRate : null,
				nextFundingTime,
				venueRates,
				bestCexRate,
				spreadToBestCex: hlRate != null && bestCexRate != null ? hlRate - bestCexRate : null
			}
		})

		res.setHeader('Cache-Control', 'public, max-age=60')
		return res.status(200).json(result)
	} catch (error) {
		console.log('Failed to fetch predicted fundings', error)
		return res.status(500).json({ error: 'Failed to fetch predicted fundings' })
	}
}
