import { RISK_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { TokenRiskBorrowRoutesResponse, TokenRiskLendingRisksResponse } from './api.types'

export async function getTokenRiskBorrowRoutes(): Promise<TokenRiskBorrowRoutesResponse> {
	const data = await fetchJson<TokenRiskBorrowRoutesResponse>(`${RISK_SERVER_URL}/get-borrow-routes`)
	return data
}

export async function getTokenRiskLendingRisks(tokenChainAndAddress: string): Promise<TokenRiskLendingRisksResponse> {
	const data = await fetchJson<TokenRiskLendingRisksResponse>(
		`${RISK_SERVER_URL}/get-lending-risks/${tokenChainAndAddress}`
	)
	return data
}
