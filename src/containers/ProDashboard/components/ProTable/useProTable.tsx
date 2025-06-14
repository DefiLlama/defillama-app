import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	ColumnDef
} from '@tanstack/react-table'
import { Parser } from 'expr-eval'
import { formatProtocolsList } from '~/hooks/data/defi'
import {
	useGetProtocolsListMultiChain,
	useGetProtocolsVolumeByMultiChain,
	useGetProtocolsFeesAndRevenueByMultiChain
} from '~/api/categories/chains/multiChainClient'
import { TABLE_CATEGORIES, protocolsByChainTableColumns } from '~/components/Table/Defi/Protocols'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { protocolsByChainColumns } from '~/components/Table/Defi/Protocols/columns'

interface CustomColumn {
	id: string
	name: string
	expression: string
	isValid: boolean
	errorMessage?: string
}

import { TableFilters } from '../../types'
import { getPercentChange } from '~/utils'
import { Icon } from '~/components/Icon'

// Helper function to recalculate parent protocol metrics based on filtered children
function recalculateParentMetrics(parent: any, filteredSubRows: any[]) {
	// Initialize aggregated values
	let tvl = 0
	let tvlPrevDay = 0
	let tvlPrevWeek = 0
	let tvlPrevMonth = 0
	let mcap = 0
	let volume_24h = 0
	let volume_7d = 0
	let fees_24h = 0
	let fees_7d = 0
	let fees_30d = 0
	let revenue_24h = 0
	let revenue_7d = 0
	let revenue_30d = 0

	// Aggregate metrics from filtered children
	filteredSubRows.forEach((child) => {
		if (child.tvl) tvl += child.tvl
		if (child.tvlPrevDay) tvlPrevDay += child.tvlPrevDay
		if (child.tvlPrevWeek) tvlPrevWeek += child.tvlPrevWeek
		if (child.tvlPrevMonth) tvlPrevMonth += child.tvlPrevMonth
		if (child.mcap) mcap += child.mcap
		if (child.volume_24h) volume_24h += child.volume_24h
		if (child.volume_7d) volume_7d += child.volume_7d
		if (child.fees_24h) fees_24h += child.fees_24h
		if (child.fees_7d) fees_7d += child.fees_7d
		if (child.fees_30d) fees_30d += child.fees_30d
		if (child.revenue_24h) revenue_24h += child.revenue_24h
		if (child.revenue_7d) revenue_7d += child.revenue_7d
		if (child.revenue_30d) revenue_30d += child.revenue_30d
	})

	// Calculate percentage changes
	const change_1d = getPercentChange(tvl, tvlPrevDay)
	const change_7d = getPercentChange(tvl, tvlPrevWeek)
	const change_1m = getPercentChange(tvl, tvlPrevMonth)

	// Calculate mcaptvl
	let mcaptvl = null
	if (tvl && mcap) {
		mcaptvl = +(mcap / tvl).toFixed(2)
	}

	return {
		...parent,
		tvl,
		tvlPrevDay,
		tvlPrevWeek,
		tvlPrevMonth,
		mcap: mcap || parent.mcap, // Keep original mcap if no child has mcap
		volume_24h,
		volume_7d,
		fees_24h,
		fees_7d,
		fees_30d,
		revenue_24h,
		revenue_7d,
		revenue_30d,
		change_1d,
		change_7d,
		change_1m,
		mcaptvl,
		subRows: filteredSubRows
	}
}

export function useProTable(chains: string[], filters?: TableFilters, onFilterClick?: () => void) {
	const { fullProtocolsList, parentProtocols } = useGetProtocolsListMultiChain(chains)
	const { data: chainProtocolsVolumes } = useGetProtocolsVolumeByMultiChain(chains)
	const { data: chainProtocolsFees } = useGetProtocolsFeesAndRevenueByMultiChain(chains)

	const finalProtocolsList = React.useMemo(() => {
		if (!fullProtocolsList) return []

		let protocols = formatProtocolsList({
			extraTvlsEnabled: {},
			protocols: fullProtocolsList,
			parentProtocols,
			volumeData: chainProtocolsVolumes,
			feesData: chainProtocolsFees
		})

		// Apply filters
		if (filters) {
			// Convert arrays to Sets for O(1) lookup performance
			const protocolSet = filters.protocols?.length ? new Set(filters.protocols) : null
			const categorySet = filters.categories?.length ? new Set(filters.categories) : null

			if (protocolSet) {
				protocols = protocols
					.map((p) => {
						// Check if this protocol matches directly
						if (p.name && protocolSet.has(p.name)) {
							return p
						}

						// If this is a parent protocol, filter its subRows
						const protocolWithSubRows = p as any
						if (protocolWithSubRows.isParentProtocol && protocolWithSubRows.subRows) {
							const filteredSubRows = protocolWithSubRows.subRows.filter(
								(child: any) => child.name && protocolSet.has(child.name)
							)

							// If any child protocols match, return the parent with filtered subRows and recalculated metrics
							if (filteredSubRows.length > 0) {
								return recalculateParentMetrics(protocolWithSubRows, filteredSubRows)
							}
						}

						return null
					})
					.filter((p) => p !== null)
			}
			if (categorySet) {
				protocols = protocols.filter((p) => categorySet.has(p.category))
			}
		}

		return protocols
	}, [fullProtocolsList, parentProtocols, chainProtocolsVolumes, chainProtocolsFees, filters])

	const optionsKey = 'protocolsTableColumns'
	const customColumnsKey = 'protocolsTableCustomColumns'
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'tvl' }])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [filterState, setFilterState] = React.useState(TABLE_CATEGORIES.TVL)
	const [showColumnPanel, setShowColumnPanel] = React.useState(false)
	const [searchTerm, setSearchTerm] = React.useState('')
	const [columnOrder, setColumnOrder] = React.useState<string[]>([])
	const [customColumns, setCustomColumns] = React.useState<CustomColumn[]>([])

	// Load custom columns from localStorage on mount
	React.useEffect(() => {
		const savedCustomColumns = window.localStorage.getItem(customColumnsKey)
		if (savedCustomColumns) {
			try {
				const parsed = JSON.parse(savedCustomColumns) as CustomColumn[]
				setCustomColumns(parsed)
			} catch (error) {
				console.error('Failed to parse saved custom columns:', error)
			}
		}
	}, [customColumnsKey])

	// Create custom column definitions
	const customColumnDefs = React.useMemo(() => {
		const parser = new Parser()

		return customColumns
			.filter((col) => col.isValid)
			.map(
				(customCol): ColumnDef<IProtocolRow> => ({
					id: customCol.id,
					header: customCol.name,
					accessorFn: (row) => {
						try {
							const context: Record<string, number> = {}

							protocolsByChainTableColumns.forEach((tableCol) => {
								const value = row[tableCol.key as keyof IProtocolRow]
								if (typeof value === 'number') {
									context[tableCol.key] = value
								} else if (typeof value === 'string') {
									const numValue = parseFloat(value)
									if (!isNaN(numValue)) {
										context[tableCol.key] = numValue
									}
								}
							})

							const expr = parser.parse(customCol.expression)
							const result = expr.evaluate(context)

							return typeof result === 'number' ? result : null
						} catch (error) {
							console.warn(`Error evaluating custom column "${customCol.name}":`, error)
							return null
						}
					},
					cell: ({ getValue }) => {
						const value = getValue() as number | null
						if (value === null || value === undefined) return '-'

						if (Math.abs(value) >= 1e9) {
							return `$${(value / 1e9).toFixed(2)}B`
						} else if (Math.abs(value) >= 1e6) {
							return `$${(value / 1e6).toFixed(2)}M`
						} else if (Math.abs(value) >= 1e3) {
							return `$${(value / 1e3).toFixed(2)}K`
						} else {
							return value.toFixed(2)
						}
					},
					sortingFn: (rowA, rowB, columnId) => {
						const desc = false
						let a = (rowA.getValue(columnId) ?? null) as any
						let b = (rowB.getValue(columnId) ?? null) as any
						if (a === null && b !== null) {
							return desc ? -1 : 1
						}
						if (a !== null && b === null) {
							return desc ? 1 : -1
						}
						if (a === null && b === null) {
							return 0
						}
						return a - b
					}
				})
			)
	}, [customColumns])

	// Create custom columns with filter button
	const columnsWithFilter = React.useMemo(() => {
		if (!onFilterClick) return { name: null, category: null }

		const originalNameColumn = protocolsByChainColumns.find((col) => col.id === 'name')
		const originalCategoryColumn = protocolsByChainColumns.find((col) => col.id === 'category')

		const hasActiveFilters = filters && (filters.protocols?.length || filters.categories?.length)

		const filterButton = (
			<button
				onClick={(e) => {
					e.stopPropagation()
					onFilterClick()
				}}
				className={`p-1 rounded hover:bg-[var(--bg3)] transition-colors ${
					hasActiveFilters ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text3)]'
				}`}
				title="Filter protocols"
			>
				<Icon name="settings" height={14} width={14} />
			</button>
		)

		const nameColumn = originalNameColumn
			? {
					...originalNameColumn,
					id: 'name',
					header: () => (
						<div className="flex items-center gap-2">
							<span>Name</span>
							{filterButton}
						</div>
					)
			  }
			: null

		const categoryColumn = originalCategoryColumn
			? {
					...originalCategoryColumn,
					id: 'category',
					header: () => (
						<div className="flex items-center gap-2 justify-end">
							<span>Category</span>
							{React.cloneElement(filterButton, { key: 'category-filter' })}
						</div>
					)
			  }
			: null

		return { name: nameColumn, category: categoryColumn }
	}, [filters, onFilterClick])

	const allColumns = React.useMemo(() => {
		const baseColumns = [...protocolsByChainColumns]

		if (columnsWithFilter.name) {
			const nameIndex = baseColumns.findIndex((col) => col.id === 'name')
			if (nameIndex !== -1) {
				baseColumns[nameIndex] = columnsWithFilter.name as ColumnDef<IProtocolRow>
			}
		}

		if (columnsWithFilter.category) {
			const categoryIndex = baseColumns.findIndex((col) => col.id === 'category')
			if (categoryIndex !== -1) {
				baseColumns[categoryIndex] = columnsWithFilter.category as ColumnDef<IProtocolRow>
			}
		}

		return [...baseColumns, ...customColumnDefs]
	}, [customColumnDefs, columnsWithFilter])

	const table = useReactTable({
		data: finalProtocolsList,
		columns: allColumns,
		state: {
			sorting,
			expanded
		},
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const desc = sorting.length ? sorting[0].desc : true
				let a = (rowA.getValue(columnId) ?? null) as any
				let b = (rowB.getValue(columnId) ?? null) as any
				if (a === null && b !== null) {
					return desc ? -1 : 1
				}
				if (a !== null && b === null) {
					return desc ? 1 : -1
				}
				if (a === null && b === null) {
					return 0
				}
				return a - b
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: IProtocolRow) => row.subRows,
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	// Initialize column order on first render
	React.useEffect(() => {
		if (table && columnOrder.length === 0) {
			const visibleColumns = table
				.getAllLeafColumns()
				.filter((col) => col.getIsVisible())
				.map((col) => col.id)
			setColumnOrder(visibleColumns)
		}
	}, [
		table
			? table
					.getAllLeafColumns()
					.map((col) => col.getIsVisible())
					.join(',')
			: '',
		columnOrder.length
	])

	React.useEffect(() => {
		if (filterState === TABLE_CATEGORIES.TVL) {
			const newOptions = protocolsByChainTableColumns
				.filter(
					(column) => column.category === TABLE_CATEGORIES.TVL || column.key === 'name' || column.key === 'category'
				)
				.map((op) => op.key)
			addOption(newOptions, false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const addOption = (newOptions: string[], setLocalStorage = true) => {
		if (!table) return
		const ops = Object.fromEntries(
			table.getAllLeafColumns().map((col) => [col.id, newOptions.includes(col.id) ? true : false])
		)
		if (setLocalStorage) window.localStorage.setItem(optionsKey, JSON.stringify(ops))
		table.setColumnVisibility(ops)
	}

	const columnPresets = {
		essential: ['name', 'category', 'tvl', 'change_1d', 'change_7d'],
		fees: ['name', 'category', 'tvl', 'fees_24h', 'fees_7d', 'revenue_24h', 'revenue_7d'],
		volume: ['name', 'category', 'tvl', 'volume_24h', 'volume_7d', 'volumeChange_7d'],
		advanced: ['name', 'category', 'tvl', 'change_1d', 'fees_24h', 'revenue_24h', 'volume_24h', 'mcaptvl', 'pf', 'ps']
	}

	const applyPreset = (presetName: string) => {
		const preset = columnPresets[presetName]
		if (preset) {
			addOption(preset, true)
			setShowColumnPanel(false)
		}
	}

	// Get current column visibility state
	const currentColumns = React.useMemo(() => {
		if (!table) return {}
		return table.getAllLeafColumns().reduce((acc, col) => {
			acc[col.id] = col.getIsVisible()
			return acc
		}, {} as Record<string, boolean>)
	}, [
		table
			? table
					.getAllLeafColumns()
					.map((col) => col.getIsVisible())
					.join(',')
			: ''
	])

	const toggleColumnVisibility = (columnKey: string, isVisible: boolean) => {
		const newOptions = Object.keys(currentColumns).filter((key) =>
			key === columnKey ? isVisible : currentColumns[key]
		)

		addOption(newOptions, true)
	}

	const downloadCSV = () => {
		if (!table) return

		const headers = table
			.getVisibleFlatColumns()
			.filter((col) => col.id !== 'expand')
			.map((col) => col.columnDef.header || col.id)

		const rows = table.getRowModel().rows.map((row) => {
			return table
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
			...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
		].join('\n')

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const link = document.createElement('a')
		const url = URL.createObjectURL(blob)
		link.setAttribute('href', url)
		const filename =
			chains.length === 1
				? `${chains[0]}_protocols_${new Date().toISOString().split('T')[0]}.csv`
				: chains.length <= 3
				? `${chains.join('_')}_protocols_${new Date().toISOString().split('T')[0]}.csv`
				: `multi_chain_${chains.length}_protocols_${new Date().toISOString().split('T')[0]}.csv`
		link.setAttribute('download', filename)
		link.style.visibility = 'hidden'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}

	// Custom column management functions
	const addCustomColumn = (column: CustomColumn) => {
		const updatedColumns = [...customColumns, column]
		setCustomColumns(updatedColumns)
		window.localStorage.setItem(customColumnsKey, JSON.stringify(updatedColumns))
	}

	const removeCustomColumn = (columnId: string) => {
		const updatedColumns = customColumns.filter((col) => col.id !== columnId)
		setCustomColumns(updatedColumns)
		window.localStorage.setItem(customColumnsKey, JSON.stringify(updatedColumns))

		// Also remove from visible columns if it's currently shown
		const newVisibility = { ...table.getState().columnVisibility }
		delete newVisibility[columnId]
		table.setColumnVisibility(newVisibility)
	}

	const updateCustomColumn = (columnId: string, updates: Partial<CustomColumn>) => {
		const updatedColumns = customColumns.map((col) => (col.id === columnId ? { ...col, ...updates } : col))
		setCustomColumns(updatedColumns)
		window.localStorage.setItem(customColumnsKey, JSON.stringify(updatedColumns))
	}

	// Extract unique categories from all protocols
	const categories = React.useMemo(() => {
		if (!fullProtocolsList) return []
		const uniqueCategories = new Set<string>()
		fullProtocolsList.forEach((protocol: any) => {
			if (protocol.category) {
				uniqueCategories.add(protocol.category)
			}
		})
		return Array.from(uniqueCategories).sort()
	}, [fullProtocolsList])

	// Get available protocols for the current chain(s) sorted by TVL
	const availableProtocols = React.useMemo(() => {
		if (!fullProtocolsList) return []
		// Sort protocols by TVL in descending order
		return [...fullProtocolsList].sort((a, b) => {
			const aTvl = a.tvl || 0
			const bTvl = b.tvl || 0
			return bTvl - aTvl
		})
	}, [fullProtocolsList])

	return {
		table,
		showColumnPanel,
		setShowColumnPanel,
		searchTerm,
		setSearchTerm,
		currentColumns,
		columnOrder,
		addOption,
		toggleColumnVisibility,
		columnPresets,
		applyPreset,
		downloadCSV,
		customColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn,
		categories,
		availableProtocols
	}
}
