import { RISK_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { TokenRiskBorrowCapacityResponse } from './api.types'
import type { RiskTimelineResponse } from './tokenRiskTimeline.types'

export async function getTokenRiskBorrowCapacity(): Promise<TokenRiskBorrowCapacityResponse> {
	const data = await fetchJson<TokenRiskBorrowCapacityResponse>(`${RISK_SERVER_URL}/get-borrow-capacity-by-asset`)
	return data
}

export async function getTokenRiskTimeline(tokenSymbol: string): Promise<RiskTimelineResponse> {
	const data = await fetchJson<RiskTimelineResponse>(
		`${RISK_SERVER_URL}/risk-timeline/${encodeURIComponent(tokenSymbol)}`
	)
	return data
}
