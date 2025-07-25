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
import * as React from 'react'
import { TagGroup } from '~/components/TagGroup'
import useWindowSize from '~/hooks/useWindowSize'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { stablecoinsDatasetColumns } from './columns'
import { useStablecoinsData } from './useStablecoinsData'

interface StablecoinsDatasetProps {
	chain: string
}

export function StablecoinsDataset({ chain }: StablecoinsDatasetProps) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'mcap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { data, isLoading, error } = useStablecoinsData(chain)
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data: data || [],
		columns: stablecoinsDatasetColumns as ColumnDef<any>[],
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
			mcap: 145,
			change_1d: 100,
			change_7d: 100,
			change_1m: 100,
			price: 100,
			chains: 200
		}

		instance.setColumnSizing(defaultSizing)
		instance.setColumnOrder(defaultOrder)
	}, [windowSize])

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(projectName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	if (isLoading) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">{chain} Stablecoins</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading stablecoin data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">{chain} Stablecoins</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex items-center justify-center">
					<div className="text-center pro-text2">Failed to load stablecoins data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full p-4 h-full flex flex-col">
			<div className="mb-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="text-lg font-semibold pro-text1">{chain} Stablecoins</h3>
					<div className="flex items-center gap-2">
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = ['Stablecoin', 'Market Cap', '24h Change', '7d Change', '1m Change', 'Price', 'Chains']
								const csv = [
									headers.join(','),
									...csvData.map((item) =>
										[
											item.name,
											item.mcap,
											item.change_1d,
											item.change_7d,
											item.change_1m,
											item.price,
											item.chains?.join(';') || ''
										].join(',')
									)
								].join('\n')

								const blob = new Blob([csv], { type: 'text/csv' })
								const url = URL.createObjectURL(blob)
								const a = document.createElement('a')
								a.href = url
								a.download = `stablecoins-${chain}-${new Date().toISOString().split('T')[0]}.csv`
								document.body.appendChild(a)
								a.click()
								document.body.removeChild(a)
								URL.revokeObjectURL(url)
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search stablecoins..."
							value={projectName}
							onChange={(e) => setProjectName(e.target.value)}
							className="px-3 py-1.5 text-sm border pro-border pro-bg1 pro-text1
								focus:outline-hidden focus:ring-1 focus:ring-(--primary1)"
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
