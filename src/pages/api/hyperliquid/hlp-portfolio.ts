import type { NextApiRequest, NextApiResponse } from 'next'
import { HLP_VAULTS, HlpVaultKey, num, safePostInfo } from '~/utils/hyperliquid'

interface RawPortfolioBucket {
	accountValueHistory?: [number, string][]
	pnlHistory?: [number, string][]
	vlm?: string
}

type RawPortfolio = [string, RawPortfolioBucket][]

export interface HlpPortfolioPoint {
	time: number
	accountValue: number
	pnl: number
}

export interface HlpPortfolioData {
	window: 'day' | 'week' | 'month' | 'allTime'
	volume: number
	points: HlpPortfolioPoint[]
	byVaultVolume: Record<HlpVaultKey, number>
}

function normalizeWindow(window: string | undefined): 'day' | 'week' | 'month' | 'allTime' {
	if (window === 'week' || window === 'month' || window === 'allTime') return window
	return 'day'
}

function getWindowBucket(raw: RawPortfolio, window: 'day' | 'week' | 'month' | 'allTime'): RawPortfolioBucket {
	const map = new Map(raw)
	const preferredKey = window === 'allTime' ? 'perpAllTime' : `perp${window[0].toUpperCase()}${window.slice(1)}`
	return map.get(preferredKey) ?? map.get(window) ?? {}
}

function collectHistoryPoints(bucket: RawPortfolioBucket, target: Map<number, HlpPortfolioPoint>, vaultWeight = 1) {
	for (const [time, value] of bucket.accountValueHistory ?? []) {
		const existing = target.get(time) ?? { time, accountValue: 0, pnl: 0 }
		existing.accountValue += num(value) * vaultWeight
		target.set(time, existing)
	}
	for (const [time, value] of bucket.pnlHistory ?? []) {
		const existing = target.get(time) ?? { time, accountValue: 0, pnl: 0 }
		existing.pnl += num(value) * vaultWeight
		target.set(time, existing)
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HlpPortfolioData | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const window = normalizeWindow(typeof req.query.window === 'string' ? req.query.window : undefined)

	try {
		const [portfolioA, portfolioB] = await Promise.all([
			safePostInfo<RawPortfolio>({ type: 'portfolio', user: HLP_VAULTS.A }, [], 9000),
			safePostInfo<RawPortfolio>({ type: 'portfolio', user: HLP_VAULTS.B }, [], 9000)
		])

		const bucketA = getWindowBucket(portfolioA, window)
		const bucketB = getWindowBucket(portfolioB, window)

		const pointsMap = new Map<number, HlpPortfolioPoint>()
		collectHistoryPoints(bucketA, pointsMap)
		collectHistoryPoints(bucketB, pointsMap)

		const byVaultVolume = {
			A: num(bucketA.vlm),
			B: num(bucketB.vlm)
		}

		const payload: HlpPortfolioData = {
			window,
			volume: byVaultVolume.A + byVaultVolume.B,
			points: [...pointsMap.values()].sort((a, b) => a.time - b.time),
			byVaultVolume
		}

		res.setHeader('Cache-Control', 'public, max-age=30')
		return res.status(200).json(payload)
	} catch (error) {
		console.log('Failed to fetch HLP portfolio', error)
		return res.status(500).json({ error: 'Failed to fetch HLP portfolio' })
	}
}
