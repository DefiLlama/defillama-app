import type { NextApiRequest, NextApiResponse } from 'next'
import { HLP_VAULTS, type HlpVaultKey, num, nullableNum, safePostInfo } from '~/utils/hyperliquid'

interface RawPosition {
	type: 'oneWay'
	position: {
		coin: string
		szi: string
		leverage: { type: 'isolated' | 'cross'; value: number; rawUsd?: string }
		entryPx: string
		positionValue: string
		unrealizedPnl: string
		returnOnEquity: string
		liquidationPx: string | null
		marginUsed: string
		maxLeverage: number
		cumFunding: { allTime: string; sinceOpen: string; sinceChange: string }
	}
}

interface RawMarginSummary {
	accountValue: string
	totalNtlPos: string
	totalRawUsd: string
	totalMarginUsed: string
}

interface RawClearinghouse {
	marginSummary: RawMarginSummary
	crossMarginSummary?: RawMarginSummary
	crossMaintenanceMarginUsed?: string
	withdrawable?: string
	time?: number
	assetPositions: RawPosition[]
}

interface RawFill {
	coin: string
	px: string
	sz: string
	side: 'B' | 'A' | 'S'
	time: number
	closedPnl: string
	tid: number
	fee?: string
	feeToken?: string
	builderFee?: string
	dir?: string
	hash?: string
	oid?: number
}

export interface HlpPosition {
	coin: string
	side: 'Long' | 'Short'
	size: number
	entryPx: number
	positionValue: number
	unrealizedPnl: number
	roe: number
	leverage: number
	leverageType: 'cross' | 'isolated'
	liquidationPx: number | null
	marginUsed: number
	cumFundingSinceOpen: number
	vault: HlpVaultKey
}

export interface HlpFill {
	coin: string
	side: 'Buy' | 'Sell'
	px: number
	sz: number
	time: number
	closedPnl: number
	tid: number
	fee: number
	feeToken: string | null
	builderFee: number
	dir: string | null
	hash: string | null
	oid: number | null
	vault: HlpVaultKey
}

export interface HlpData {
	summary: {
		accountValue: number
		totalNtlPos: number
		totalMarginUsed: number
		positionCount: number
		withdrawable: number
		crossMaintenanceMarginUsed: number
		snapshotTime: number | null
	}
	positions: HlpPosition[]
	recentFills: HlpFill[]
}

function mapPositions(raw: RawClearinghouse, vault: HlpVaultKey): HlpPosition[] {
	return (raw.assetPositions ?? []).map((ap) => {
		const p = ap.position
		const szi = num(p?.szi)
		return {
			coin: p.coin,
			side: szi >= 0 ? 'Long' : 'Short',
			size: Math.abs(szi),
			entryPx: num(p.entryPx),
			positionValue: num(p.positionValue),
			unrealizedPnl: num(p.unrealizedPnl),
			roe: num(p.returnOnEquity) * 100,
			leverage: num(p.leverage?.value),
			leverageType: p.leverage?.type ?? 'cross',
			liquidationPx: nullableNum(p.liquidationPx),
			marginUsed: num(p.marginUsed),
			cumFundingSinceOpen: num(p.cumFunding?.sinceOpen),
			vault
		}
	})
}

function mapFills(raw: RawFill[], vault: HlpVaultKey): HlpFill[] {
	return raw.map((f) => ({
		coin: f.coin,
		side: f.side === 'B' ? 'Buy' : 'Sell',
		px: num(f.px),
		sz: num(f.sz),
		time: f.time,
		closedPnl: num(f.closedPnl),
		tid: f.tid,
		fee: num(f.fee),
		feeToken: f.feeToken ?? null,
		builderFee: num(f.builderFee),
		dir: f.dir ?? null,
		hash: f.hash ?? null,
		oid: f.oid ?? null,
		vault
	}))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HlpData | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const [chA, chB, fillsA, fillsB] = await Promise.all([
			safePostInfo<RawClearinghouse>(
				{ type: 'clearinghouseState', user: HLP_VAULTS.A },
				{
					marginSummary: { accountValue: '0', totalNtlPos: '0', totalRawUsd: '0', totalMarginUsed: '0' },
					assetPositions: []
				},
				9000
			),
			safePostInfo<RawClearinghouse>(
				{ type: 'clearinghouseState', user: HLP_VAULTS.B },
				{
					marginSummary: { accountValue: '0', totalNtlPos: '0', totalRawUsd: '0', totalMarginUsed: '0' },
					assetPositions: []
				},
				9000
			),
			safePostInfo<RawFill[]>({ type: 'userFills', user: HLP_VAULTS.A, aggregateByTime: true }, [], 9000),
			safePostInfo<RawFill[]>({ type: 'userFills', user: HLP_VAULTS.B, aggregateByTime: true }, [], 9000)
		])

		const positionsA = mapPositions(chA, 'A')
		const positionsB = mapPositions(chB, 'B')
		const positions = [...positionsA, ...positionsB]

		const allFills = [...mapFills(fillsA, 'A'), ...mapFills(fillsB, 'B')].sort((a, b) => b.time - a.time).slice(0, 200)

		const data: HlpData = {
			summary: {
				accountValue: num(chA.marginSummary?.accountValue) + num(chB.marginSummary?.accountValue),
				totalNtlPos: num(chA.marginSummary?.totalNtlPos) + num(chB.marginSummary?.totalNtlPos),
				totalMarginUsed: num(chA.marginSummary?.totalMarginUsed) + num(chB.marginSummary?.totalMarginUsed),
				positionCount: positions.length,
				withdrawable: num(chA.withdrawable) + num(chB.withdrawable),
				crossMaintenanceMarginUsed: num(chA.crossMaintenanceMarginUsed) + num(chB.crossMaintenanceMarginUsed),
				snapshotTime: Math.max(chA.time ?? 0, chB.time ?? 0) || null
			},
			positions,
			recentFills: allFills
		}

		res.setHeader('Cache-Control', 'public, max-age=30')
		return res.status(200).json(data)
	} catch (error) {
		console.log('Failed to fetch HLP positions', error)
		return res.status(500).json({ error: 'Failed to fetch HLP positions' })
	}
}
