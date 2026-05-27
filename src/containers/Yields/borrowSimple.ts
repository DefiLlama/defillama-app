import type { ParsedUrlQuery } from 'querystring'
import { toQueryString } from '~/utils/routerQuery'

export type BorrowPageSearchItem = {
	name: string
	symbol: string
}

export type BorrowPageMetadata = {
	searchData: Record<string, BorrowPageSearchItem>
}

export type BorrowPageRow = {
	projectName: string
	totalAvailableUsd?: number | null
	chain: string
	pool: string | null
	poolMeta?: string | null
	tvlUsd: number
	borrow: {
		totalAvailableUsd?: number | null
		apyBorrow?: number | null
		apyBaseBorrow?: number | null
	}
	apyBaseBorrow?: number | null
	apyBase?: number | null
	apy?: number | null
	apyReward?: number | null
	apyRewardBorrow?: number | null
	ltv: number
}

export type BorrowPageRowsResponse = {
	rows: BorrowPageRow[]
	total: number
}

export const BORROW_ROW_QUERY_KEYS = ['borrow', 'collateral'] as const

export function buildBorrowRowsQueryString(query: ParsedUrlQuery): string | null {
	const borrow = typeof query.borrow === 'string' ? query.borrow : ''
	const collateral = typeof query.collateral === 'string' ? query.collateral : ''
	if (!borrow && !collateral) return null

	const rowQuery: Record<string, string | string[] | undefined> = {}
	for (const key of BORROW_ROW_QUERY_KEYS) {
		rowQuery[key] = query[key]
	}

	return toQueryString(rowQuery)
}
