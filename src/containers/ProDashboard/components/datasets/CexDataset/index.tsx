import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { useTableSearch } from '~/components/Table/utils'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { downloadCSV } from '~/utils/download'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'
import { cexDatasetColumns } from './columns'
import { useCexData } from './useCexData'

const EMPTY_DATA: any[] = []

export function CexDataset() {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'cleanTvl', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { data, isLoading, error } = useCexData()
	const width = useBreakpointWidth()

	const filteredData = React.useMemo(() => {
		return data ? data.filter((d) => d.cleanTvl > 0) : EMPTY_DATA
	}, [data])

	const instance = useReactTable({
		data: filteredData,
		columns: cexDatasetColumns as ColumnDef<any>[],
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters,
			pagination
		},
		onSortingChange: setSorting,
		enableSortingRemoval: false,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex: false
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)
		const defaultSizing = {
			name: 280,
			cleanTvl: 145,
			'24hInflows': 120,
			'7dInflows': 120,
			'1mInflows': 120,
			spotVolume: 120,
			oi: 120,
			leverage: 100,
			audit: 120
		}

		instance.setColumnSizing(defaultSizing)
		instance.setColumnOrder(defaultOrder)
	}, [instance, width])

	const [_exchangeName, setExchangeName] = useTableSearch({ instance, columnToSearch: 'name' })

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Centralized Exchanges</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading exchange data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Centralized Exchanges</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load CEX data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">Centralized Exchanges</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = [
									'Exchange',
									'TVL',
									'24h Inflows',
									'7d Inflows',
									'1m Inflows',
									'Spot Volume',
									'Open Interest',
									'Leverage',
									'Audit'
								]
								const csv = [
									headers.join(','),
									...csvData.map((item) =>
										[
											item.name,
											item.cleanTvl,
											item['24hInflows'],
											item['7dInflows'],
											item['1mInflows'],
											item.spotVolume || '',
											item.oi || '',
											item.leverage || '',
											item.audit || ''
										].join(',')
									)
								].join('\n')

								downloadCSV('cex-data.csv', csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search exchanges..."
							onInput={(e) => setExchangeName(e.currentTarget.value)}
							className="rounded-md border pro-border bg-(--bg-glass) px-3 py-1.5 text-sm pro-text1 transition-colors focus:border-(--primary) focus:outline-hidden"
						/>
					</div>
				</div>
			</div>
			<TableBody table={instance} />
			<TablePagination table={instance} />
		</div>
	)
}
