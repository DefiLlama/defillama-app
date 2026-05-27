import type { ParsedUrlQuery } from 'querystring'
import {
	DEFAULT_YIELDS_TABLE_PAGE_SIZE,
	MAX_YIELDS_TABLE_PAGE_SIZE,
	type YieldsPaginatedTableResponse
} from './yieldsTableQuery'

const ALL_PAGE_SIZE = 'all'

export type YieldsTableSort<SortKey extends string = string> = {
	sortBy: SortKey
	sortDesc: boolean
}

type SortAccessor<TRow> = (row: TRow) => unknown

export type YieldsTableSortAccessors<TRow, SortKey extends string> = Partial<Record<SortKey, SortAccessor<TRow>>>

function getFirstQueryValue(value: ParsedUrlQuery[string]): string | undefined {
	return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
}

function parsePage(query: ParsedUrlQuery): number {
	const page = Number(getFirstQueryValue(query.page))
	return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function parsePageSize(query: ParsedUrlQuery, total: number): number {
	const rawPageSize = getFirstQueryValue(query.pageSize)
	if (rawPageSize === ALL_PAGE_SIZE) return total

	const pageSize = Number(rawPageSize)
	return Number.isFinite(pageSize) && pageSize > 0
		? Math.min(Math.floor(pageSize), MAX_YIELDS_TABLE_PAGE_SIZE)
		: DEFAULT_YIELDS_TABLE_PAGE_SIZE
}

function parseSort<SortKey extends string>(
	query: ParsedUrlQuery,
	defaultSort?: YieldsTableSort<SortKey>
): YieldsTableSort<SortKey> | null {
	const sortBy = getFirstQueryValue(query.sortBy) as SortKey | undefined
	if (!sortBy) return defaultSort ?? null

	return {
		sortBy,
		sortDesc: getFirstQueryValue(query.sortDesc) !== 'false'
	}
}

function firstSortableValue(value: unknown): unknown {
	return Array.isArray(value) ? value[0] : value
}

function numericValue(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	if (!trimmed) return null
	const parsed = Number(trimmed)
	return Number.isFinite(parsed) ? parsed : null
}

export function compareYieldsTableValues(left: unknown, right: unknown): number {
	const leftValue = firstSortableValue(left)
	const rightValue = firstSortableValue(right)
	const leftNumber = numericValue(leftValue)
	const rightNumber = numericValue(rightValue)

	if (leftNumber != null && rightNumber != null) {
		return leftNumber - rightNumber
	}

	return String(leftValue).localeCompare(String(rightValue))
}

export function paginateAndSortRows<TRow, SortKey extends string>({
	rows,
	query,
	sortAccessors,
	defaultSort,
	fallbackSortAccessor
}: {
	rows: TRow[]
	query: ParsedUrlQuery
	sortAccessors?: YieldsTableSortAccessors<TRow, SortKey>
	defaultSort?: YieldsTableSort<SortKey>
	fallbackSortAccessor?: (row: TRow, sortBy: string) => unknown
}): YieldsPaginatedTableResponse<TRow> {
	const parsedSort = parseSort(query, defaultSort)
	const hasParsedSortAccessor =
		parsedSort != null && (sortAccessors?.[parsedSort.sortBy] != null || fallbackSortAccessor != null)
	const sort = hasParsedSortAccessor ? parsedSort : defaultSort
	const accessor =
		sort &&
		(sortAccessors?.[sort.sortBy] ??
			(fallbackSortAccessor ? (row: TRow) => fallbackSortAccessor(row, sort.sortBy) : null))
	let sortedRows = rows
	if (accessor) {
		const indexedRows: Array<{ row: TRow; index: number }> = []
		for (let index = 0; index < rows.length; index++) {
			indexedRows.push({ row: rows[index], index })
		}
		indexedRows.sort((left, right) => {
			const leftValue = accessor(left.row)
			const rightValue = accessor(right.row)
			const leftMissing = leftValue == null
			const rightMissing = rightValue == null
			if (leftMissing && rightMissing) return left.index - right.index
			if (leftMissing) return 1
			if (rightMissing) return -1

			const result = compareYieldsTableValues(leftValue, rightValue)
			if (result === 0) return left.index - right.index
			return sort.sortDesc ? -result : result
		})

		sortedRows = new Array<TRow>(indexedRows.length)
		for (let index = 0; index < indexedRows.length; index++) {
			sortedRows[index] = indexedRows[index].row
		}
	}
	const total = sortedRows.length
	const pageSize = parsePageSize(query, total)
	const requestedPage = parsePage(query)
	const maxPage = total > 0 && pageSize > 0 ? Math.ceil(total / pageSize) : 1
	const page = total > 0 ? Math.min(requestedPage, maxPage) : 1
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
