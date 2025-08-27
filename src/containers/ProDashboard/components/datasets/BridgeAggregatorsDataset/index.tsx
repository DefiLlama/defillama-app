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
	useReactTable,
	VisibilityState
} from '@tanstack/react-table'
import { TagGroup } from '~/components/TagGroup'
import { downloadCSV } from '~/utils'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { bridgeAggregatorsDatasetColumns } from './columns'
import { useBridgeAggregatorsData } from './useBridgeAggregatorsData'

export function BridgeAggregatorsDataset({ chains }: { chains?: string[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'total24h', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})
	const [protocolName, setProtocolName] = React.useState('')
	const { data, isLoading, error } = useBridgeAggregatorsData(chains)

	const instance = useReactTable({
		data: data || [],
		columns: bridgeAggregatorsDatasetColumns as ColumnDef<any>[],
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters,
			columnVisibility,
			pagination
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = bridgeAggregatorsDatasetColumns.map((column) => column.id as string)
		instance.setColumnOrder(defaultOrder)
	}, [instance])

	React.useEffect(() => {
		const columnSizes = {}
		bridgeAggregatorsDatasetColumns.forEach((column) => {
			if (column.size) {
				columnSizes[column.id as string] = column.size
			}
		})
		instance.setColumnSizing(columnSizes)
	}, [instance])

	React.useEffect(() => {
		if (chains && chains.length > 0) {
			instance.setColumnVisibility({
				change_24h: false,
				change_7d: false
			})
		} else {
			instance.setColumnVisibility({})
		}
	}, [chains, instance])

	const csvData = React.useMemo(() => {
		const rows = instance.getRowModel().rows
		const headers = [
			'Protocol',
			'24h Change',
			'7d Change',
			'24h Volume',
			'7d Volume',
			'30d Volume',
			'% of Total',
			'Cumulative Volume'
		]

		const data = rows.map((row, index) => {
			const cumulativeVolume = rows.slice(0, index + 1).reduce((sum, r) => sum + (r.original.total24h || 0), 0)

			return [
				row.original.name,
				row.original.change_24h,
				row.original.change_7d,
				row.original.total24h,
				row.original.total7d,
				row.original.total30d,
				row.original.dominance,
				cumulativeVolume
			]
		})

		return { headers, data }
	}, [instance])

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-lg font-semibold">
							{chains && chains.length > 0 ? `${chains.join(', ')} Bridge Aggregators` : 'Bridge Aggregators Volume'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading aggregators data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-lg font-semibold">
							{chains && chains.length > 0 ? `${chains.join(', ')} Bridge Aggregators` : 'Bridge Aggregators Volume'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="pro-text2 text-center">Failed to load aggregators data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="pro-text1 text-lg font-semibold">
						{chains && chains.length > 0 ? `${chains.join(', ')} Bridge Aggregators` : 'Bridge Aggregators Volume'}
					</h3>
					<div className="flex items-center gap-2">
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = [
									'Protocol',
									'24h Volume',
									'% of Total',
									'7d Volume',
									'30d Volume',
									'Cumulative Volume',
									'24h Change',
									'7d Change'
								]
								const csv = [
									headers.join(','),
									...csvData.map((item, index) => {
										const total24h = csvData.reduce((sum, p) => sum + (p.total24h || 0), 0)
										const percentage = total24h > 0 ? (item.total24h / total24h) * 100 : 0
										const cumulative = csvData.slice(0, index + 1).reduce((sum, p) => sum + (p.total24h || 0), 0)
										return [
											item.name,
											item.total24h,
											percentage.toFixed(2),
											item.total7d,
											item.total30d,
											cumulative,
											item.change_1d,
											item.change_7d
										].join(',')
									})
								].join('\n')

								downloadCSV('aggregators-data.csv', csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search protocols..."
							value={protocolName}
							onChange={(e) => setProtocolName(e.target.value)}
							className="pro-border pro-bg1 pro-text1 border px-3 py-1.5 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
					</div>
				</div>
			</div>
			<TableBody table={instance} />
			<div className="mt-2 flex w-full items-center justify-between">
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
