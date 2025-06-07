import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel
} from '@tanstack/react-table'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { TABLE_CATEGORIES, protocolsByChainTableColumns } from '~/components/Table/Defi/Protocols'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { protocolsByChainColumns } from '~/components/Table/Defi/Protocols/columns'

export function useProTable(chain: string) {
	const { fullProtocolsList, parentProtocols } = useGetProtocolsList({ chain })
	const { data: chainProtocolsVolumes } = useGetProtocolsVolumeByChain(chain)
	const { data: chainProtocolsFees } = useGetProtocolsFeesAndRevenueByChain(chain)

	const finalProtocolsList = React.useMemo(() => {
		const list = fullProtocolsList
			? formatProtocolsList({
					extraTvlsEnabled: {},
					protocols: fullProtocolsList,
					parentProtocols,
					volumeData: chainProtocolsVolumes,
					feesData: chainProtocolsFees
			  })
			: []
		return list
	}, [fullProtocolsList, parentProtocols, chainProtocolsVolumes, chainProtocolsFees])

	const optionsKey = 'protocolsTableColumns'
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'tvl' }])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [filterState, setFilterState] = React.useState(TABLE_CATEGORIES.TVL)
	const [showColumnPanel, setShowColumnPanel] = React.useState(false)
	const [searchTerm, setSearchTerm] = React.useState('')
	const [columnOrder, setColumnOrder] = React.useState<string[]>([])

	const table = useReactTable({
		data: finalProtocolsList,
		columns: protocolsByChainColumns,
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
		link.setAttribute('download', `${chain}_protocols_${new Date().toISOString().split('T')[0]}.csv`)
		link.style.visibility = 'hidden'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
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
		downloadCSV
	}
}
