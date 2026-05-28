import type { ParsedUrlQuery } from 'querystring'
import type { IResponseCGMarketsAPI } from '~/api/coingecko.types'
import { calculateLoopAPY } from './domain/loopApy'
import { filterYieldPools } from './domain/poolFilters'
import { mapPoolToLoopTableRow } from './domain/poolRows'
import type { YieldLoopTableRow } from './Tables/types'
import type { LendBorrowData } from './types'
import { buildYieldTokenOptions, getYieldPoolFilterState } from './yieldsTable.server'
import { paginateAndSortRows, type YieldsTableSortAccessors } from './yieldsTablePagination.server'
import type { YieldLoopPageResponse } from './yieldsTableQuery'

const LOOP_SORT_ACCESSORS: YieldsTableSortAccessors<YieldLoopTableRow, keyof YieldLoopTableRow> = {
	project: (row) => row.project,
	loopApy: (row) => row.loopApy,
	netSupplyApy: (row) => row.netSupplyApy,
	boost: (row) => row.boost,
	ltv: (row) => row.ltv,
	totalSupplyUsd: (row) => row.totalSupplyUsd,
	totalBorrowUsd: (row) => row.totalBorrowUsd,
	totalAvailableUsd: (row) => row.totalAvailableUsd
}

export function buildYieldLoopPageMetadata(data: LendBorrowData, cgList: Array<IResponseCGMarketsAPI>) {
	return {
		chainList: data.props.chainList,
		projectList: data.props.projectList,
		categoryList: data.props.categoryList,
		evmChains: data.props.evmChains,
		tokens: buildYieldTokenOptions(cgList)
	}
}

export function buildYieldLoopPageResponse(data: LendBorrowData, query: ParsedUrlQuery): YieldLoopPageResponse {
	const pools = calculateLoopAPY(data.props.pools, 10, null)
	const filteredPools = filterYieldPools({
		pools,
		view: 'loop',
		filters: getYieldPoolFilterState({
			projectList: data.props.projectList,
			chainList: data.props.chainList,
			categoryList: data.props.categoryList,
			evmChains: data.props.evmChains,
			query
		})
	})
	const rows: YieldLoopTableRow[] = []
	for (const pool of filteredPools) {
		rows.push(mapPoolToLoopTableRow(pool))
	}

	return paginateAndSortRows<YieldLoopTableRow, keyof YieldLoopTableRow>({
		rows,
		query,
		sortAccessors: LOOP_SORT_ACCESSORS
	})
}
