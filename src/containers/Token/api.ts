import { RISK_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { TokenRiskBorrowCapacityResponse, TokenRiskBorrowRoutesResponse } from './api.types'

export async function getTokenRiskBorrowRoutes(): Promise<TokenRiskBorrowRoutesResponse> {
	const data = await fetchJson<TokenRiskBorrowRoutesResponse>(`${RISK_SERVER_URL}/get-borrow-routes`)
	return data
}

export async function getTokenRiskBorrowCapacity(): Promise<TokenRiskBorrowCapacityResponse> {
	const data = await fetchJson<TokenRiskBorrowCapacityResponse>(`${RISK_SERVER_URL}/get-borrow-capacity-by-asset`)
	return data
}
