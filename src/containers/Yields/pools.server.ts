import type { ParsedUrlQuery } from 'querystring'
import { filterYieldPools } from './domain/poolFilters'
import type { YieldPoolFilterState } from './domain/poolFilters'
import { mapPoolToYieldTableRow } from './domain/poolRows'
import type { YieldPoolsPageResponse } from './pools.types'
import { decodeYieldsQuery } from './queryState'
import type { IYieldTableRow } from './Tables/types'
import type { LendBorrowPool, YieldPageProps, YieldPool, YieldView } from './types'

const DEFAULT_PAGE_SIZE = 50
const ALL_PAGE_SIZE = 'all'

type SortableYieldPoolRowKey = keyof IYieldTableRow

function getSingleQueryValue(value: ParsedUrlQuery[string]): string | undefined {
	return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
}

export function resolveYieldPoolsView(query: ParsedUrlQuery): YieldView {
	const view = getSingleQueryValue(query.view)
	return view === 'stablecoins' ? 'stablecoins' : 'main'
}

function parsePage(query: ParsedUrlQuery): number {
	const page = Number(getSingleQueryValue(query.page))
	return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function parsePageSize(query: ParsedUrlQuery, total: number): number {
	const rawPageSize = getSingleQueryValue(query.pageSize)
	if (rawPageSize === ALL_PAGE_SIZE) return total

	const pageSize = Number(rawPageSize)
	return Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE
}

function parseSort(query: ParsedUrlQuery): { sortBy: SortableYieldPoolRowKey; sortDesc: boolean } | null {
	const sortBy = getSingleQueryValue(query.sortBy) as SortableYieldPoolRowKey | undefined
	if (!sortBy) return null

	return {
		sortBy,
		sortDesc: getSingleQueryValue(query.sortDesc) !== 'false'
	}
}

function compareRowValues(leftValue: unknown, rightValue: unknown): number {
	if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
		return String(Array.isArray(leftValue) ? leftValue[0] : leftValue).localeCompare(
			String(Array.isArray(rightValue) ? rightValue[0] : rightValue)
		)
	}

	if (typeof leftValue === 'number' && typeof rightValue === 'number') {
		return leftValue - rightValue
	}

	return String(leftValue).localeCompare(String(rightValue))
}

function sortYieldPoolRows(rows: IYieldTableRow[], query: ParsedUrlQuery): IYieldTableRow[] {
	const sort = parseSort(query)
	if (!sort) return rows

	return rows
		.map((row, index) => ({ row, index }))
		.sort((left, right) => {
			const leftValue = left.row[sort.sortBy]
			const rightValue = right.row[sort.sortBy]
			const leftMissing = leftValue == null
			const rightMissing = rightValue == null
			if (leftMissing && rightMissing) return left.index - right.index
			if (leftMissing) return 1
			if (rightMissing) return -1

			const result = compareRowValues(leftValue, rightValue)
			if (result === 0) return left.index - right.index
			return sort.sortDesc ? -result : result
		})
		.map(({ row }) => row)
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

function getPoolFilters(data: YieldPageProps, query: ParsedUrlQuery): YieldPoolFilterState {
	const decoded = decodeYieldsQuery(query, {
		projectList: data.projectList,
		chainList: data.chainList,
		categoryList: data.categoryList,
		evmChains: data.evmChains
	})

	return {
		selectedProjects: decoded.selectedProjects,
		selectedChains: decoded.selectedChains,
		selectedAttributes: decoded.selectedAttributes,
		includeTokens: decoded.includeTokens,
		excludeTokens: decoded.excludeTokens,
		exactTokens: decoded.exactTokens,
		selectedCategories: decoded.selectedCategories,
		pairTokens: decoded.pairTokens,
		minTvl: decoded.minTvl,
		maxTvl: decoded.maxTvl,
		minApy: decoded.minApy,
		maxApy: decoded.maxApy
	}
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
		filters: getPoolFilters(data, query),
		usdPeggedSymbols: data.usdPeggedSymbols,
		tokenCategories: data.tokenCategories
	})
	const rows: IYieldTableRow[] = []

	for (const pool of filteredPools) {
		rows.push(mapPoolToYieldTableRow(pool, { stablecoinInfoBySymbol: data.stablecoinInfoBySymbol }))
	}

	const sortedRows = sortYieldPoolRows(rows, query)
	const total = sortedRows.length
	const page = parsePage(query)
	const pageSize = parsePageSize(query, total)
	const start = pageSize > 0 ? (page - 1) * pageSize : 0
	const end = pageSize > 0 ? start + pageSize : 0

	return {
		rows: sortedRows.slice(start, end),
		total,
		page,
		pageSize,
		hasMore: end < total
	}
}
