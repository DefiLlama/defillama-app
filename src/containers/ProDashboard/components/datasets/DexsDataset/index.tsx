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
import { DexItem } from '~/containers/ProDashboard/types'
import useWindowSize from '~/hooks/useWindowSize'
import { useCSVDownload } from '~/hooks/useCSVDownload'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { dexsDatasetColumns } from './columns'
import { useDexsData } from './useDexsData'

type DexItemWithMarketShare = DexItem & {
	marketShare7d: number
}

export function DexsDataset({ chains }: { chains?: string[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'total24h', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { data, isLoading, error, refetch } = useDexsData(chains)
	const { downloadCSV, isLoading: isCSVLoading } = useCSVDownload()
	const windowSize = useWindowSize()

	const enrichedData = React.useMemo<DexItemWithMarketShare[]>(() => {
		if (!data || data.length === 0) return []

		const total7dGlobal = data.reduce((sum: number, item: DexItem) => sum + (item.total7d || 0), 0)

		return data.map((item) => ({
			...item,
			marketShare7d: total7dGlobal > 0 ? ((item.total7d || 0) / total7dGlobal) * 100 : 0
		}))
	}, [data])

	const instance = useReactTable({
		data: enrichedData,
		columns: dexsDatasetColumns as ColumnDef<any>[],
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
	}, [windowSize, chains, instance])

	const [protocolName, setProtocolName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(protocolName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [protocolName, instance])

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-lg font-semibold">
							{chains && chains.length > 0 ? `${chains.join(', ')} DEXs` : 'DEX Volume'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading DEX data...</p>
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
							{chains && chains.length > 0 ? `${chains.join(', ')} DEXs` : 'DEX Volume'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="pro-text2 text-center">Failed to load DEX data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="pro-text1 text-lg font-semibold">
						{chains && chains.length > 0 ? `${chains.join(', ')} DEXs` : 'DEX Volume'}
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
									'7d Market Share',
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
											item.marketShare7d?.toFixed(2) || '0',
											item.total30d,
											cumulative,
											item.change_1d,
											item.change_7d
										].join(',')
									})
								].join('\n')

								
								downloadCSV('dexs-data.csv', csv, { addTimestamp: true })
							}}
							isLoading={isCSVLoading}
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
