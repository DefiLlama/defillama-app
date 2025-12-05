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
import { downloadCSV } from '~/utils'
import { yieldsDatasetColumns } from './columns'
import { YieldsFilters } from './YieldsFiltersPanel'

const CHAIN_SLUG_ALIASES: Record<string, string> = {
	optimism: 'op-mainnet',
	'op mainnet': 'op-mainnet',
	binance: 'bsc',
	xdai: 'gnosis',
	cosmos: 'cosmoshub',
	pulse: 'pulsechain',
	hyperliquid: 'hyperliquid-l1',
	'hyperliquid l1': 'hyperliquid-l1',
	zksync: 'zksync-era',
	'zksync era': 'zksync-era'
}

const normalizeChainSlug = (chain: string): string => {
	const slug = chain.toLowerCase().trim().replace(/\s+/g, '-')
	return CHAIN_SLUG_ALIASES[slug] ?? CHAIN_SLUG_ALIASES[chain.toLowerCase().trim()] ?? slug
}

interface UseYieldsTableOptions {
	data: any[]
	isLoading: boolean
	chains?: string[]
	initialColumnOrder?: string[]
	initialColumnVisibility?: Record<string, boolean>
	initialFilters?: YieldsFilters
	onColumnsChange?: (columnOrder: string[], columnVisibility: Record<string, boolean>) => void
	onFiltersChange?: (filters: YieldsFilters) => void
}

export function useYieldsTable({
	data,
	isLoading,
	chains = [],
	initialColumnOrder,
	initialColumnVisibility,
	initialFilters,
	onColumnsChange,
	onFiltersChange
}: UseYieldsTableOptions) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'tvl', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(initialColumnOrder || [])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility || {})
	const [showColumnPanel, setShowColumnPanel] = React.useState(false)
	const [searchTerm, setSearchTerm] = React.useState('')
	const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null)
	const [showFiltersPanel, setShowFiltersPanel] = React.useState(false)
	const [filters, setFilters] = React.useState<YieldsFilters>(initialFilters || {})

	const filteredData = React.useMemo(() => {
		if (!data) return []

		const selectedProtocols = filters.protocols?.map((protocol) => protocol.toLowerCase()) || []

		const selectedChainsSet =
			filters.chains && filters.chains.length > 0 ? new Set(filters.chains.map(normalizeChainSlug)) : null

		return data.filter((row) => {
			if (filters.apyMin !== undefined && row.apy < filters.apyMin) return false
			if (filters.apyMax !== undefined && row.apy > filters.apyMax) return false

			if (filters.baseApyMin !== undefined && row.apyBase < filters.baseApyMin) return false
			if (filters.baseApyMax !== undefined && row.apyBase > filters.baseApyMax) return false

			if (filters.tvlMin !== undefined && row.tvl < filters.tvlMin) return false
			if (filters.tvlMax !== undefined && row.tvl > filters.tvlMax) return false
			if (selectedChainsSet) {
				const hasMatchingChain = row.chains?.some((chain: string) => selectedChainsSet.has(normalizeChainSlug(chain)))
				if (!hasMatchingChain) return false
			}

			if (selectedProtocols.length > 0) {
				const projectSlug = (row.projectslug || row.project || '').toLowerCase()
				const projectName = (row.project || '').toLowerCase()

				const hasMatchingProtocol = selectedProtocols.some((protocol) => {
					if (projectSlug && projectSlug === protocol) return true
					if (projectName && projectName === protocol) return true
					return false
				})

				if (!hasMatchingProtocol) return false
			}

			if (filters.hasRewards && (!row.apyReward || row.apyReward <= 0)) return false

			if (filters.stablesOnly) {
				const isStable =
					row.pool?.toLowerCase().includes('stable') ||
					row.pool?.toLowerCase().includes('usdc') ||
					row.pool?.toLowerCase().includes('usdt') ||
					row.pool?.toLowerCase().includes('dai') ||
					row.pool?.toLowerCase().includes('busd')
				if (!isStable) return false
			}

			if (filters.poolTypes && filters.poolTypes.length > 0) {
				const projectLower = row.project?.toLowerCase() || ''
				const poolLower = row.pool?.toLowerCase() || ''

				const hasMatchingType = filters.poolTypes.some((type) => {
					switch (type.toLowerCase()) {
						case 'dex':
							return (
								poolLower.includes('lp') ||
								poolLower.includes('liquidity') ||
								projectLower.includes('swap') ||
								projectLower.includes('dex')
							)
						case 'lending':
							return row.apyBorrow !== null && row.apyBorrow !== undefined
						case 'staking':
							return poolLower.includes('stak') || projectLower.includes('stak')
						case 'cdp':
							return poolLower.includes('cdp') || projectLower.includes('vault')
						case 'bridge':
							return projectLower.includes('bridge')
						case 'yield aggregator':
							return projectLower.includes('yield') || projectLower.includes('aggregator')
						default:
							return false
					}
				})

				if (!hasMatchingType) return false
			}

			if (filters.tokens && filters.tokens.length > 0) {
				if (!row.pool) return false
				const poolUpper = row.pool.toUpperCase()
				const hasMatchingToken = filters.tokens.some((token) => poolUpper.includes(token))
				if (!hasMatchingToken) return false
			}

			return true
		})
	}, [data, filters])

	const table = useReactTable({
		data: filteredData || [],
		columns: yieldsDatasetColumns as ColumnDef<any>[],
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters,
			pagination,
			columnVisibility
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		maxMultiSortColCount: 1
	})

	React.useEffect(() => {
		const defaultSizing = {
			pool: 320,
			project: 140,
			chains: 60,
			tvl: 120,
			apy: 100,
			apyBase: 100,
			apyReward: 150,
			change1d: 100,
			change7d: 100,
			il7d: 100,
			apyBase7d: 120,
			apyNet7d: 120,
			apyMean30d: 130,
			volumeUsd1d: 120,
			volumeUsd7d: 120,
			apyBorrow: 100,
			totalSupplyUsd: 130,
			totalBorrowUsd: 130,
			totalAvailableUsd: 120,
			ltv: 80
		}

		table.setColumnSizing(defaultSizing)
	}, [table])

	React.useEffect(() => {
		if (table && columnOrder.length === 0 && !initialColumnOrder) {
			const allColumnIds = yieldsDatasetColumns
				.map((col) => {
					if (typeof col.id === 'string') return col.id
					if ('accessorKey' in col && typeof col.accessorKey === 'string') return col.accessorKey
					return ''
				})
				.filter(Boolean)
			const visibleColumns = allColumnIds.filter((id) => columnVisibility[id] !== false)
			setColumnOrder(visibleColumns)
		}
	}, [table, columnOrder.length, columnVisibility, initialColumnOrder])

	React.useEffect(() => {
		if (table && columnOrder.length > 0) {
			table.setColumnOrder(columnOrder)
		}
	}, [table, columnOrder])

	React.useEffect(() => {
		if (onColumnsChange && columnOrder.length > 0) {
			onColumnsChange(columnOrder, columnVisibility)
		}
	}, [columnOrder, columnVisibility, onColumnsChange])

	const columnPresets = React.useMemo(
		() => ({
			essential: ['pool', 'project', 'chains', 'tvl', 'apy', 'apyBase', 'apyReward'],
			lending: ['pool', 'project', 'chains', 'tvl', 'apy', 'apyBorrow', 'totalSupplyUsd', 'totalBorrowUsd', 'ltv'],
			volume: ['pool', 'project', 'chains', 'tvl', 'apy', 'volumeUsd1d', 'volumeUsd7d', 'il7d'],
			advanced: [
				'pool',
				'project',
				'chains',
				'tvl',
				'apy',
				'apyBase',
				'apyReward',
				'change1d',
				'change7d',
				'apyMean30d'
			]
		}),
		[]
	)

	const applyPreset = React.useCallback(
		(presetName: string) => {
			const preset = columnPresets[presetName]
			if (preset && table) {
				const newVisibility = {}
				const allColumnIds = yieldsDatasetColumns
					.map((col) => {
						if (typeof col.id === 'string') return col.id
						if ('accessorKey' in col && typeof col.accessorKey === 'string') return col.accessorKey
						return ''
					})
					.filter(Boolean)

				allColumnIds.forEach((colId) => {
					newVisibility[colId] = preset.includes(colId)
				})

				setColumnVisibility(newVisibility)
				setColumnOrder(preset)
				setShowColumnPanel(false)
				setSelectedPreset(presetName)
			}
		},
		[table, columnPresets]
	)

	React.useEffect(() => {
		if ((!initialColumnVisibility || Object.keys(initialColumnVisibility).length === 0) && table) {
			applyPreset('essential')
		}
	}, [initialColumnVisibility, table, applyPreset])

	const currentColumns = React.useMemo(() => {
		if (!table) return {}
		const allColumns = table.getAllLeafColumns()
		const visibility = {}
		allColumns.forEach((col) => {
			visibility[col.id] = columnVisibility[col.id] !== false
		})
		return visibility
	}, [table, columnVisibility])

	const toggleColumnVisibility = (columnKey: string, isVisible: boolean) => {
		setColumnVisibility((prev) => ({
			...prev,
			[columnKey]: isVisible
		}))

		if (isVisible) {
			setColumnOrder((prev) => {
				if (!prev.includes(columnKey)) {
					return [...prev, columnKey]
				}
				return prev
			})
		} else {
			setColumnOrder((prev) => prev.filter((id) => id !== columnKey))
		}

		setSelectedPreset(null)
	}

	const moveColumnUp = (columnKey: string) => {
		setColumnOrder((prev) => {
			const index = prev.indexOf(columnKey)
			if (index <= 0) return prev

			const newOrder = [...prev]
			;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
			return newOrder
		})
	}

	const moveColumnDown = (columnKey: string) => {
		setColumnOrder((prev) => {
			const index = prev.indexOf(columnKey)
			if (index === -1 || index >= prev.length - 1) return prev

			const newOrder = [...prev]
			;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
			return newOrder
		})
	}

	// const downloadCSV = () => {
	// 	if (!table) return

	// 	const visibleColumnIds = columnOrder.filter((id) => columnVisibility[id] !== false)
	// 	const headerMap: Record<string, string> = {
	// 		pool: 'Pool',
	// 		project: 'Project',
	// 		chains: 'Chain',
	// 		tvl: 'TVL',
	// 		apy: 'APY',
	// 		apyBase: 'Base APY',
	// 		apyReward: 'Reward APY',
	// 		rewardTokensSymbols: 'Reward Tokens',
	// 		change1d: '24h Change',
	// 		change7d: '7d Change',
	// 		il7d: '7d IL',
	// 		apyBase7d: 'Base APY (7d)',
	// 		apyNet7d: 'Net APY (7d)',
	// 		apyMean30d: 'Mean APY (30d)',
	// 		volumeUsd1d: 'Volume (24h)',
	// 		volumeUsd7d: 'Volume (7d)',
	// 		apyBorrow: 'Borrow APY',
	// 		totalSupplyUsd: 'Total Supplied',
	// 		totalBorrowUsd: 'Total Borrowed',
	// 		totalAvailableUsd: 'Available',
	// 		ltv: 'LTV'
	// 	}

	// 	const rows = table.getFilteredRowModel().rows
	// 	const csvData = rows.map((row) => row.original)

	// 	const headers = visibleColumnIds.map((id) => headerMap[id] || id)

	// 	const csvLines = csvData.map((item) =>
	// 		visibleColumnIds
	// 			.map((id) => {
	// 				const value = item[id]
	// 				if (value === undefined || value === null) return ''
	// 				if (Array.isArray(value)) {
	// 					return `"${value.join(';')}"`
	// 				}
	// 				if (typeof value === 'string') {
	// 					return `"${value.replace(/"/g, '""')}"`
	// 				}
	// 				return value
	// 			})
	// 			.join(',')
	// 	)

	// 	const csvContent = [headers.join(','), ...csvLines].join('\n')

	// 	downloadCSV('yields-data.csv', csvContent, { addTimestamp: true })
	// }

	const [poolName, setPoolName] = React.useState('')
	React.useEffect(() => {
		const columns = table.getColumn('pool')
		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(poolName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [poolName, table])

	const availableChains = React.useMemo(() => {
		if (!data) return []
		const chainsSet = new Set<string>()
		data.forEach((row) => {
			row.chains?.forEach((chain: string) => chainsSet.add(chain))
		})
		return Array.from(chainsSet).sort()
	}, [data])

	const availableTokens = React.useMemo(() => {
		if (!data) return []
		const tokenTvlMap = new Map<string, number>()

		data.forEach((row) => {
			if (row.pool && row.tvl) {
				const separators = /[-\s\/,+]/
				const tokens = row.pool.split(separators)
				tokens.forEach((token: string) => {
					const cleaned = token.trim().toUpperCase()
					if (cleaned && cleaned.length >= 2 && !['LP', 'V2', 'V3', 'POOL', 'VAULT', 'FARM'].includes(cleaned)) {
						const currentTvl = tokenTvlMap.get(cleaned) || 0
						tokenTvlMap.set(cleaned, currentTvl + row.tvl)
					}
				})
			}
		})

		return Array.from(tokenTvlMap.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([token]) => token)
	}, [data])

	const activeFilterCount = React.useMemo(() => {
		let count = 0
		if (filters.apyMin !== undefined) count++
		if (filters.apyMax !== undefined) count++
		if (filters.tvlMin !== undefined) count++
		if (filters.tvlMax !== undefined) count++
		if (filters.baseApyMin !== undefined) count++
		if (filters.baseApyMax !== undefined) count++
		if (filters.chains && filters.chains.length > 0) count++
		if (filters.protocols && filters.protocols.length > 0) count++
		if (filters.tokens && filters.tokens.length > 0) count++
		if (filters.hasRewards) count++
		if (filters.stablesOnly) count++
		if (filters.activeLending) count++
		if (filters.poolTypes && filters.poolTypes.length > 0) count++
		return count
	}, [filters])

	const availableProtocols = React.useMemo(() => {
		if (!data) return []

		const protocolMap = new Map<string, { value: string; label: string; tvl: number }>()

		data.forEach((row) => {
			const slug = (row.projectslug || row.project || '').trim()
			const name = (row.project || '').trim()
			if (!slug && !name) return

			const key = (slug || name).toLowerCase()
			const existing = protocolMap.get(key)
			const tvl = typeof row.tvl === 'number' ? row.tvl : 0

			if (existing) {
				existing.tvl += tvl
				if (!existing.label && name) {
					existing.label = name
				}
				if (!existing.value && slug) {
					existing.value = slug
				}
			} else {
				protocolMap.set(key, {
					value: slug || name,
					label: name || slug,
					tvl
				})
			}
		})

		return Array.from(protocolMap.values())
			.sort((a, b) => {
				if (b.tvl !== a.tvl) {
					return b.tvl - a.tvl
				}
				return a.label.localeCompare(b.label)
			})
			.map(({ value, label }) => ({ value, label }))
	}, [data])

	const applyFilters = React.useCallback(
		(newFilters?: YieldsFilters) => {
			const filtersToApply = newFilters !== undefined ? newFilters : filters
			if (onFiltersChange) {
				onFiltersChange(filtersToApply)
			}
		},
		[filters, onFiltersChange]
	)

	const resetFilters = React.useCallback(() => {
		setFilters({})
		if (onFiltersChange) {
			onFiltersChange({})
		}
	}, [onFiltersChange])

	return {
		table,
		sorting,
		pagination,
		setPagination,
		showColumnPanel,
		setShowColumnPanel,
		searchTerm,
		setSearchTerm,
		currentColumns,
		columnOrder,
		toggleColumnVisibility,
		moveColumnUp,
		moveColumnDown,
		columnPresets,
		applyPreset,
		activePreset: selectedPreset,
		downloadCSV,
		poolName,
		setPoolName,
		isLoading,
		chains,
		showFiltersPanel,
		setShowFiltersPanel,
		filters,
		setFilters,
		availableChains,
		availableTokens,
		availableProtocols,
		activeFilterCount,
		applyFilters,
		resetFilters
	}
}
