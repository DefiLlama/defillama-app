import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnOrderState,
	ColumnSizingState,
	ColumnFiltersState,
	getFilteredRowModel,
	getPaginationRowModel,
	PaginationState,
	ColumnDef
} from '@tanstack/react-table'
import { TableBody } from '../../ProTable/TableBody'
import { cexDatasetColumns } from './columns'
import useWindowSize from '~/hooks/useWindowSize'
import { LoadingSpinner } from '../../LoadingSpinner'
import { useCexData } from './useCexData'
import { TagGroup } from '~/components/TagGroup'
import { ProTableCSVButton } from '../../ProTable/CsvButton'

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
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Centralized Exchanges</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading exchange data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Centralized Exchanges</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex items-center justify-center">
					<div className="text-center pro-text2">Failed to load CEX data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full p-4 h-full flex flex-col">
			<div className="mb-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="text-lg font-semibold pro-text1">Centralized Exchanges</h3>
					<div className="flex items-center gap-2">
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

								const blob = new Blob([csv], { type: 'text/csv' })
								const url = URL.createObjectURL(blob)
								const a = document.createElement('a')
								a.href = url
								a.download = `cex-data-${new Date().toISOString().split('T')[0]}.csv`
								document.body.appendChild(a)
								a.click()
								document.body.removeChild(a)
								URL.revokeObjectURL(url)
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search exchanges..."
							value={exchangeName}
							onChange={(e) => setExchangeName(e.target.value)}
							className="px-3 py-1.5 text-sm border pro-border pro-bg1 pro-text1
								focus:outline-hidden focus:ring-1 focus:ring-(--primary)"
						/>
					</div>
				</div>
			</div>
			<TableBody table={instance} />
			<div className="flex items-center justify-between w-full mt-2">
				<TagGroup
					selectedValue={null}
					setValue={(val) => (val === 'Next' ? instance.nextPage() : instance.previousPage())}
					values={['Previous', 'Next']}
				/>
				<div className="flex items-center">
					<div className="mr-2 text-xs">Per page</div>
					<TagGroup
						selectedValue={String(pagination.pageSize)}
						values={['10', '30', '50']}
						setValue={(val) => setPagination((prev) => ({ ...prev, pageSize: Number(val), pageIndex: 0 }))}
					/>
				</div>
			</div>
		</div>
	)
}
