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
	useReactTable,
	type VisibilityState
} from '@tanstack/react-table'
import * as React from 'react'
import { useTableSearch } from '~/components/Table/utils'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { downloadCSV } from '~/utils/download'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'
import { perpsDatasetColumns } from './columns'
import { usePerpsData } from './usePerpsData'

const EMPTY_DATA: any[] = []

export function PerpsDataset({ chains }: { chains?: string[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'total24h', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { data, isLoading, error, refetch: _refetch } = usePerpsData(chains)
	const width = useBreakpointWidth()

	const instance = useReactTable({
		data: data ?? EMPTY_DATA,
		columns: perpsDatasetColumns as ColumnDef<any>[],
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters,
			columnVisibility,
			pagination
		},
		onSortingChange: setSorting,
		enableSortingRemoval: false,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
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
			total24h: 145,
			dominance: 100,
			total7d: 120,
			total30d: 120,
			cumulative: 140,
			change_1d: 100,
			change_7d: 100
		}

		const hasChains = chains && chains.length > 0 && !chains.includes('All')
		const defaultVisibility = {
			change_1d: !hasChains,
			change_7d: !hasChains
		}

		instance.setColumnSizing(defaultSizing)
		instance.setColumnOrder(defaultOrder)
		instance.setColumnVisibility(defaultVisibility)
	}, [width, chains, instance])

	const [_protocolName, setProtocolName] = useTableSearch({ instance, columnToSearch: 'name' })

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">
							{chains && chains.length > 0 ? `${chains.join(', ')} Perpetuals` : 'Perpetuals Volume'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading perpetuals data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">
							{chains && chains.length > 0 ? `${chains.join(', ')} Perpetuals` : 'Perpetuals Volume'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load perpetuals data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">
						{chains && chains.length > 0 ? `${chains.join(', ')} Perpetuals` : 'Perpetuals Volume'}
					</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
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

								downloadCSV('perps-data.csv', csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search protocols..."
							onInput={(e) => setProtocolName(e.currentTarget.value)}
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
