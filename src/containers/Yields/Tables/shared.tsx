import {
	type ColumnOrderState,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
	type VisibilityState
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnOrders } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

const EMPTY_SORTING: SortingState = []
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const

interface IYieldsTableWrapper {
	data: any
	columns: any
	columnOrders: ColumnOrdersByBreakpoint
	rowSize?: number
	columnVisibility?: Record<string, boolean>
	setColumnVisibility?: (value: React.SetStateAction<VisibilityState>) => void
	sortingState?: SortingState
	skipVirtualization?: boolean
	enablePagination?: boolean
	initialPageSize?: number
}

export const YieldsTableWrapper = ({
	data,
	columns,
	columnOrders,
	rowSize,
	columnVisibility,
	setColumnVisibility,
	sortingState = EMPTY_SORTING,
	skipVirtualization,
	enablePagination = false,
	initialPageSize = PAGE_SIZE_OPTIONS[0]
}: IYieldsTableWrapper) => {
	const [sorting, setSorting] = React.useState<SortingState>([...sortingState])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: initialPageSize
	})

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnOrder,
			columnVisibility,
			...(enablePagination ? { pagination } : {})
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => {
			const newSorting = typeof updater === 'function' ? updater(sorting) : updater
			React.startTransition(() => {
				setSorting(newSorting)
			})
			if (newSorting.length > 0) {
				trackYieldsEvent(YIELDS_EVENTS.TABLE_SORT, { column: newSorting[0].id })
			}
		},
		onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
		onColumnVisibilityChange: setColumnVisibility
			? (updater) => React.startTransition(() => setColumnVisibility(updater))
			: undefined,
		onPaginationChange: enablePagination ? (updater) => React.startTransition(() => setPagination(updater)) : undefined,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		...(enablePagination ? { getPaginationRowModel: getPaginationRowModel(), autoResetPageIndex: false } : {})
	})

	useSortColumnOrders({ instance, columnOrders })

	React.useEffect(() => {
		if (!enablePagination) return

		const pageCount = instance.getPageCount()
		if (pageCount === 0) {
			if (instance.getState().pagination.pageIndex !== 0) {
				instance.setPageIndex(0)
			}
			return
		}

		const maxPageIndex = Math.max(0, pageCount - 1)
		if (instance.getState().pagination.pageIndex > maxPageIndex) {
			instance.setPageIndex(maxPageIndex)
		}
	}, [data, enablePagination, instance])

	return (
		<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<VirtualTable instance={instance} rowSize={rowSize} skipVirtualization={skipVirtualization} />
			{enablePagination ? (
				<div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							aria-label="Go to first page"
							onClick={() => React.startTransition(() => instance.setPageIndex(0))}
							disabled={!instance.getCanPreviousPage()}
							className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Icon name="chevrons-left" height={16} width={16} />
						</button>
						<button
							type="button"
							aria-label="Go to previous page"
							onClick={() => React.startTransition(() => instance.previousPage())}
							disabled={!instance.getCanPreviousPage()}
							className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Icon name="chevron-left" height={16} width={16} />
						</button>
						<span className="text-xs text-(--text-secondary)">
							{`Page ${instance.getState().pagination.pageIndex + 1} of ${instance.getPageCount()}`}
						</span>
						<button
							type="button"
							aria-label="Go to next page"
							onClick={() => React.startTransition(() => instance.nextPage())}
							disabled={!instance.getCanNextPage()}
							className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Icon name="chevron-right" height={16} width={16} />
						</button>
						<button
							type="button"
							aria-label="Go to last page"
							onClick={() =>
								React.startTransition(() => instance.setPageIndex(Math.max(0, instance.getPageCount() - 1)))
							}
							disabled={!instance.getCanNextPage()}
							className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Icon name="chevrons-right" height={16} width={16} />
						</button>
					</div>

					<label className="flex items-center gap-2 text-sm">
						<span className="text-(--text-secondary)">Rows per page</span>
						<select
							value={instance.getState().pagination.pageSize}
							onChange={(event) =>
								React.startTransition(() => {
									instance.setPageSize(Number(event.target.value))
									instance.setPageIndex(0)
								})
							}
							className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1"
						>
							{PAGE_SIZE_OPTIONS.map((pageSize) => (
								<option key={pageSize} value={pageSize}>
									{pageSize}
								</option>
							))}
						</select>
					</label>
				</div>
			) : null}
		</div>
	)
}
