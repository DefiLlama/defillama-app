import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { QueryObserverResult, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useAutoSave, useDashboardAPI, useDashboardPermissions } from './hooks'
import { useChartsData, useProtocolsAndChains } from './queries'
import { Dashboard } from './services/DashboardAPI'
import {
	Chain,
	CHART_TYPES,
	ChartBuilderConfig,
	ChartConfig,
	DashboardItemConfig,
	MultiChartConfig,
	Protocol,
	ProtocolsTableConfig,
	TableFilters,
	TextConfig
} from './types'
import { cleanItemsForSaving, generateItemId } from './utils/dashboardUtils'

export type TimePeriod = '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all'

interface ProDashboardContextType {
	items: DashboardItemConfig[]
	chartsWithData: DashboardItemConfig[]
	protocols: Protocol[]
	chains: Chain[]
	protocolsLoading: boolean
	timePeriod: TimePeriod
	dashboardName: string
	dashboardId: string | null
	dashboards: Dashboard[]
	isLoadingDashboards: boolean
	isLoadingDashboard: boolean
	isReadOnly: boolean
	dashboardOwnerId: string | null
	dashboardVisibility: 'private' | 'public'
	dashboardTags: string[]
	dashboardDescription: string
	currentDashboard: Dashboard | null
	setTimePeriod: (period: TimePeriod) => void
	setDashboardName: (name: string) => void
	setDashboardVisibility: (visibility: 'private' | 'public') => void
	setDashboardTags: (tags: string[]) => void
	setDashboardDescription: (description: string) => void
	handleAddChart: (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => void
	handleAddTable: (
		chains: string[],
		tableType?: 'protocols' | 'dataset',
		datasetType?:
			| 'stablecoins'
			| 'cex'
			| 'revenue'
			| 'holders-revenue'
			| 'earnings'
			| 'token-usage'
			| 'yields'
			| 'dexs'
			| 'perps'
			| 'aggregators'
			| 'options'
			| 'bridge-aggregators'
			| 'trending-contracts'
			| 'chains'
			| 'fees',
		datasetChain?: string,
		tokenSymbol?: string | string[],
		includeCex?: boolean,
		datasetTimeframe?: string
	) => void
	handleAddMultiChart: (chartItems: ChartConfig[], name?: string) => void
	handleAddText: (title: string | undefined, content: string) => void
	handleAddChartBuilder: (
		name: string | undefined,
		config: {
			metric:
				| 'fees'
				| 'revenue'
				| 'volume'
				| 'perps'
				| 'options-notional'
				| 'options-premium'
				| 'bridge-aggregators'
				| 'dex-aggregators'
				| 'perps-aggregators'
				| 'user-fees'
				| 'holders-revenue'
				| 'protocol-revenue'
				| 'supply-side-revenue'
			chains: string[]
			categories: string[]
			groupBy: 'protocol'
			limit: number
			chartType: 'stackedBar' | 'stackedArea' | 'line'
			displayAs: 'timeSeries' | 'percentage'
			additionalFilters?: Record<string, any>
		}
	) => void
	handleEditItem: (itemId: string, newItem: DashboardItemConfig) => void
	handleRemoveItem: (itemId: string) => void
	handleChartsReordered: (newCharts: DashboardItemConfig[]) => void
	handleGroupingChange: (chartId: string, newGrouping: 'day' | 'week' | 'month' | 'quarter') => void
	handleColSpanChange: (chartId: string, newColSpan: 1 | 2) => void
	handleCumulativeChange: (itemId: string, showCumulative: boolean) => void
	handlePercentageChange: (itemId: string, showPercentage: boolean) => void
	handleStackedChange: (itemId: string, showStacked: boolean) => void
	handleHideOthersChange: (itemId: string, hideOthers: boolean) => void
	handleTableFiltersChange: (tableId: string, filters: TableFilters) => void
	handleTableColumnsChange: (
		tableId: string,
		columnOrder?: string[],
		columnVisibility?: Record<string, boolean>,
		customColumns?: any[],
		activeViewId?: string
	) => void
	getChainInfo: (chainName: string) => Chain | undefined
	getProtocolInfo: (protocolId: string) => Protocol | undefined
	createNewDashboard: () => Promise<void>
	loadDashboard: (id: string) => Promise<void>
	deleteDashboard: (id: string) => Promise<void>
	saveDashboard: (overrides?: {
		visibility?: 'private' | 'public'
		tags?: string[]
		description?: string
	}) => Promise<void>
	saveDashboardName: () => Promise<void>
	copyDashboard: () => Promise<void>
	showCreateDashboardModal: boolean
	setShowCreateDashboardModal: (show: boolean) => void
	handleCreateDashboard: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
	}) => Promise<void>
}

const ProDashboardContext = createContext<ProDashboardContextType | undefined>(undefined)

export function ProDashboardAPIProvider({
	children,
	initialDashboardId
}: {
	children: ReactNode
	initialDashboardId?: string
}) {
	const router = useRouter()
	const { isAuthenticated, user } = useAuthContext()
	const { data: { protocols = [], chains: rawChains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()

	const chains: Chain[] = rawChains
	const [items, setItems] = useState<DashboardItemConfig[]>([])
	const [timePeriod, setTimePeriodState] = useState<TimePeriod>('365d')
	const [dashboardName, setDashboardName] = useState<string>('My Dashboard')
	const [dashboardId, setDashboardId] = useState<string | null>(initialDashboardId || null)
	const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null)
	const [dashboardVisibility, setDashboardVisibility] = useState<'private' | 'public'>('private')
	const [dashboardTags, setDashboardTags] = useState<string[]>([])
	const [dashboardDescription, setDashboardDescription] = useState<string>('')
	const [showCreateDashboardModal, setShowCreateDashboardModal] = useState(false)

	// Use the dashboard API hook
	const {
		dashboards,
		isLoadingDashboards,
		createDashboard,
		updateDashboard,
		deleteDashboard: deleteDashboardWithConfirmation,
		loadDashboard: loadDashboardData,
		navigateToDashboard
	} = useDashboardAPI()

	// Use the permissions hook
	const { isReadOnly, dashboardOwnerId } = useDashboardPermissions(currentDashboard)

	// Use the auto-save hook
	const { autoSave } = useAutoSave({
		dashboardId,
		dashboardName,
		dashboardVisibility,
		dashboardTags,
		dashboardDescription,
		timePeriod,
		isAuthenticated,
		isReadOnly: isReadOnly || (initialDashboardId ? !currentDashboard : false), // Force read-only until dashboard is loaded
		currentDashboard,
		userId: user?.id,
		updateDashboard,
		cleanItemsForSaving
	})

	// Load initial dashboard
	const { isLoading: isLoadingDashboard } = useQuery({
		queryKey: ['dashboard', initialDashboardId, isAuthenticated],
		queryFn: async () => {
			if (!initialDashboardId) {
				return null
			}

			const dashboard = await loadDashboardData(initialDashboardId)

			if (!dashboard) {
				console.log('Dashboard not found or no permission:', initialDashboardId)
				return null
			}

			if (!dashboard?.data?.items || !Array.isArray(dashboard.data.items)) {
				console.error('Invalid dashboard data structure')
				return null
			}

			setDashboardId(dashboard.id)
			setDashboardName(dashboard.data.dashboardName || 'My Dashboard')
			setItems(dashboard.data.items)
			setTimePeriodState(dashboard.data.timePeriod || '365d')
			setCurrentDashboard(dashboard)
			setDashboardVisibility(dashboard.visibility || 'private')
			setDashboardTags(dashboard.tags || [])
			setDashboardDescription(dashboard.description || '')

			return dashboard
		},
		enabled: !!initialDashboardId
	})

	// Save dashboard
	const saveDashboard = useCallback(
		async (overrides?: { visibility?: 'private' | 'public'; tags?: string[]; description?: string }) => {
			if (!isAuthenticated) {
				toast.error('Please sign in to save dashboards')
				return
			}

			if (isReadOnly) {
				return
			}

			const cleanedItems = cleanItemsForSaving(items)
			const data = {
				items: cleanedItems,
				dashboardName,
				timePeriod,
				visibility: overrides?.visibility ?? dashboardVisibility,
				tags: overrides?.tags ?? dashboardTags,
				description: overrides?.description ?? dashboardDescription
			}

			if (dashboardId) {
				await updateDashboard({ id: dashboardId, data })
			} else {
				const newDashboard = await createDashboard(data)
				setDashboardId(newDashboard.id)
			}
		},
		[
			items,
			dashboardName,
			timePeriod,
			dashboardId,
			dashboardVisibility,
			dashboardTags,
			dashboardDescription,
			isAuthenticated,
			isReadOnly,
			updateDashboard,
			createDashboard,
			cleanItemsForSaving
		]
	)

	// Save dashboard name
	const saveDashboardName = useCallback(async () => {
		if (dashboardId && isAuthenticated && !isReadOnly) {
			const cleanedItems = cleanItemsForSaving(items)
			const data = {
				items: cleanedItems,
				dashboardName,
				timePeriod,
				visibility: dashboardVisibility,
				tags: dashboardTags,
				description: dashboardDescription
			}
			try {
				await updateDashboard({ id: dashboardId, data })
			} catch (error) {
				console.error('Failed to save dashboard name:', error)
			}
		}
	}, [
		dashboardId,
		isAuthenticated,
		isReadOnly,
		items,
		dashboardName,
		timePeriod,
		dashboardVisibility,
		dashboardTags,
		dashboardDescription,
		updateDashboard,
		cleanItemsForSaving
	])

	// Copy dashboard
	const copyDashboard = useCallback(async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to copy dashboards')
			return
		}

		const cleanedItems = cleanItemsForSaving(items)
		const data = {
			items: cleanedItems,
			dashboardName: `${dashboardName} (Copy)`,
			timePeriod
		}

		try {
			await createDashboard(data)
		} catch (error) {
			console.error('Failed to copy dashboard:', error)
		}
	}, [items, dashboardName, timePeriod, isAuthenticated, createDashboard])

	const createNewDashboard = useCallback(async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to create dashboards')
			return
		}

		setShowCreateDashboardModal(true)
	}, [isAuthenticated])

	const handleCreateDashboard = useCallback(
		async (data: { dashboardName: string; visibility: 'private' | 'public'; tags: string[]; description: string }) => {
			try {
				const dashboardData = {
					items: [],
					dashboardName: data.dashboardName,
					timePeriod: '365d' as TimePeriod,
					visibility: data.visibility,
					tags: data.tags,
					description: data.description
				}

				await createDashboard(dashboardData)
			} catch (error) {
				console.error('Failed to create new dashboard:', error)
				toast.error('Failed to create new dashboard')
			}
		},
		[createDashboard]
	)

	// Load dashboard
	const loadDashboard = useCallback(
		async (id: string) => {
			navigateToDashboard(id)
		},
		[navigateToDashboard]
	)

	const allChartItems: ChartConfig[] = []
	items.forEach((item) => {
		if (item.kind === 'chart') {
			allChartItems.push(item)
		} else if (item.kind === 'multi') {
			allChartItems.push(...item.items)
		}
	})

	const chartQueries = useChartsData(allChartItems, timePeriod)

	const chartsWithData: DashboardItemConfig[] = useMemo(
		() =>
			items.map((item) => {
				if (item.kind === 'chart') {
					const chart = item
					const idx = allChartItems.findIndex((c) => c.id === chart.id)
					const query = chartQueries[idx] || ({} as QueryObserverResult<any, Error>)
					return {
						...chart,
						data: query.data || [],
						isLoading: query.isLoading || false,
						hasError: query.isError || false,
						refetch: query.refetch || (() => {})
					}
				} else if (item.kind === 'multi') {
					const processedItems = item.items.map((nestedChart) => {
						const idx = allChartItems.findIndex((c) => c.id === nestedChart.id)
						const query = chartQueries[idx] || ({} as QueryObserverResult<any, Error>)
						return {
							...nestedChart,
							data: query.data || [],
							isLoading: query.isLoading || false,
							hasError: query.isError || false,
							refetch: query.refetch || (() => {})
						}
					})
					return {
						...item,
						items: processedItems
					}
				}
				return item
			}),
		[items, chartQueries, allChartItems]
	)

	// Handle adding items
	const handleAddChart = (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => {
		if (isReadOnly || (initialDashboardId && !currentDashboard)) {
			return
		}
		const newChartId = generateItemId(chartType, item)
		const chartTypeDetails = CHART_TYPES[chartType]

		const newChartBase: Partial<ChartConfig> = {
			id: newChartId,
			kind: 'chart',
			type: chartType,
			colSpan: 1
		}

		if (chartTypeDetails?.groupable) {
			newChartBase.grouping = 'day'
		}

		let newChart: ChartConfig
		if (itemType === 'protocol') {
			newChart = {
				...newChartBase,
				protocol: item,
				chain: '',
				geckoId
			} as ChartConfig
		} else {
			newChart = {
				...newChartBase,
				chain: item,
				geckoId
			} as ChartConfig
		}

		setItems((prev) => {
			const newItems = [...prev, newChart]
			autoSave(newItems)
			return newItems
		})
	}

	const handleAddTable = (
		chains: string[],
		tableType: 'protocols' | 'dataset' = 'protocols',
		datasetType?:
			| 'stablecoins'
			| 'cex'
			| 'revenue'
			| 'holders-revenue'
			| 'earnings'
			| 'token-usage'
			| 'yields'
			| 'dexs'
			| 'perps'
			| 'aggregators'
			| 'options'
			| 'bridge-aggregators'
			| 'trending-contracts'
			| 'chains'
			| 'fees',
		datasetChain?: string,
		tokenSymbol?: string | string[],
		includeCex?: boolean,
		datasetTimeframe?: string
	) => {
		if (isReadOnly) {
			return
		}
		const chainIdentifier = chains.length > 1 ? 'multi' : chains[0] || 'table'
		const newTable: ProtocolsTableConfig = {
			id: generateItemId('table', chainIdentifier),
			kind: 'table',
			tableType,
			chains,
			colSpan: 2,
			...(tableType === 'dataset' && {
				datasetType,
				datasetChain,
				...(datasetType === 'token-usage' && {
					tokenSymbols: Array.isArray(tokenSymbol) ? tokenSymbol : tokenSymbol ? [tokenSymbol] : [],
					includeCex
				}),
				...(datasetType === 'trending-contracts' && {
					datasetTimeframe: datasetTimeframe || '1d'
				})
			})
		}
		setItems((prev) => {
			const newItems = [...prev, newTable]
			autoSave(newItems)
			return newItems
		})
	}

	const handleAddMultiChart = (chartItems: ChartConfig[], name?: string) => {
		if (isReadOnly) {
			return
		}
		const defaultGrouping = 'day'
		const newMultiChart: MultiChartConfig = {
			id: generateItemId('multi', ''),
			kind: 'multi',
			name: name || `Multi-Chart ${items.filter((item) => item.kind === 'multi').length + 1}`,
			items: chartItems.map((chart) => ({
				...chart,
				grouping: chart.grouping || defaultGrouping
			})),
			grouping: defaultGrouping,
			colSpan: 1
		}
		setItems((prev) => {
			const newItems = [...prev, newMultiChart]
			autoSave(newItems)
			return newItems
		})
	}

	const handleAddText = (title: string | undefined, content: string) => {
		if (isReadOnly) {
			return
		}
		const newText: TextConfig = {
			id: generateItemId('text', ''),
			kind: 'text',
			title,
			content,
			colSpan: 1
		}
		setItems((prev) => {
			const newItems = [...prev, newText]
			autoSave(newItems)
			return newItems
		})
	}

	const handleAddChartBuilder = (
		name: string | undefined,
		config: {
			metric:
				| 'fees'
				| 'revenue'
				| 'volume'
				| 'perps'
				| 'options-notional'
				| 'options-premium'
				| 'bridge-aggregators'
				| 'dex-aggregators'
				| 'perps-aggregators'
				| 'user-fees'
				| 'holders-revenue'
				| 'protocol-revenue'
				| 'supply-side-revenue'
			chains: string[]
			categories: string[]
			groupBy: 'protocol'
			limit: number
			chartType: 'stackedBar' | 'stackedArea' | 'line'
			displayAs: 'timeSeries' | 'percentage'
			additionalFilters?: Record<string, any>
		}
	) => {
		if (isReadOnly) {
			return
		}
		const newBuilder = {
			id: generateItemId('builder', ''),
			kind: 'builder' as const,
			name,
			config,
			colSpan: 1 as const
		}
		setItems((prev) => {
			const newItems = [...prev, newBuilder]
			autoSave(newItems)
			return newItems
		})
	}

	const handleEditItem = (itemId: string, newItem: DashboardItemConfig) => {
		if (isReadOnly) {
			return
		}
		setItems((prev) => {
			const newItems = prev.map((item) => (item.id === itemId ? newItem : item))
			autoSave(newItems)
			return newItems
		})
	}

	const handleRemoveItem = useCallback(
		(itemId: string) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.filter((item) => item.id !== itemId)
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const setTimePeriod = useCallback(
		(period: TimePeriod) => {
			if (isReadOnly) {
				return
			}
			setTimePeriodState(period)
			setItems((currentItems) => {
				autoSave(currentItems)
				return currentItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handleChartsReordered = useCallback(
		(newCharts: DashboardItemConfig[]) => {
			if (isReadOnly) {
				return
			}
			setItems(newCharts)
			autoSave(newCharts)
		},
		[autoSave, isReadOnly]
	)

	const handleGroupingChange = useCallback(
		(chartId: string, newGrouping: 'day' | 'week' | 'month' | 'quarter') => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === chartId && item.kind === 'chart') {
						return { ...item, grouping: newGrouping }
					} else if (item.kind === 'multi' && item.id === chartId) {
						const updatedMulti = {
							...item,
							grouping: newGrouping,
							items: item.items.map((nestedChart) => ({
								...nestedChart,
								grouping: newGrouping
							}))
						}
						return updatedMulti
					} else if (item.kind === 'builder' && item.id === chartId) {
						return { ...item, grouping: newGrouping }
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handleColSpanChange = useCallback(
		(chartId: string, newColSpan: 1 | 2) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === chartId) {
						return { ...item, colSpan: newColSpan }
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handleCumulativeChange = useCallback(
		(itemId: string, showCumulative: boolean) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === itemId && item.kind === 'chart') {
						return { ...item, showCumulative }
					} else if (item.id === itemId && item.kind === 'multi') {
						return { ...item, showCumulative }
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handlePercentageChange = useCallback(
		(itemId: string, showPercentage: boolean) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === itemId && item.kind === 'multi') {
						return { ...item, showPercentage }
					} else if (item.id === itemId && item.kind === 'builder') {
						return {
							...item,
							config: {
								...item.config,
								displayAs: (showPercentage ? 'percentage' : 'timeSeries') as 'percentage' | 'timeSeries'
							}
						} as ChartBuilderConfig
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handleStackedChange = useCallback(
		(itemId: string, showStacked: boolean) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === itemId && item.kind === 'multi') {
						return { ...item, showStacked }
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handleHideOthersChange = useCallback(
		(itemId: string, hideOthers: boolean) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === itemId && item.kind === 'builder') {
						return {
							...item,
							config: {
								...item.config,
								hideOthers
							}
						} as ChartBuilderConfig
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handleTableFiltersChange = useCallback(
		(tableId: string, filters: TableFilters) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === tableId && item.kind === 'table') {
						return { ...item, filters } as ProtocolsTableConfig
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const handleTableColumnsChange = useCallback(
		(
			tableId: string,
			columnOrder?: string[],
			columnVisibility?: Record<string, boolean>,
			customColumns?: any[],
			activeViewId?: string
		) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === tableId && item.kind === 'table') {
						return {
							...item,
							columnOrder,
							columnVisibility,
							customColumns,
							activeViewId
						} as ProtocolsTableConfig
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave, isReadOnly]
	)

	const getChainInfo = (chainName: string) => {
		return chains.find((chain) => chain.name === chainName)
	}

	const getProtocolInfo = (protocolId: string) => {
		return protocols.find((p: Protocol) => p.slug === protocolId)
	}

	const value: ProDashboardContextType = {
		items,
		chartsWithData,
		protocols,
		chains,
		protocolsLoading,
		timePeriod,
		dashboardName,
		dashboardId,
		dashboards,
		isLoadingDashboards,
		isLoadingDashboard,
		isReadOnly,
		dashboardOwnerId,
		dashboardVisibility,
		dashboardTags,
		dashboardDescription,
		currentDashboard,
		setTimePeriod,
		setDashboardName,
		setDashboardVisibility,
		setDashboardTags,
		setDashboardDescription,
		handleAddChart,
		handleAddTable,
		handleAddMultiChart,
		handleAddText,
		handleAddChartBuilder,
		handleEditItem,
		handleRemoveItem,
		handleChartsReordered,
		handleGroupingChange,
		handleColSpanChange,
		handleCumulativeChange,
		handlePercentageChange,
		handleStackedChange,
		handleHideOthersChange,
		handleTableFiltersChange,
		handleTableColumnsChange,
		getChainInfo,
		getProtocolInfo,
		createNewDashboard,
		loadDashboard,
		deleteDashboard: deleteDashboardWithConfirmation,
		saveDashboard,
		saveDashboardName,
		copyDashboard,
		showCreateDashboardModal,
		setShowCreateDashboardModal,
		handleCreateDashboard
	}

	return <ProDashboardContext.Provider value={value}>{children}</ProDashboardContext.Provider>
}

export function useProDashboard() {
	const context = useContext(ProDashboardContext)
	if (context === undefined) {
		throw new Error('useProDashboard must be used within a ProDashboardAPIProvider')
	}
	return context
}
