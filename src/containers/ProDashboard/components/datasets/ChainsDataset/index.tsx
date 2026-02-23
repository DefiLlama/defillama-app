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
import { downloadCSV } from '~/utils/download'
import { useProDashboardEditorActions } from '../../../ProDashboardAPIContext'
import { LoadingSpinner } from '../../LoadingSpinner'
import { TableBody } from '../../ProTable/TableBody'
import { ChainsTableHeader } from './ChainsTableHeader'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { chainsDatasetColumns } from './columns'
import { useChainsData } from './useChainsData'

const EMPTY_DATA: any[] = []
const CHAIN_COLUMN_PRESETS: Record<string, string[]> = {
	essential: ['name', 'protocols', 'users', 'change_1d', 'change_7d', 'tvl', 'stablesMcap'],
	defi: [
		'name',
		'protocols',
		'tvl',
		'change_1d',
		'change_7d',
		'change_1m',
		'bridgedTvl',
		'stablesMcap',
		'mcaptvl',
		'mcap'
	],
	volume: [
		'name',
		'tvl',
		'totalVolume24h',
		'totalVolume30d',
		'totalFees24h',
		'totalFees30d',
		'totalAppRevenue24h',
		'totalAppRevenue30d',
		'totalRevenue30d',
		'users',
		'nftVolume'
	],
	advanced: [
		'name',
		'protocols',
		'users',
		'change_1d',
		'change_7d',
		'change_1m',
		'tvl',
		'bridgedTvl',
		'stablesMcap',
		'totalVolume24h',
		'totalVolume30d',
		'totalFees24h',
		'totalFees30d',
		'totalAppRevenue24h',
		'totalAppRevenue30d',
		'totalRevenue30d',
		'mcaptvl',
		'mcap',
		'nftVolume'
	],
	shares: [
		'name',
		'tvl_share',
		'stablesMcap_share',
		'totalVolume24h_share',
		'totalFees24h_share',
		'totalAppRevenue24h_share'
	]
}

interface ChainsDatasetProps {
	category?: string
	tableId?: string
	columnOrder?: string[]
	columnVisibility?: Record<string, boolean>
}

export function ChainsDataset({
	category,
	tableId,
	columnOrder: savedColumnOrder,
	columnVisibility: savedColumnVisibility
}: ChainsDatasetProps) {
	const { handleTableColumnsChange } = useProDashboardEditorActions()
	const uniqueTableId = tableId || `chains-dataset-${category || 'all'}`

	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'tvl', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})
	const [selectedPreset, setSelectedPreset] = React.useState<string | null>(
		savedColumnOrder || savedColumnVisibility ? null : 'essential'
	)
	const [showColumnPanel, setShowColumnPanel] = React.useState(false)

	const { data, isLoading, error } = useChainsData(category)

	const totals = React.useMemo(() => {
		const sums: Record<string, number> = {}
		const metrics = ['tvl', 'stablesMcap', 'totalVolume24h', 'totalFees24h', 'totalAppRevenue24h', 'nftVolume']

		for (const metric of metrics) {
			sums[metric] = 0
		}

		if (data && Array.isArray(data)) {
			for (const chain of data) {
				for (const metric of metrics) {
					const value = chain[metric]
					if (typeof value === 'number' && value > 0) {
						sums[metric] += value
					}
				}
			}
		}

		return sums
	}, [data])

	const percentageShareColumns = React.useMemo(() => {
		const shareMetrics = [
			{ key: 'tvl', name: 'DeFi TVL % Share' },
			{ key: 'stablesMcap', name: 'Stables % Share' },
			{ key: 'totalVolume24h', name: '24h Volume % Share' },
			{ key: 'totalFees24h', name: '24h Fees % Share' },
			{ key: 'totalAppRevenue24h', name: '24h Revenue % Share' },
			{ key: 'nftVolume', name: 'NFT Volume % Share' }
		]

		return shareMetrics.map(
			(metric): ColumnDef<any> => ({
				id: `${metric.key}_share`,
				header: metric.name,
				size: 120,
				accessorFn: (row) => {
					const value = row[metric.key]
					const total = totals[metric.key]

					if (typeof value === 'number' && value > 0 && total > 0) {
						return (value / total) * 100
					}
					return null
				},
				cell: ({ getValue }) => {
					const value = getValue() as number | null
					if (value == null) return <span className="pro-text2">-</span>

					return <span className="pro-text2">{value.toFixed(2)}%</span>
				},
				sortingFn: (rowA, rowB, columnId) => {
					const a = rowA.getValue(columnId) as number | null
					const b = rowB.getValue(columnId) as number | null
					if (a === null && b !== null) return 1
					if (a !== null && b === null) return -1
					if (a === null && b === null) return 0
					return (a ?? 0) - (b ?? 0)
				}
			})
		)
	}, [totals])

	const allColumns = React.useMemo(() => {
		return [...chainsDatasetColumns, ...percentageShareColumns] as ColumnDef<any>[]
	}, [percentageShareColumns])

	const instance = useReactTable({
		data: data ?? EMPTY_DATA,
		columns: allColumns,
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

	const applyPreset = (preset: string) => {
		const presetColumns = CHAIN_COLUMN_PRESETS[preset as keyof typeof CHAIN_COLUMN_PRESETS]
		if (presetColumns) {
			const allColumns = instance.getAllColumns()
			const newVisibility: Record<string, boolean> = {}

			for (const column of allColumns) {
				newVisibility[column.id] = presetColumns.includes(column.id)
			}

			instance.setColumnVisibility(newVisibility)
			instance.setColumnOrder(presetColumns)
			setColumnVisibility(newVisibility)
			setColumnOrder(presetColumns)
			setSelectedPreset(preset)

			if (uniqueTableId && handleTableColumnsChange) {
				handleTableColumnsChange(uniqueTableId, presetColumns, newVisibility)
			}
		}
	}

	const toggleColumnVisibility = (columnId: string) => {
		const column = instance.getColumn(columnId)
		if (column) {
			column.toggleVisibility()
			setSelectedPreset(null)

			const newVisibility = { ...columnVisibility, [columnId]: !columnVisibility[columnId] }
			setColumnVisibility(newVisibility)

			if (newVisibility[columnId] !== false && !columnOrder.includes(columnId)) {
				const allColumns = instance.getAllLeafColumns().map((d) => d.id)
				const originalIndex = allColumns.indexOf(columnId)

				const newOrder = [...columnOrder]
				let insertIndex = newOrder.length

				for (let i = originalIndex + 1; i < allColumns.length; i++) {
					const colId = allColumns[i]
					const orderIndex = newOrder.indexOf(colId)
					if (orderIndex !== -1) {
						insertIndex = orderIndex
						break
					}
				}

				newOrder.splice(insertIndex, 0, columnId)
				setColumnOrder(newOrder)

				if (uniqueTableId && handleTableColumnsChange) {
					handleTableColumnsChange(uniqueTableId, newOrder, newVisibility)
				}
			} else {
				if (uniqueTableId && handleTableColumnsChange) {
					handleTableColumnsChange(uniqueTableId, columnOrder, newVisibility)
				}
			}
		}
	}

	const onSyncInitialColumns = React.useEffectEvent(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)
		const defaultSizing = {
			name: 200,
			protocols: 100,
			users: 130,
			change_1d: 90,
			change_7d: 90,
			change_1m: 90,
			tvl: 140,
			bridgedTvl: 120,
			stablesMcap: 120,
			totalVolume24h: 150,
			totalVolume30d: 150,
			totalFees24h: 130,
			totalFees30d: 130,
			totalAppRevenue24h: 120,
			totalAppRevenue30d: 140,
			totalRevenue30d: 140,
			mcaptvl: 120,
			mcap: 140,
			nftVolume: 120
		}

		instance.setColumnSizing(defaultSizing)

		if (savedColumnOrder && savedColumnOrder.length > 0) {
			setColumnOrder(savedColumnOrder)
			instance.setColumnOrder(savedColumnOrder)
		} else if (columnOrder.length === 0) {
			setColumnOrder(defaultOrder)
			instance.setColumnOrder(defaultOrder)
		}

		let hasSavedVisibility = false
		if (savedColumnVisibility) {
			for (const _ in savedColumnVisibility) {
				hasSavedVisibility = true
				break
			}
		}
		let hasCurrentVisibility = false
		for (const _ in columnVisibility) {
			hasCurrentVisibility = true
			break
		}
		if (savedColumnVisibility && hasSavedVisibility) {
			setColumnVisibility(savedColumnVisibility)
			instance.setColumnVisibility(savedColumnVisibility)
		} else if (!hasCurrentVisibility && selectedPreset === 'essential') {
			const presetColumns = CHAIN_COLUMN_PRESETS.essential
			if (presetColumns) {
				const allColumns = instance.getAllColumns()
				const newVisibility: Record<string, boolean> = {}
				for (const column of allColumns) {
					newVisibility[column.id] = presetColumns.includes(column.id)
				}
				setColumnVisibility(newVisibility)
				setColumnOrder(presetColumns)
				instance.setColumnVisibility(newVisibility)
				instance.setColumnOrder(presetColumns)
			}
		}
	})

	React.useEffect(() => {
		onSyncInitialColumns()
	}, [savedColumnOrder, savedColumnVisibility])

	const handleExportCSV = () => {
		const headers = instance
			.getVisibleFlatColumns()
			.filter((col) => col.id !== 'expand')
			.map((col) => (typeof col.columnDef.header === 'string' ? col.columnDef.header : (col.id ?? '')))

		const rows = instance.getFilteredRowModel().rows.map((row) => {
			return instance
				.getVisibleFlatColumns()
				.filter((col) => col.id !== 'expand')
				.map((col) => {
					const value = row.getValue(col.id)
					if (value == null) return ''
					if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
					if (Array.isArray(value)) return value.join(', ')
					if (typeof value === 'object') return ''
					return String(value)
				})
		})

		downloadCSV('chains-data.csv', [headers, ...rows], { addTimestamp: true })
	}

	const columnOptions = React.useMemo(
		() =>
			[...chainsDatasetColumns, ...percentageShareColumns].map((col) => ({
				id: (col as any).accessorKey || col.id,
				name: typeof col.header === 'string' ? col.header : col.id || ''
			})),
		[percentageShareColumns]
	)

	const moveColumnUp = (columnId: string) => {
		const currentOrder = [...columnOrder]
		const index = currentOrder.indexOf(columnId)
		if (index > 0) {
			;[currentOrder[index - 1], currentOrder[index]] = [currentOrder[index], currentOrder[index - 1]]
			setColumnOrder(currentOrder)
			if (uniqueTableId && handleTableColumnsChange) {
				handleTableColumnsChange(uniqueTableId, currentOrder, columnVisibility)
			}
		}
	}

	const moveColumnDown = (columnId: string) => {
		const currentOrder = [...columnOrder]
		const index = currentOrder.indexOf(columnId)
		if (index < currentOrder.length - 1) {
			;[currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]]
			setColumnOrder(currentOrder)
			if (uniqueTableId && handleTableColumnsChange) {
				handleTableColumnsChange(uniqueTableId, currentOrder, columnVisibility)
			}
		}
	}

	if (isLoading) {
		return (
			<div className="isolate flex h-full w-full flex-col p-4">
				<ChainsTableHeader
					selectedPreset="essential"
					setSelectedPreset={() => {}}
					columnPresets={CHAIN_COLUMN_PRESETS}
					applyPreset={() => {}}
					showColumnSelector={false}
					setShowColumnSelector={() => {}}
					handleExportCSV={() => {}}
					category={category}
				/>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading chains data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="isolate flex h-full w-full flex-col p-4">
				<ChainsTableHeader
					selectedPreset="essential"
					setSelectedPreset={() => {}}
					columnPresets={CHAIN_COLUMN_PRESETS}
					applyPreset={() => {}}
					showColumnSelector={false}
					setShowColumnSelector={() => {}}
					handleExportCSV={() => {}}
					category={category}
				/>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load chains data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="isolate flex h-full w-full flex-col p-4">
			<ChainsTableHeader
				selectedPreset={selectedPreset}
				setSelectedPreset={setSelectedPreset}
				columnPresets={CHAIN_COLUMN_PRESETS}
				applyPreset={applyPreset}
				showColumnSelector={showColumnPanel}
				setShowColumnSelector={setShowColumnPanel}
				handleExportCSV={handleExportCSV}
				category={category}
			/>

			<ColumnManagementPanel
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				columns={columnOptions}
				columnVisibility={columnVisibility}
				columnOrder={columnOrder}
				toggleColumnVisibility={toggleColumnVisibility}
				moveColumnUp={moveColumnUp}
				moveColumnDown={moveColumnDown}
			/>

			<div className="min-h-0 flex-1">
				<TableBody table={instance} />
			</div>

			<div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2">
				<div className="flex items-center gap-2">
					<button
						onClick={() => instance.previousPage()}
						disabled={!instance.getCanPreviousPage()}
						className="rounded-md border pro-border bg-(--bg-glass) px-3 py-1.5 text-sm pro-text1 transition-colors hover:bg-(--bg-tertiary) disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>
					<button
						onClick={() => instance.nextPage()}
						disabled={!instance.getCanNextPage()}
						className="rounded-md border pro-border bg-(--bg-glass) px-3 py-1.5 text-sm pro-text1 transition-colors hover:bg-(--bg-tertiary) disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm pro-text2">Rows per page:</span>
					<select
						value={pagination.pageSize}
						onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }))}
						className="rounded-md border pro-border bg-(--bg-glass) px-3 py-1.5 text-sm pro-text1 transition-colors focus:border-(--primary) focus:outline-hidden"
					>
						<option value="10">10</option>
						<option value="30">30</option>
						<option value="50">50</option>
					</select>
				</div>
			</div>
		</div>
	)
}
