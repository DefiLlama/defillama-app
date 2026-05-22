import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCexs } from '~/containers/Cexs/api'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

export interface ICexItem {
	name: string
	slug?: string
	coin?: string
	coinSymbol?: string
	walletsLink?: string
	url?: string | null
	cgId?: string
	cgDeriv?: string
	lastAuditDate?: number
	auditor?: string | null
	auditLink?: string
	tvl?: number
	cleanTvl?: number
	'24hInflows'?: number | null
	'7dInflows'?: number | null
	'1mInflows'?: number | null
	spotVolume?: number
	oi?: number
	leverage?: number
}

export async function getCexData(req: NextApiRequest, res: NextApiResponse) {
	let cexList: ICexItem[] = []

	try {
		const cexData = await fetchCexs()
		cexList = cexData.cexs.map((c) => ({
			...c,
			tvl: c.currentTvl ?? 0,
			cleanTvl: c.cleanAssetsTvl ?? 0,
			'24hInflows': c.inflows_24h ?? null,
			'7dInflows': c.inflows_1w ?? null,
			'1mInflows': c.inflows_1m ?? null
		}))
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
	}

	// Sort by cleanTvl descending
	const sortedCexs = cexList.sort((a, b) => (b.cleanTvl || 0) - (a.cleanTvl || 0))
	res.status(200).json(sortedCexs)
}

export default withApiRouteTelemetry('/api/datasets/cex', getCexData)
