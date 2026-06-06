import type { ParsedUrlQuery } from 'querystring'
import { toQueryString } from '~/utils/routerQuery'

export type BorrowAdvancedSearchItem = {
	name: string
	symbol: string
	image: string
	image2: string
}

export type BorrowAdvancedPageMetadata = {
	chainList: string[]
	lendingProtocols: string[]
	searchData: BorrowAdvancedSearchItem[]
	evmChains: string[]
}

export type BorrowAdvancedRow = {
	pool: string
	symbol: string
	chain: string
	chains: string[]
	project: string
	projectName: string
	airdrop?: boolean
	raiseValuation?: number | null
	configID: string
	url: string
	underlyingTokens?: string[]
	exposure?: string
	ltv?: number | null
	strikeTvl?: boolean
	rewardTokensNames?: string[]
	rewardTokensSymbols?: string[]
	borrow: {
		pool?: string
		symbol: string
		totalAvailableUsd?: number | null
		underlyingTokens?: string[]
	}
	borrowAvailableUsd?: number | null
	borrowBase?: number | null
	totalBase?: number | null
	lendingBase?: number | null
	totalReward?: number | null
	lendingReward?: number | null
	borrowReward?: number | null
	totalSupplyUsd?: number | null
	totalBorrowUsd?: number | null
	lendUSDAmount?: number
	borrowUSDAmount?: number
	lendAmount?: number
	borrowAmount?: number
}

export const BORROW_ADVANCED_ROW_QUERY_KEYS = [
	'lend',
	'borrow',
	'chain',
	'excludeChain',
	'lendingProtocol',
	'excludeLendingProtocol',
	'attribute',
	'excludeAttribute',
	'minAvailable',
	'maxAvailable',
	'customLTV'
] as const

export function buildBorrowAdvancedRowsQueryString(query: ParsedUrlQuery): string | null {
	if (typeof query.lend !== 'string' || typeof query.borrow !== 'string' || !query.lend || !query.borrow) return null

	const rowQuery: Record<string, string | string[] | undefined> = {}
	for (const key of BORROW_ADVANCED_ROW_QUERY_KEYS) {
		rowQuery[key] = query[key]
	}

	return toQueryString(rowQuery)
}
