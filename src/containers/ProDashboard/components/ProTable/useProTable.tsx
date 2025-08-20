import * as React from 'react'
import {
	ColumnDef,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Parser } from 'expr-eval'
import {
	useGetProtocolsFeesAndRevenueByMultiChain,
	useGetProtocolsListMultiChain,
	useGetProtocolsVolumeByMultiChain
} from '~/api/categories/chains/multiChainClient'
import { Icon } from '~/components/Icon'
import { protocolsByChainTableColumns } from '~/components/Table/Defi/Protocols'
import { protocolsByChainColumns } from '~/components/Table/Defi/Protocols/columns'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useUserConfig } from '~/hooks/useUserConfig'
import { formattedNum, getPercentChange } from '~/utils'
import { CustomView, TableFilters } from '../../types'

interface CustomColumn {
	id: string
	name: string
	expression: string
	isValid: boolean
	errorMessage?: string
}

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
	let fees_1y = 0
	let average_1y = 0
	let revenue_24h = 0
	let revenue_7d = 0
	let revenue_30d = 0
	let revenue_1y = 0

	let weightedVolumeChange = 0
	let totalVolumeWeight = 0

	// Aggregate metrics from filtered children
	filteredSubRows.forEach((child) => {
		if (child.tvl) tvl += child.tvl
		if (child.tvlPrevDay) tvlPrevDay += child.tvlPrevDay
		if (child.tvlPrevWeek) tvlPrevWeek += child.tvlPrevWeek
		if (child.tvlPrevMonth) tvlPrevMonth += child.tvlPrevMonth
		if (child.mcap) mcap += child.mcap
		if (child.volume_24h) volume_24h += child.volume_24h
		if (child.volume_7d) volume_7d += child.volume_7d
		if (child.volume_7d && child.volumeChange_7d !== undefined && child.volumeChange_7d !== null) {
			weightedVolumeChange += child.volumeChange_7d * child.volume_7d
			totalVolumeWeight += child.volume_7d
		}
		if (child.fees_24h) fees_24h += child.fees_24h
		if (child.fees_7d) fees_7d += child.fees_7d
		if (child.fees_30d) fees_30d += child.fees_30d
		if (child.fees_1y) fees_1y += child.fees_1y
		if (child.average_1y) average_1y += child.average_1y
		if (child.revenue_24h) revenue_24h += child.revenue_24h
		if (child.revenue_7d) revenue_7d += child.revenue_7d
		if (child.revenue_30d) revenue_30d += child.revenue_30d
		if (child.revenue_1y) revenue_1y += child.revenue_1y
	})

	const change_1d = getPercentChange(tvl, tvlPrevDay)
	const change_7d = getPercentChange(tvl, tvlPrevWeek)
	const change_1m = getPercentChange(tvl, tvlPrevMonth)

	let volumeChange_7d = null
	if (totalVolumeWeight > 0) {
		volumeChange_7d = weightedVolumeChange / totalVolumeWeight
	}

	let mcaptvl = null
	const finalMcap = mcap > 0 ? mcap : parent.mcap || 0
	if (tvl && finalMcap) {
		mcaptvl = +formattedNum(finalMcap / tvl)
	}

	return {
		...parent,
		tvl,
		tvlPrevDay,
		tvlPrevWeek,
		tvlPrevMonth,
		mcap: finalMcap,
		volume_24h,
		volume_7d,
		volumeChange_7d,
		fees_24h,
		fees_7d,
		fees_30d,
		fees_1y,
		average_1y,
		revenue_24h,
		revenue_7d,
		revenue_30d,
		revenue_1y,
		change_1d,
		change_7d,
		change_1m,
		mcaptvl,
		subRows: filteredSubRows
	}
}

interface UseProTableOptions {
	initialColumnOrder?: string[]
	initialColumnVisibility?: Record<string, boolean>
	initialCustomColumns?: CustomColumn[]
	initialActiveViewId?: string
	onColumnsChange?: (
		columnOrder: string[],
		columnVisibility: Record<string, boolean>,
		customColumns: CustomColumn[],
		activeViewId?: string
	) => void
}

export function useProTable(
	chains: string[],
	filters?: TableFilters,
	onFilterClick?: () => void,
	options?: UseProTableOptions
) {
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
				protocols = protocols
					.map((p) => {
						if (p.category && categorySet.has(p.category)) {
							return p
						}

						const protocolWithSubRows = p as any
						if (protocolWithSubRows.isParentProtocol && protocolWithSubRows.subRows) {
							const filteredSubRows = protocolWithSubRows.subRows.filter(
								(child: any) => child.category && categorySet.has(child.category)
							)

							if (filteredSubRows.length > 0) {
								return recalculateParentMetrics(protocolWithSubRows, filteredSubRows)
							}
						}

						return null
					})
					.filter((p) => p !== null)
			}
		}

		return protocols
	}, [fullProtocolsList, parentProtocols, chainProtocolsVolumes, chainProtocolsFees, filters])

	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'tvl' }])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [showColumnPanel, setShowColumnPanel] = React.useState(false)
	const [searchTerm, setSearchTerm] = React.useState('')
	const [columnOrder, setColumnOrder] = React.useState<string[]>(options?.initialColumnOrder || [])
	const [customColumns, setCustomColumns] = React.useState<CustomColumn[]>(options?.initialCustomColumns || [])
	const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null)
	const [columnVisibility, setColumnVisibility] = React.useState(options?.initialColumnVisibility || {})
	const [activeCustomView, setActiveCustomView] = React.useState<string | null>(options?.initialActiveViewId || null)

	const { userConfig, saveUserConfig } = useUserConfig()

	const customViews = React.useMemo(() => {
		if (!userConfig || !userConfig?.tableViews) {
			return []
		}
		return userConfig?.tableViews as CustomView[]
	}, [userConfig])

	React.useEffect(() => {
		if (options?.initialActiveViewId && customViews.length > 0) {
			const view = customViews.find((v) => v.id === options.initialActiveViewId)
			if (view && !columnOrder.length && !Object.keys(columnVisibility).length) {
				setColumnOrder(view.columnOrder)
				setColumnVisibility(view.columnVisibility)
				setCustomColumns(view.customColumns || [])
			}
		}
	}, [customViews, options?.initialActiveViewId])

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
				className={`rounded p-1 transition-colors hover:bg-(--bg-tertiary) ${
					hasActiveFilters ? 'text-blue-600 dark:text-blue-400' : 'text-(--text-tertiary)'
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
						<div className="flex items-center justify-end gap-2">
							<span>Category</span>
							{React.cloneElement(filterButton, { key: 'category-filter' })}
						</div>
					)
				}
			: null

		return { name: nameColumn, category: categoryColumn }
	}, [filters, onFilterClick])

	const totals = React.useMemo(() => {
		const sums: Record<string, number> = {}
		const usdMetrics = [
			'tvl',
			'mcap',
			'fees_24h',
			'fees_7d',
			'fees_30d',
			'fees_1y',
			'average_1y',
			'revenue_24h',
			'revenue_7d',
			'revenue_30d',
			'revenue_1y',
			'volume_24h',
			'volume_7d',
			'cumulativeFees',
			'cumulativeVolume'
		]

		usdMetrics.forEach((metric) => {
			sums[metric] = 0
		})

		finalProtocolsList.forEach((protocol) => {
			usdMetrics.forEach((metric) => {
				const value = protocol[metric as keyof IProtocolRow]
				if (typeof value === 'number' && value > 0) {
					sums[metric] += value
				}
			})
		})

		return sums
	}, [finalProtocolsList])

	const percentageShareColumnDefs = React.useMemo(() => {
		const usdMetrics = [
			{ key: 'tvl', name: 'TVL % Share' },
			{ key: 'mcap', name: 'Market Cap % Share' },
			{ key: 'fees_24h', name: 'Fees 24h % Share' },
			{ key: 'fees_7d', name: 'Fees 7d % Share' },
			{ key: 'fees_30d', name: 'Fees 30d % Share' },
			{ key: 'fees_1y', name: 'Fees 1y % Share' },
			{ key: 'average_1y', name: 'Monthly Avg 1Y Fees % Share' },
			{ key: 'revenue_24h', name: 'Revenue 24h % Share' },
			{ key: 'revenue_7d', name: 'Revenue 7d % Share' },
			{ key: 'revenue_30d', name: 'Revenue 30d % Share' },
			{ key: 'revenue_1y', name: 'Revenue 1y % Share' },
			{ key: 'volume_24h', name: 'Volume 24h % Share' },
			{ key: 'volume_7d', name: 'Volume 7d % Share' },
			{ key: 'cumulativeFees', name: 'Cumulative Fees % Share' },
			{ key: 'cumulativeVolume', name: 'Cumulative Volume % Share' }
		]

		return usdMetrics.map(
			(metric): ColumnDef<IProtocolRow> => ({
				id: `${metric.key}_share`,
				header: metric.name,
				accessorFn: (row) => {
					const value = row[metric.key as keyof IProtocolRow]
					const total = totals[metric.key]

					if (typeof value === 'number' && value > 0 && total > 0) {
						return (value / total) * 100
					}
					return null
				},
				cell: ({ getValue }) => {
					const value = getValue() as number | null
					if (value === null || value === undefined) return ''

					return `${value.toFixed(2)}%`
				}
			})
		)
	}, [totals])

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

		return [...baseColumns, ...customColumnDefs, ...percentageShareColumnDefs]
	}, [customColumnDefs, columnsWithFilter, percentageShareColumnDefs])

	const table = useReactTable({
		data: finalProtocolsList,
		columns: allColumns,
		state: {
			sorting,
			expanded,
			columnVisibility
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
		onColumnVisibilityChange: setColumnVisibility,
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
		if (table && columnOrder.length > 0) {
			table.setColumnOrder(columnOrder)
		}
	}, [table, columnOrder])

	const prevColumnOrderRef = React.useRef<string[]>(null)
	const prevColumnVisibilityRef = React.useRef<Record<string, boolean>>(null)
	const prevCustomColumnsRef = React.useRef<CustomColumn[]>(null)
	const prevActiveCustomViewRef = React.useRef<string | null>(null)

	React.useEffect(() => {
		if (options?.onColumnsChange) {
			const columnOrderChanged = JSON.stringify(prevColumnOrderRef.current) !== JSON.stringify(columnOrder)
			const columnVisibilityChanged =
				JSON.stringify(prevColumnVisibilityRef.current) !== JSON.stringify(columnVisibility)
			const customColumnsChanged = JSON.stringify(prevCustomColumnsRef.current) !== JSON.stringify(customColumns)
			const activeViewChanged = prevActiveCustomViewRef.current !== activeCustomView

			if (columnOrderChanged || columnVisibilityChanged || customColumnsChanged || activeViewChanged) {
				prevColumnOrderRef.current = columnOrder
				prevColumnVisibilityRef.current = columnVisibility
				prevCustomColumnsRef.current = customColumns
				prevActiveCustomViewRef.current = activeCustomView
				options.onColumnsChange(columnOrder, columnVisibility, customColumns, activeCustomView || undefined)
			}
		}
	}, [columnOrder, columnVisibility, customColumns, activeCustomView, options])

	React.useEffect(() => {
		if (!options?.initialColumnVisibility) {
			applyPreset('essential')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const addOption = (newOptions: string[]) => {
		if (!table) return
		const ops = Object.fromEntries(
			table.getAllLeafColumns().map((col) => [col.id, newOptions.includes(col.id) ? true : false])
		)
		setColumnVisibility(ops)
	}

	const columnPresets = React.useMemo(
		() => ({
			essential: ['name', 'category', 'chains', 'tvl', 'change_1d', 'change_7d', 'mcap'],
			fees: ['name', 'category', 'chains', 'tvl', 'fees_24h', 'fees_7d', 'revenue_24h', 'revenue_7d'],
			volume: ['name', 'category', 'chains', 'tvl', 'volume_24h', 'volume_7d', 'volumeChange_7d'],
			advanced: [
				'name',
				'category',
				'chains',
				'tvl',
				'change_1d',
				'fees_24h',
				'revenue_24h',
				'volume_24h',
				'mcaptvl',
				'pf',
				'ps'
			]
		}),
		[]
	)

	const applyPreset = (presetName: string) => {
		const preset = columnPresets[presetName]
		if (preset) {
			addOption(preset)
			setShowColumnPanel(false)
			setSelectedPreset(presetName)

			setColumnOrder(preset)
		}
	}

	// Get current column visibility state
	const currentColumns = React.useMemo(() => {
		if (!table) return {}
		return table.getAllLeafColumns().reduce(
			(acc, col) => {
				acc[col.id] = col.getIsVisible()
				return acc
			},
			{} as Record<string, boolean>
		)
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

		addOption(newOptions)
		setSelectedPreset(null)

		if (isVisible) {
			setColumnOrder((prev) => [...prev, columnKey])
		} else {
			setColumnOrder((prev) => prev.filter((id) => id !== columnKey))
		}
	}

	const moveColumnUp = (columnKey: string) => {
		setColumnOrder((prev) => {
			const index = prev.indexOf(columnKey)
			if (index <= 0) return prev

			const newOrder = [...prev]
			const temp = newOrder[index]
			newOrder[index] = newOrder[index - 1]
			newOrder[index - 1] = temp
			return newOrder
		})
	}

	const moveColumnDown = (columnKey: string) => {
		setColumnOrder((prev) => {
			const index = prev.indexOf(columnKey)
			if (index === -1 || index >= prev.length - 1) return prev

			if (index + 1 >= prev.length) return prev

			const newOrder = [...prev]
			const temp = newOrder[index]
			newOrder[index] = newOrder[index + 1]
			newOrder[index + 1] = temp
			return newOrder
		})
	}

	const downloadCSV = () => {
		if (!table) return

		const visibleColumns = table.getVisibleFlatColumns().filter((col) => col.id !== 'expand')

		const sortedColumns =
			columnOrder.length > 0
				? visibleColumns.sort((a, b) => {
						const indexA = columnOrder.indexOf(a.id)
						const indexB = columnOrder.indexOf(b.id)
						if (indexA === -1) return 1
						if (indexB === -1) return -1
						return indexA - indexB
					})
				: visibleColumns

		const headers = sortedColumns.map((col) => {
			const hdr = col.columnDef.header
			return typeof hdr === 'string' ? hdr : col.id
		})

		const rows = table.getSortedRowModel().rows.map((row) => {
			return sortedColumns.map((col) => {
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
	}

	const removeCustomColumn = (columnId: string) => {
		const updatedColumns = customColumns.filter((col) => col.id !== columnId)
		setCustomColumns(updatedColumns)

		// Also remove from visible columns if it's currently shown
		setColumnVisibility((prev) => {
			const newVisibility = { ...prev }
			delete newVisibility[columnId]
			return newVisibility
		})
	}

	const updateCustomColumn = (columnId: string, updates: Partial<CustomColumn>) => {
		const updatedColumns = customColumns.map((col) => (col.id === columnId ? { ...col, ...updates } : col))
		setCustomColumns(updatedColumns)
	}

	const saveCustomView = React.useCallback(
		async (name: string) => {
			const newView: CustomView = {
				id: `custom_view_${Date.now()}`,
				name,
				columnOrder: [...columnOrder],
				columnVisibility: { ...columnVisibility },
				customColumns: [...customColumns],
				createdAt: Date.now()
			}

			const updatedViews = [...customViews, newView]

			if (saveUserConfig) {
				await saveUserConfig({
					...userConfig,
					tableViews: updatedViews
				})
			}

			setActiveCustomView(newView.id)
			setSelectedPreset(null)

			return newView
		},
		[columnOrder, columnVisibility, customColumns, customViews, saveUserConfig, userConfig]
	)

	const deleteCustomView = React.useCallback(
		async (viewId: string) => {
			const updatedViews = customViews.filter((view) => view.id !== viewId)

			if (saveUserConfig) {
				await saveUserConfig({
					...userConfig,
					tableViews: updatedViews
				})
			}

			if (activeCustomView === viewId) {
				setActiveCustomView(null)
			}
		},
		[customViews, activeCustomView, saveUserConfig, userConfig]
	)

	const loadCustomView = React.useCallback(
		(viewId: string) => {
			const view = customViews.find((v) => v.id === viewId)
			if (view) {
				setColumnOrder(view.columnOrder)
				setColumnVisibility(view.columnVisibility)
				setCustomColumns(view.customColumns || [])
				setActiveCustomView(viewId)
				setSelectedPreset(null)
			}
		},
		[customViews]
	)

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
		moveColumnUp,
		moveColumnDown,
		columnPresets,
		applyPreset,
		activePreset: selectedPreset || activeCustomView,
		downloadCSV,
		customColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn,
		categories,
		availableProtocols,
		customViews,
		saveCustomView,
		deleteCustomView,
		loadCustomView
	}
}
