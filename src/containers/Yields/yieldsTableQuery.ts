import type { ParsedUrlQuery } from 'querystring'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { parseNumberQueryParam, readSingleQueryValue, toQueryString } from '~/utils/routerQuery'
import type {
	IYieldTableRow,
	YieldLongShortStrategyTableRow,
	YieldLoopTableRow,
	YieldStrategyTableRow
} from './Tables/types'

export const DEFAULT_YIELDS_TABLE_PAGE_SIZE = 50
// Regular table pages are capped; CSV exports bypass this with pageSize=all.
export const MAX_YIELDS_TABLE_PAGE_SIZE = 500

export type YieldsPaginatedTableResponse<TRow> = {
	rows: TRow[]
	total: number
	page: number
	pageSize: number
	hasMore: boolean
}

export type YieldLoopPageResponse = YieldsPaginatedTableResponse<YieldLoopTableRow>
export type YieldStrategyPageResponse = YieldsPaginatedTableResponse<YieldStrategyTableRow>
export type YieldLongShortStrategyPageResponse = YieldsPaginatedTableResponse<YieldLongShortStrategyTableRow>
export type YieldHalalPageResponse = YieldsPaginatedTableResponse<IYieldTableRow>

function parsePositiveIntegerQueryParam(value: ParsedUrlQuery[string], fallback: number): number {
	const parsed = parseNumberQueryParam(value)
	return parsed != null && parsed > 0 ? Math.floor(parsed) : fallback
}

export function getYieldsTablePaginationFromQuery(query: ParsedUrlQuery): PaginationState {
	const page = parsePositiveIntegerQueryParam(query.page, 1)
	const pageSize = Math.min(
		parsePositiveIntegerQueryParam(query.pageSize, DEFAULT_YIELDS_TABLE_PAGE_SIZE),
		MAX_YIELDS_TABLE_PAGE_SIZE
	)

	return {
		pageIndex: page - 1,
		pageSize
	}
}

export function getYieldsTableSortingFromQuery(query: ParsedUrlQuery, defaultSorting: SortingState = []): SortingState {
	const sortBy = readSingleQueryValue(query.sortBy)
	if (!sortBy) return defaultSorting

	return [
		{
			id: sortBy,
			desc: readSingleQueryValue(query.sortDesc) !== 'false'
		}
	]
}

export function buildYieldsTableQueryString({
	query,
	pagination,
	sorting,
	pageSize,
	extraQuery
}: {
	query: Record<string, string | string[] | undefined>
	pagination: PaginationState
	sorting: SortingState
	pageSize?: number | 'all'
	extraQuery?: Record<string, string | string[] | undefined>
}) {
	const sort = sorting[0]
	const nextPageSize =
		pageSize === 'all' ? 'all' : String(Math.min(pageSize ?? pagination.pageSize, MAX_YIELDS_TABLE_PAGE_SIZE))
	return toQueryString({
		...query,
		...extraQuery,
		page: String(pagination.pageIndex + 1),
		pageSize: nextPageSize,
		sortBy: sort?.id,
		sortDesc: sort ? String(sort.desc) : undefined
	})
}
