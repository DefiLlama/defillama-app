import { RISK_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { TokenRiskBorrowRoutesResponse, TokenRiskLendingExposuresResponse } from './api.types'

export async function getTokenRiskBorrowRoutes(): Promise<TokenRiskBorrowRoutesResponse> {
	const data = await fetchJson<TokenRiskBorrowRoutesResponse>(`${RISK_SERVER_URL}/get-borrow-routes`)
	return data
}

export async function getTokenRiskLendingExposures(): Promise<TokenRiskLendingExposuresResponse> {
	const data = await fetchJson<TokenRiskLendingExposuresResponse>(`${RISK_SERVER_URL}/get-lending-exposures`)
	return data
}
