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
import { Icon } from '~/components/Icon'
import { TagGroup } from '~/components/TagGroup'
import useWindowSize from '~/hooks/useWindowSize'
import { downloadCSV } from '~/utils'
import { useProDashboardEditorActions } from '../../../ProDashboardAPIContext'
import { TableFilters } from '../../../types'
import { CategoryFilterModal } from '../../CategoryFilterModal'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'
import { revenueDatasetColumns } from './columns'
import { useRevenueData } from './useRevenueData'

interface RevenueDatasetProps {
	chains?: string[]
	tableId?: string
	filters?: TableFilters
}

export function RevenueDataset({ chains, tableId, filters }: RevenueDatasetProps) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'total24h', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { handleTableFiltersChange } = useProDashboardEditorActions()
	const { data, isLoading, error, refetch } = useRevenueData(chains)
	const windowSize = useWindowSize()

	const [showFilterModal, setShowFilterModal] = React.useState(false)
	const [includeCategories, setIncludeCategories] = React.useState<string[]>(filters?.categories || [])
	const [excludeCategories, setExcludeCategories] = React.useState<string[]>(filters?.excludedCategories || [])

	React.useEffect(() => {
		setIncludeCategories(filters?.categories || [])
		setExcludeCategories(filters?.excludedCategories || [])
	}, [filters?.categories, filters?.excludedCategories])

	const availableCategories = React.useMemo(() => {
		if (!data || data.length === 0) return [] as string[]
		const unique = new Set<string>()
		data.forEach((row: any) => {
			if (row?.category) {
				unique.add(row.category)
			}
		})
		return Array.from(unique).sort((a, b) => a.localeCompare(b))
	}, [data])

	React.useEffect(() => {
		if (!availableCategories.length) return
		setIncludeCategories((prev) => prev.filter((cat) => availableCategories.includes(cat)))
		setExcludeCategories((prev) => prev.filter((cat) => availableCategories.includes(cat)))
	}, [availableCategories])

	const filteredData = React.useMemo(() => {
		if (!data) return []
		return data.filter((row: any) => {
			const category = row?.category ?? ''
			if (includeCategories.length > 0 && !includeCategories.includes(category)) {
				return false
			}
			if (excludeCategories.length > 0 && excludeCategories.includes(category)) {
				return false
			}
			return true
		})
	}, [data, includeCategories, excludeCategories])

	const handleApplyCategoryFilters = React.useCallback(
		(include: string[], exclude: string[]) => {
			const sanitizedInclude = include.filter((cat) => availableCategories.includes(cat))
			const sanitizedExclude = exclude.filter((cat) => availableCategories.includes(cat))
			setIncludeCategories(sanitizedInclude)
			setExcludeCategories(sanitizedExclude)
			if (tableId) {
				handleTableFiltersChange(tableId, {
					categories: sanitizedInclude.length ? sanitizedInclude : undefined,
					excludedCategories: sanitizedExclude.length ? sanitizedExclude : undefined
				})
			}
		},
		[availableCategories, handleTableFiltersChange, tableId]
	)

	const handleClearCategoryFilters = React.useCallback(() => {
		handleApplyCategoryFilters([], [])
	}, [handleApplyCategoryFilters])

	const columnsToUse = React.useMemo(() => {
		if (chains && chains.length > 0) {
			return revenueDatasetColumns.filter(
				(col: any) => col.accessorKey !== 'change_1d' && col.accessorKey !== 'change_7d'
			)
		}
		return revenueDatasetColumns
	}, [chains])

	const activeCategoryFilterCount = includeCategories.length + excludeCategories.length
	const filterButtonIsActive = activeCategoryFilterCount > 0

	const columnsWithFilterButton = React.useMemo(() => {
		return columnsToUse.map((col: ColumnDef<any>) => {
			const columnId = (col as any).id || (col as any).accessorKey
			if (columnId === 'category') {
				return {
					...col,
					header: () => (
						<div className="flex items-center justify-end gap-2">
							<span>Category</span>
							<button
								onClick={(event) => {
									event.stopPropagation()
									setShowFilterModal(true)
								}}
								className={`ml-2 rounded-md p-1 transition-colors hover:bg-(--bg-tertiary) ${
									filterButtonIsActive ? 'text-(--primary)' : 'text-(--text-tertiary)'
								}`}
								title="Filter categories"
							>
								<Icon name="settings" height={14} width={14} />
							</button>
						</div>
					)
				}
			}
			return col
		})
	}, [columnsToUse, filterButtonIsActive, activeCategoryFilterCount])

	const instance = useReactTable({
		data: filteredData || [],
		columns: columnsWithFilterButton as ColumnDef<any>[],
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
			category: 120,
			total24h: 145,
			total7d: 120,
			total30d: 120,
			change_1d: 100,
			change_7d: 100,
			chains: 200
		}

		instance.setColumnSizing(defaultSizing)
		instance.setColumnOrder(defaultOrder)
	}, [windowSize])

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
							{chains && chains.length > 0 ? `${chains.join(', ')} Revenue` : 'Protocol Revenue'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading revenue data...</p>
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
							{chains && chains.length > 0 ? `${chains.join(', ')} Revenue` : 'Protocol Revenue'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="pro-text2 text-center">Failed to load revenue data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="pro-text1 mr-auto text-lg font-semibold">
						{chains && chains.length > 0 ? `${chains.join(', ')} Revenue` : 'Protocol Revenue'}
					</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers =
									chains && chains.length > 0
										? ['Protocol', 'Category', '24h Revenue', '7d Revenue', '30d Revenue', 'Chains']
										: [
												'Protocol',
												'Category',
												'24h Revenue',
												'7d Revenue',
												'30d Revenue',
												'24h Change',
												'7d Change',
												'Chains'
											]

								const csv = [
									headers.join(','),
									...csvData.map((item) => {
										const values = [item.name, item.category, item.total24h, item.total7d, item.total30d]
										if (!(chains && chains.length > 0)) {
											values.push(item.change_1d, item.change_7d)
										}
										values.push(item.chains?.join(';') || '')
										return values.join(',')
									})
								].join('\n')

								downloadCSV('revenue-data.csv', csv, { addTimestamp: true })
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
			<TablePagination table={instance} />
			<CategoryFilterModal
				isOpen={showFilterModal}
				onClose={() => setShowFilterModal(false)}
				onApply={(include, exclude) => handleApplyCategoryFilters(include, exclude)}
				onClear={handleClearCategoryFilters}
				categories={availableCategories}
				initialInclude={includeCategories.filter((cat) => availableCategories.includes(cat))}
				initialExclude={excludeCategories.filter((cat) => availableCategories.includes(cat))}
			/>
		</div>
	)
}
