import { MARKETS_SERVER_URL, RISK_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { TokenRiskBorrowCapacityResponse } from './api.types'
import type { TokenMarketsListResponse, TokenMarketsResponse } from './tokenMarkets.types'
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

export async function fetchTokenMarketsListFromNetwork(): Promise<TokenMarketsListResponse> {
	return fetchJson<TokenMarketsListResponse>(`${MARKETS_SERVER_URL}/tokens/list.json`)
}
