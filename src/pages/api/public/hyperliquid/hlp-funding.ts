import type { NextApiRequest, NextApiResponse } from 'next'
import { HLP_VAULTS, type HlpVaultKey, num, resolveWindowStart, safePostInfo } from '~/utils/hyperliquid'

interface RawFundingEvent {
	delta: {
		coin: string
		fundingRate: string
		szi: string
		usdc: string
		type: string
		nSamples?: number | null
	}
	hash: string
	time: number
}

export interface HlpFundingEvent {
	coin: string
	fundingRate: number
	szi: number
	usdc: number
	time: number
	hash: string
	vault: HlpVaultKey
}

export interface HlpFundingData {
	window: '24h' | '7d' | '30d'
	totalUsdc: number
	byVault: Record<HlpVaultKey, number>
	events: HlpFundingEvent[]
}

function normalizeWindow(window: string | undefined): '24h' | '7d' | '30d' {
	if (window === '7d' || window === '30d' || window === '24h') return window
	return '24h'
}

function mapFunding(raw: RawFundingEvent[], vault: HlpVaultKey): HlpFundingEvent[] {
	return raw
		.filter((event) => event?.delta?.type === 'funding')
		.map((event) => ({
			coin: event.delta.coin,
			fundingRate: num(event.delta.fundingRate),
			szi: num(event.delta.szi),
			usdc: num(event.delta.usdc),
			time: event.time,
			hash: event.hash,
			vault
		}))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HlpFundingData | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const window = normalizeWindow(typeof req.query.window === 'string' ? req.query.window : undefined)
	const startTime = resolveWindowStart(window)

	try {
		const [fundingA, fundingB] = await Promise.all([
			safePostInfo<RawFundingEvent[]>({ type: 'userFunding', user: HLP_VAULTS.A, startTime }, [], 9000),
			safePostInfo<RawFundingEvent[]>({ type: 'userFunding', user: HLP_VAULTS.B, startTime }, [], 9000)
		])

		const mappedA = mapFunding(fundingA, 'A')
		const mappedB = mapFunding(fundingB, 'B')
		const events = [...mappedA, ...mappedB].sort((a, b) => b.time - a.time)

		const byVault = {
			A: mappedA.reduce((sum, event) => sum + event.usdc, 0),
			B: mappedB.reduce((sum, event) => sum + event.usdc, 0)
		}

		const payload: HlpFundingData = {
			window,
			totalUsdc: byVault.A + byVault.B,
			byVault,
			events
		}

		res.setHeader('Cache-Control', 'public, max-age=30')
		return res.status(200).json(payload)
	} catch (error) {
		console.log('Failed to fetch HLP funding history', error)
		return res.status(500).json({ error: 'Failed to fetch HLP funding history' })
	}
}
