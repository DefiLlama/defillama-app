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
import useWindowSize from '~/hooks/useWindowSize'
import { useProDashboard } from '../../../ProDashboardAPIContext'
import { LoadingSpinner } from '../../LoadingSpinner'
import { TableBody } from '../../ProTable/TableBody'
import { useRegisterCSVExtractor } from '../../../hooks/useCSVRegistry'
import { ChainsTableHeader } from './ChainsTableHeader'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { chainsDatasetColumns } from './columns'
import { useChainsData } from './useChainsData'

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
	const { handleTableColumnsChange } = useProDashboard()
	const uniqueTableId = React.useMemo(() => tableId || `chains-dataset-${category || 'all'}`, [tableId, category])

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
	const windowSize = useWindowSize()

	const totals = React.useMemo(() => {
		const sums: Record<string, number> = {}
		const metrics = ['tvl', 'stablesMcap', 'totalVolume24h', 'totalFees24h', 'totalAppRevenue24h', 'nftVolume']

		metrics.forEach((metric) => {
			sums[metric] = 0
		})

		if (data && Array.isArray(data)) {
			data.forEach((chain) => {
				metrics.forEach((metric) => {
					const value = chain[metric]
					if (typeof value === 'number' && value > 0) {
						sums[metric] += value
					}
				})
			})
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
					if (value === null || value === undefined) return <span className="pro-text2 font-mono">-</span>

					return <span className="pro-text2 font-mono">{value.toFixed(2)}%</span>
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
		data: data || [],
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

	const columnPresets = React.useMemo(
		() => ({
			essential: ['name', 'protocols', 'users', 'change_1d', 'change_7d', 'tvl', 'stablesMcap'],
			defi: ['name', 'protocols', 'tvl', 'change_1d', 'change_7d', 'change_1m', 'bridgedTvl', 'stablesMcap', 'mcaptvl'],
			volume: ['name', 'tvl', 'totalVolume24h', 'totalFees24h', 'totalAppRevenue24h', 'users', 'nftVolume'],
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
				'totalFees24h',
				'totalAppRevenue24h',
				'mcaptvl',
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
		}),
		[]
	)

	const applyPreset = React.useCallback(
		(preset: string) => {
			const presetColumns = columnPresets[preset]
			if (presetColumns) {
				const allColumns = instance.getAllColumns()
				const newVisibility: Record<string, boolean> = {}

				allColumns.forEach((column) => {
					newVisibility[column.id] = presetColumns.includes(column.id)
				})

				instance.setColumnVisibility(newVisibility)
				instance.setColumnOrder(presetColumns)
				setColumnVisibility(newVisibility)
				setColumnOrder(presetColumns)
				setSelectedPreset(preset)

				if (uniqueTableId && handleTableColumnsChange) {
					handleTableColumnsChange(uniqueTableId, presetColumns, newVisibility)
				}
			}
		},
		[columnPresets, instance, uniqueTableId, handleTableColumnsChange]
	)

	const toggleColumnVisibility = React.useCallback(
		(columnId: string) => {
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
		},
		[instance, uniqueTableId, handleTableColumnsChange, columnVisibility, columnOrder]
	)

	React.useEffect(() => {
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
			totalFees24h: 130,
			totalAppRevenue24h: 120,
			mcaptvl: 120,
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

		if (savedColumnVisibility && Object.keys(savedColumnVisibility).length > 0) {
			setColumnVisibility(savedColumnVisibility)
			instance.setColumnVisibility(savedColumnVisibility)
		} else if (Object.keys(columnVisibility).length === 0 && selectedPreset === 'essential') {
			const presetColumns = columnPresets['essential']
			if (presetColumns) {
				const allColumns = instance.getAllColumns()
				const newVisibility: Record<string, boolean> = {}
				allColumns.forEach((column) => {
					newVisibility[column.id] = presetColumns.includes(column.id)
				})
				setColumnVisibility(newVisibility)
				setColumnOrder(presetColumns)
				instance.setColumnVisibility(newVisibility)
				instance.setColumnOrder(presetColumns)
			}
		}
	}, [savedColumnOrder, savedColumnVisibility, selectedPreset, columnPresets, instance])

	const handleExportCSV = React.useCallback((returnContent: boolean = false) => {
		const headers = instance
			.getVisibleFlatColumns()
			.filter((col) => col.id !== 'expand')
			.map((col) => col.columnDef.header || col.id)

		const rows = instance.getFilteredRowModel().rows.map((row) => {
			return instance
				.getVisibleFlatColumns()
				.filter((col) => col.id !== 'expand')
				.map((col) => {
					const value = row.getValue(col.id)
					if (value === null || value === undefined) return ''
					if (typeof value === 'object') return JSON.stringify(value)
					return String(value)
				})
		})

		const csvContent = [
			headers.join(','),
			...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		].join('\n')

		if (returnContent) {
			return csvContent
		}

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const link = document.createElement('a')
		const url = URL.createObjectURL(blob)
		link.setAttribute('href', url)
		link.setAttribute('download', `chains-data-${new Date().toISOString().split('T')[0]}.csv`)
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}, [instance])

	// Register CSV extractor with the registry
	useRegisterCSVExtractor(uniqueTableId, handleExportCSV)

	const columnOptions = React.useMemo(
		() =>
			[...chainsDatasetColumns, ...percentageShareColumns].map((col) => ({
				id: (col as any).accessorKey || col.id,
				name: typeof col.header === 'string' ? col.header : col.id || ''
			})),
		[percentageShareColumns]
	)

	const moveColumnUp = React.useCallback(
		(columnId: string) => {
			const currentOrder = [...columnOrder]
			const index = currentOrder.indexOf(columnId)
			if (index > 0) {
				;[currentOrder[index - 1], currentOrder[index]] = [currentOrder[index], currentOrder[index - 1]]
				setColumnOrder(currentOrder)
				if (uniqueTableId && handleTableColumnsChange) {
					handleTableColumnsChange(uniqueTableId, currentOrder, columnVisibility)
				}
			}
		},
		[columnOrder, uniqueTableId, handleTableColumnsChange, columnVisibility]
	)

	const moveColumnDown = React.useCallback(
		(columnId: string) => {
			const currentOrder = [...columnOrder]
			const index = currentOrder.indexOf(columnId)
			if (index < currentOrder.length - 1) {
				;[currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]]
				setColumnOrder(currentOrder)
				if (uniqueTableId && handleTableColumnsChange) {
					handleTableColumnsChange(uniqueTableId, currentOrder, columnVisibility)
				}
			}
		},
		[columnOrder, uniqueTableId, handleTableColumnsChange, columnVisibility]
	)

	if (isLoading) {
		return (
			<div className="isolate flex h-full w-full flex-col p-4">
				<ChainsTableHeader
					selectedPreset="essential"
					setSelectedPreset={() => {}}
					columnPresets={columnPresets}
					applyPreset={() => {}}
					showColumnSelector={false}
					setShowColumnSelector={() => {}}
					handleExportCSV={() => {}}
					category={category}
				/>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading chains data...</p>
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
					columnPresets={columnPresets}
					applyPreset={() => {}}
					showColumnSelector={false}
					setShowColumnSelector={() => {}}
					handleExportCSV={() => {}}
					category={category}
				/>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="pro-text2 text-center">Failed to load chains data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="isolate flex h-full w-full flex-col p-4">
			<ChainsTableHeader
				selectedPreset={selectedPreset}
				setSelectedPreset={setSelectedPreset}
				columnPresets={columnPresets}
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

			<div className="flex-1 overflow-auto">
				<TableBody table={instance} />
			</div>

			<div className="pro-border mt-3 flex w-full items-center justify-between border-t pt-3">
				<div className="flex items-center gap-2">
					<button
						onClick={() => instance.previousPage()}
						disabled={!instance.getCanPreviousPage()}
						className="pro-border pro-bg1 pro-text1 hover:pro-bg2 border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>
					<button
						onClick={() => instance.nextPage()}
						disabled={!instance.getCanNextPage()}
						className="pro-border pro-bg1 pro-text1 hover:pro-bg2 border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</div>

				<div className="flex items-center gap-2">
					<span className="pro-text2 text-sm">Rows per page:</span>
					<select
						value={pagination.pageSize}
						onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }))}
						className="pro-border pro-bg1 pro-text1 border px-3 py-1.5 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
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
