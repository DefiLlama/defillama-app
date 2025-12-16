import * as React from 'react'
import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	PaginationState,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { TagGroup } from '~/components/TagGroup'
import useWindowSize from '~/hooks/useWindowSize'
import { downloadCSV } from '~/utils'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'
import { cexDatasetColumns } from './columns'
import { useCexData } from './useCexData'

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
	const windowSize = useWindowSize()

	const filteredData = React.useMemo(() => {
		return data?.filter((d) => d.cleanTvl > 0) || []
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
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel()
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
	}, [windowSize])

	const [exchangeName, setExchangeName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(exchangeName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [exchangeName, instance])

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-lg font-semibold">Centralized Exchanges</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading exchange data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-lg font-semibold">Centralized Exchanges</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="pro-text2 text-center">Failed to load CEX data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="pro-text1 mr-auto text-lg font-semibold">Centralized Exchanges</h3>
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
							value={exchangeName}
							onChange={(e) => setExchangeName(e.target.value)}
							className="pro-border pro-text1 rounded-md border bg-(--bg-glass) px-3 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
						/>
					</div>
				</div>
			</div>
			<TableBody table={instance} />
			<TablePagination table={instance} />
		</div>
	)
}
