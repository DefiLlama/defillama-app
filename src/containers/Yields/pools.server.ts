import type { ParsedUrlQuery } from 'querystring'
import { filterYieldPools } from './domain/poolFilters'
import { mapPoolToYieldTableRow } from './domain/poolRows'
import type { YieldPoolsPageResponse } from './pools.types'
import type { IYieldTableRow } from './Tables/types'
import type { LendBorrowPool, YieldPageProps, YieldPool, YieldView } from './types'
import { getYieldPoolFilterState } from './yieldsTable.server'
import { paginateAndSortRows } from './yieldsTablePagination.server'

type SortableYieldPoolRowKey = keyof IYieldTableRow

function getSingleQueryValue(value: ParsedUrlQuery[string]): string | undefined {
	return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
}

export function resolveYieldPoolsView(query: ParsedUrlQuery): YieldView {
	const view = getSingleQueryValue(query.view)
	return view === 'stablecoins' ? 'stablecoins' : 'main'
}

function mergeMainPoolBorrowData(pools: YieldPool[], lendBorrowPools: LendBorrowPool[]): YieldPool[] {
	const lendBorrowMap = new Map<string, LendBorrowPool>()
	for (const pool of lendBorrowPools) {
		lendBorrowMap.set(pool.pool, pool)
	}

	const mergedPools: YieldPool[] = []
	for (const pool of pools) {
		const lendBorrowEntry = lendBorrowMap.get(pool.pool)
		mergedPools.push({
			...pool,
			apyBaseBorrow: lendBorrowEntry?.apyBaseBorrow ?? pool.apyBaseBorrow ?? null,
			apyRewardBorrow: lendBorrowEntry?.apyRewardBorrow ?? pool.apyRewardBorrow ?? null,
			apyBorrow: lendBorrowEntry?.apyBorrow ?? pool.apyBorrow ?? null,
			totalSupplyUsd: lendBorrowEntry?.totalSupplyUsd ?? pool.totalSupplyUsd ?? null,
			totalBorrowUsd: lendBorrowEntry?.totalBorrowUsd ?? pool.totalBorrowUsd ?? null,
			totalAvailableUsd: lendBorrowEntry?.totalAvailableUsd ?? pool.totalAvailableUsd ?? null,
			ltv: lendBorrowEntry?.ltv ?? pool.ltv ?? null
		})
	}

	return mergedPools
}

export function buildYieldPoolsPageResponse({
	data,
	lendBorrowPools = [],
	query
}: {
	data: YieldPageProps
	lendBorrowPools?: LendBorrowPool[]
	query: ParsedUrlQuery
}): YieldPoolsPageResponse {
	const view = resolveYieldPoolsView(query)
	const pools = view === 'main' ? mergeMainPoolBorrowData(data.pools, lendBorrowPools) : data.pools
	const filteredPools = filterYieldPools({
		pools,
		view,
		filters: getYieldPoolFilterState({
			projectList: data.projectList,
			chainList: data.chainList,
			categoryList: data.categoryList,
			evmChains: data.evmChains,
			query
		}),
		usdPeggedSymbols: data.usdPeggedSymbols,
		tokenCategories: data.tokenCategories
	})
	const rows: IYieldTableRow[] = []

	for (const pool of filteredPools) {
		rows.push(mapPoolToYieldTableRow(pool, { stablecoinInfoBySymbol: data.stablecoinInfoBySymbol }))
	}

	return paginateAndSortRows<IYieldTableRow, SortableYieldPoolRowKey>({
		rows,
		query,
		fallbackSortAccessor: (row, sortBy) => row[sortBy as SortableYieldPoolRowKey]
	})
}
