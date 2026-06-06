import type { ParsedUrlQuery } from 'querystring'
import type { IResponseCGMarketsAPI } from '~/api/coingecko.types'
import type { BorrowPageMetadata, BorrowPageRow, BorrowPageSearchItem, BorrowPageRowsResponse } from './borrowSimple'
import { findOptimizerPools } from './domain/strategyFilters'
import type { LendBorrowData } from './queries.server'

const LAST_SORT_POSITION = Number.MAX_SAFE_INTEGER

function getSingleQueryValue(value: ParsedUrlQuery[string]): string | null {
	return typeof value === 'string' && value ? value : null
}

function buildSearchData(
	symbols: string[],
	cgList: Array<IResponseCGMarketsAPI>
): Record<string, BorrowPageSearchItem> {
	const cgPositions: Record<string, number> = {}
	for (let index = 0; index < cgList.length; index += 1) {
		cgPositions[cgList[index].symbol] = index
	}

	const sortedSymbols = [...symbols]
	sortedSymbols.sort((a, b) => (cgPositions[a] ?? LAST_SORT_POSITION) - (cgPositions[b] ?? LAST_SORT_POSITION))

	const searchData: Record<string, BorrowPageSearchItem> = {
		USD_STABLES: {
			name: 'All USD Stablecoins',
			symbol: 'USD_STABLES'
		}
	}

	for (const rawSymbol of sortedSymbols) {
		const symbol = rawSymbol.replaceAll(/\(.*\)/g, '').trim()
		if (!symbol || searchData[symbol]) continue
		searchData[symbol] = {
			name: symbol,
			symbol
		}
	}

	return searchData
}

function getBorrowPools(data: LendBorrowData) {
	const pools = data.props.pools ?? []
	const cdpPools = []
	const lendingPools = []

	for (const pool of pools) {
		if ((pool.category === 'CDP' && pool.mintedCoin) || (pool.category === 'Lending' && pool.mintedCoin)) {
			cdpPools.push({
				...pool,
				chains: [pool.chain],
				borrow: {
					...pool,
					symbol: pool.mintedCoin.toUpperCase()
				}
			})
			continue
		}

		if (pool.category !== 'CDP' && !pool.mintedCoin) {
			lendingPools.push({
				...pool,
				symbol: pool.symbol.toUpperCase()
			})
		}
	}

	return {
		cdpPools,
		lendingPools
	}
}

function serializeBorrowPageRow(row): BorrowPageRow {
	return {
		projectName: row.projectName,
		totalAvailableUsd: row.totalAvailableUsd,
		chain: row.chain,
		pool: row.pool,
		poolMeta: row.poolMeta,
		tvlUsd: row.tvlUsd,
		borrow: {
			totalAvailableUsd: row.borrow?.totalAvailableUsd,
			apyBorrow: row.borrow?.apyBorrow,
			apyBaseBorrow: row.borrow?.apyBaseBorrow
		},
		apyBaseBorrow: row.apyBaseBorrow,
		apyBase: row.apyBase,
		apy: row.apy,
		apyReward: row.apyReward,
		apyRewardBorrow: row.apyRewardBorrow,
		ltv: row.ltv
	}
}

export function buildBorrowPageMetadata(
	data: LendBorrowData,
	cgList: Array<IResponseCGMarketsAPI>
): BorrowPageMetadata {
	return {
		searchData: buildSearchData(data.props.symbols ?? [], cgList)
	}
}

export function buildBorrowPageRows(data: LendBorrowData, query: ParsedUrlQuery): BorrowPageRowsResponse {
	const borrow = getSingleQueryValue(query.borrow)
	const collateral = getSingleQueryValue(query.collateral)
	if (!borrow && !collateral) {
		return {
			rows: [],
			total: 0
		}
	}

	const { cdpPools, lendingPools } = getBorrowPools(data)
	const optimizerPools = findOptimizerPools({
		pools: lendingPools,
		tokenToLend: collateral,
		tokenToBorrow: borrow,
		cdpRoutes: cdpPools
	})

	const rows: BorrowPageRow[] = []
	for (const pool of optimizerPools) {
		rows.push(serializeBorrowPageRow(pool))
	}

	return {
		rows,
		total: rows.length
	}
}
