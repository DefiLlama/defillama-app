import { MARKETS_SERVER_URL, RISK_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { TokenRiskBorrowCapacityResponse } from './api.types'
import type { TokenMarketsResponse } from './tokenMarkets.types'
import type { RiskTimelineResponse } from './tokenRiskTimeline.types'

export async function getTokenRiskBorrowCapacityFromNetwork(): Promise<TokenRiskBorrowCapacityResponse> {
	const data = await fetchJson<TokenRiskBorrowCapacityResponse>(`${RISK_SERVER_URL}/get-borrow-capacity-by-asset`)
	return data
}

export async function getTokenRiskBorrowCapacity(): Promise<TokenRiskBorrowCapacityResponse> {
	return getTokenRiskBorrowCapacityFromNetwork()
}

export async function getTokenRiskTimeline(tokenSymbol: string): Promise<RiskTimelineResponse> {
	const data = await fetchJson<RiskTimelineResponse>(
		`${RISK_SERVER_URL}/risk-timeline/${encodeURIComponent(tokenSymbol)}`
	)
	return data
}

export async function fetchTokenMarkets(tokenSymbol: string): Promise<TokenMarketsResponse> {
	return fetchJson<TokenMarketsResponse>(`/api/markets/${encodeURIComponent(tokenSymbol.toLowerCase())}`)
}

export async function hasTokenMarketsFromNetwork(tokenSymbol: string): Promise<boolean> {
	const url = `${MARKETS_SERVER_URL}/tokens/${encodeURIComponent(tokenSymbol.toLowerCase())}.json`
	try {
		const res = await fetch(url, { method: 'HEAD' })
		return res.ok
	} catch {
		return false
	}
}
