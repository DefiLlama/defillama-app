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
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
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

export function useProTable(chains: string[]) {
	const { fullProtocolsList, parentProtocols } = useGetProtocolsList({ chain: 'All' })
	const { data: chainProtocolsVolumes } = useGetProtocolsVolumeByChain('All')
	const { data: chainProtocolsFees } = useGetProtocolsFeesAndRevenueByChain('All')

	const allFormattedProtocols = React.useMemo(() => {
		if (!fullProtocolsList) return []

		return formatProtocolsList({
			extraTvlsEnabled: {},
			protocols: fullProtocolsList,
			parentProtocols,
			volumeData: chainProtocolsVolumes,
			feesData: chainProtocolsFees
		})
	}, [fullProtocolsList, parentProtocols, chainProtocolsVolumes, chainProtocolsFees])

	const finalProtocolsList = React.useMemo(() => {
		if (chains.length === 0 || chains.includes('All')) {
			return allFormattedProtocols
		}

		const chainSet = new Set(chains)

		return allFormattedProtocols.filter((protocol) => {
			if (protocol.chains && Array.isArray(protocol.chains)) {
				return protocol.chains.some((protocolChain) => chainSet.has(protocolChain))
			}

			if (protocol.chainTvls && typeof protocol.chainTvls === 'object') {
				return Object.keys(protocol.chainTvls).some((chain) => chainSet.has(chain))
			}

			return false
		})
	}, [allFormattedProtocols, chains])

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

	const allColumns = React.useMemo(() => {
		return [...protocolsByChainColumns, ...customColumnDefs]
	}, [customColumnDefs])

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
		updateCustomColumn
	}
}
