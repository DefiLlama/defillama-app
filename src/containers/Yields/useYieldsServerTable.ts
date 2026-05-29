import type { PaginationState, SortingState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { useDebouncedValue } from '~/hooks/useDebounce'
import { useYieldsPaginatedTable } from './queries.client'

// Collapse rapid filter/sort/page changes into a single fetch once selections settle.
const YIELDS_TABLE_QUERY_DEBOUNCE_MS = 300
import { pushYieldsQuery } from './queryUpdates.client'
import type { IYieldsTableProps } from './Tables/types'
import {
	buildYieldsTableQueryString,
	DEFAULT_YIELDS_TABLE_PAGE_SIZE,
	getYieldsTablePaginationFromQuery,
	getYieldsTableSortingFromQuery
} from './yieldsTableQuery'

type QueryRecord = Record<string, string | string[] | undefined>

export function useYieldsServerTable<TRow>({
	endpoint,
	enabled = true,
	extraQuery,
	defaultSorting = []
}: {
	endpoint: string
	enabled?: boolean
	extraQuery?: QueryRecord
	defaultSorting?: SortingState
}) {
	const router = useRouter()
	const query = router.query as QueryRecord
	const requestedPagination = React.useMemo(() => getYieldsTablePaginationFromQuery(query), [query])
	const sorting = React.useMemo(() => getYieldsTableSortingFromQuery(query, defaultSorting), [defaultSorting, query])
	const queryString = React.useMemo(() => {
		if (!enabled) return null
		return buildYieldsTableQueryString({ query, pagination: requestedPagination, sorting, extraQuery })
	}, [enabled, extraQuery, query, requestedPagination, sorting])
	const debouncedQueryString = useDebouncedValue(queryString, YIELDS_TABLE_QUERY_DEBOUNCE_MS)
	const rowsQuery = useYieldsPaginatedTable<TRow>(endpoint, debouncedQueryString)
	const rows = rowsQuery.data?.rows ?? []
	const total = rowsQuery.data?.total ?? 0
	const pagination = React.useMemo<PaginationState>(() => {
		if (!rowsQuery.data) return requestedPagination
		return {
			pageIndex: Math.max(0, rowsQuery.data.page - 1),
			pageSize: rowsQuery.data.pageSize || requestedPagination.pageSize
		}
	}, [requestedPagination, rowsQuery.data])

	const handlePaginationChange = React.useCallback(
		(nextPagination: PaginationState) => {
			void pushYieldsQuery(
				router,
				{
					page: nextPagination.pageIndex > 0 ? String(nextPagination.pageIndex + 1) : undefined,
					pageSize:
						nextPagination.pageSize === DEFAULT_YIELDS_TABLE_PAGE_SIZE ? undefined : String(nextPagination.pageSize)
				},
				{ resetPage: false }
			)
		},
		[router]
	)

	const handleSortingChange = React.useCallback(
		(nextSorting: SortingState) => {
			const sort = nextSorting[0]
			void pushYieldsQuery(router, {
				sortBy: sort?.id,
				sortDesc: sort ? String(sort.desc) : undefined
			})
		},
		[router]
	)

	const buildAllRowsQueryString = React.useCallback(
		() =>
			buildYieldsTableQueryString({
				query,
				pagination: { ...pagination, pageIndex: 0 },
				sorting,
				pageSize: 'all',
				extraQuery
			}),
		[extraQuery, pagination, query, sorting]
	)

	const tableProps: Omit<IYieldsTableProps<TRow>, 'data'> = {
		rowCount: total,
		manualPagination: true,
		manualSorting: true,
		paginationState: pagination,
		sortingState: sorting,
		onPaginationChange: handlePaginationChange,
		onSortingChange: handleSortingChange,
		interactionDisabled: rowsQuery.isFetching
	}

	return {
		query,
		rows,
		total,
		rowsQuery,
		tableProps,
		buildAllRowsQueryString
	}
}
