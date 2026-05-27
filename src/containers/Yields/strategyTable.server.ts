import type { ParsedUrlQuery } from 'querystring'
import type { IResponseCGMarketsAPI } from '~/api/coingecko.types'
import { filterStrategyPool, findStrategyPools, type YieldStrategyCandidate } from './domain/strategyFilters'
import { decodeYieldsQuery } from './queryState'
import type { YieldStrategyTableRow } from './Tables/types'
import type { LendBorrowData, LendBorrowPool, YieldPool } from './types'
import { paginateAndSortRows, type YieldsTableSortAccessors } from './yieldsTablePagination.server'
import type { YieldStrategyPageResponse } from './yieldsTableQuery'

const STRATEGY_SORT_ACCESSORS: YieldsTableSortAccessors<YieldStrategyTableRow, keyof YieldStrategyTableRow> = {
	totalApy: (row) => row.totalApy,
	delta: (row) => row.delta,
	borrowAvailableUsd: (row) => row.borrowAvailableUsd,
	farmTvlUsd: (row) => row.farmTvlUsd,
	ltv: (row) => row.ltv
}

function getStringQueryValue(value: ParsedUrlQuery[string]): string | null {
	return typeof value === 'string' && value ? value : null
}

function getStrategyLendPools(data: LendBorrowData) {
	const pools: LendBorrowPool[] = []
	for (const pool of data.props.pools) {
		if (pool.category === 'CDP' ? pool.apyBorrow !== 0 : pool.apy > 0.01 && pool.apyBorrow !== 0) {
			pools.push({ ...pool, symbol: pool.symbol.toUpperCase() })
		}
	}
	return pools
}

function getStrategyFarmPools(data: LendBorrowData) {
	const pools: YieldPool[] = []
	for (const pool of data.props.allPools) {
		if (
			pool.ilRisk === 'no' &&
			pool.exposure === 'single' &&
			pool.apy > 0 &&
			pool.project !== 'babydogeswap' &&
			pool.project !== 'cbridge'
		) {
			pools.push({ ...pool, symbol: pool.symbol.toUpperCase() })
		}
	}
	return pools
}

export function buildYieldStrategyPageMetadata(data: LendBorrowData, cgList: Array<IResponseCGMarketsAPI>) {
	return {
		chainList: data.props.chainList,
		projectList: data.props.projectList,
		categoryList: data.props.categoryList,
		lendingProtocols: data.props.lendingProtocols,
		farmProtocols: data.props.farmProtocols,
		evmChains: data.props.evmChains,
		searchData: cgList.flat()
	}
}

function serializeStrategyRow(row: YieldStrategyCandidate): YieldStrategyTableRow {
	return {
		strategy: row.strategy,
		symbol: row.symbol,
		pool: row.pool,
		project: row.project,
		projectName: row.projectName,
		airdrop: row.airdrop,
		raiseValuation: row.raiseValuation,
		chains: row.chains ?? [row.chain],
		url: row.url ?? '',
		apy: row.apy,
		borrow: {
			pool: row.borrow.pool,
			symbol: row.borrow.symbol,
			apyBorrow: row.borrow.apyBorrow,
			totalAvailableUsd: row.borrow.totalAvailableUsd
		},
		farmPool: row.farmPool,
		farmSymbol: row.farmSymbol,
		farmTvlUsd: row.farmTvlUsd,
		farmProjectName: row.farmProjectName,
		farmApy: row.farmApy,
		totalApy: row.totalApy,
		delta: row.delta,
		ltv: row.ltv,
		strikeTvl: row.strikeTvl,
		borrowAvailableUsd: row.borrow.totalAvailableUsd
	}
}

export function buildYieldStrategyPageResponse(data: LendBorrowData, query: ParsedUrlQuery): YieldStrategyPageResponse {
	const lend = getStringQueryValue(query.lend)
	const borrow = getStringQueryValue(query.borrow)
	const decoded = decodeYieldsQuery(query, {
		projectList: data.props.projectList,
		chainList: data.props.chainList,
		categoryList: data.props.categoryList,
		lendingProtocols: data.props.lendingProtocols,
		farmProtocols: data.props.farmProtocols,
		evmChains: data.props.evmChains
	})
	const customLTV = decoded.customLTV

	const pools = getStrategyLendPools(data)
	const cdpPools = pools
		.filter((pool) => pool.category === 'CDP' && pool.mintedCoin)
		.map((pool) => ({ ...pool, chains: [pool.chain], borrow: { ...pool, symbol: pool.mintedCoin?.toUpperCase() } }))
	const lendingPools = pools.filter((pool) => pool.category !== 'CDP')
	const allPools = getStrategyFarmPools(data)
	const selectedChainsSet = new Set(decoded.selectedChains)
	const selectedLendingProtocolsSet = decoded.selectedLendingProtocols
		? new Set(decoded.selectedLendingProtocols)
		: null
	const selectedFarmProtocolsSet = decoded.selectedFarmProtocols ? new Set(decoded.selectedFarmProtocols) : null

	const rows: YieldStrategyTableRow[] = []
	const strategyPools = findStrategyPools({
		pools: lendingPools,
		tokenToLend: lend,
		tokenToBorrow: borrow,
		allPools,
		cdpRoutes: cdpPools,
		customLTV
	})

	for (const pool of strategyPools) {
		if (
			filterStrategyPool({
				pool,
				selectedChainsSet,
				selectedAttributes: decoded.selectedAttributes,
				minTvl: decoded.minTvl,
				maxTvl: decoded.maxTvl,
				minAvailable: decoded.minAvailable,
				maxAvailable: decoded.maxAvailable,
				selectedLendingProtocolsSet,
				selectedFarmProtocolsSet,
				customLTV
			})
		) {
			rows.push(serializeStrategyRow(pool))
		}
	}

	return paginateAndSortRows<YieldStrategyTableRow, keyof YieldStrategyTableRow>({
		rows,
		query,
		sortAccessors: STRATEGY_SORT_ACCESSORS
	})
}
