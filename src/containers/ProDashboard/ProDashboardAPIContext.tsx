import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react'
import { QueryObserverResult, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import {
	ChartConfig,
	CHART_TYPES,
	DashboardItemConfig,
	ProtocolsTableConfig,
	MultiChartConfig,
	TextConfig,
	Chain,
	TableFilters
} from './types'
import { useChartsData, useProtocolsAndChains } from './queries'
import { groupData } from './utils'
import { Protocol } from './types'
import { Dashboard } from './services/DashboardAPI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDashboardAPI, useAutoSave, useDashboardPermissions } from './hooks'
import { cleanItemsForSaving, generateItemId } from './utils/dashboardUtils'

export type TimePeriod = '30d' | '90d' | '365d' | 'all'

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
	setTimePeriod: (period: TimePeriod) => void
	setDashboardName: (name: string) => void
	handleAddChart: (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => void
	handleAddTable: (
		chains: string[],
		tableType?: 'protocols' | 'dataset',
		datasetType?: 'stablecoins' | 'cex' | 'revenue' | 'holders-revenue' | 'earnings' | 'token-usage',
		datasetChain?: string,
		tokenSymbol?: string | string[],
		includeCex?: boolean
	) => void
	handleAddMultiChart: (chartItems: ChartConfig[], name?: string) => void
	handleAddText: (title: string | undefined, content: string) => void
	handleEditItem: (itemId: string, newItem: DashboardItemConfig) => void
	handleRemoveItem: (itemId: string) => void
	handleChartsReordered: (newCharts: DashboardItemConfig[]) => void
	handleGroupingChange: (chartId: string, newGrouping: 'day' | 'week' | 'month') => void
	handleColSpanChange: (chartId: string, newColSpan: 1 | 2) => void
	handleTableFiltersChange: (tableId: string, filters: TableFilters) => void
	getChainInfo: (chainName: string) => Chain | undefined
	getProtocolInfo: (protocolId: string) => Protocol | undefined
	createNewDashboard: () => Promise<void>
	loadDashboard: (id: string) => Promise<void>
	deleteDashboard: (id: string) => Promise<void>
	saveDashboard: () => Promise<void>
	saveDashboardName: () => Promise<void>
	copyDashboard: () => Promise<void>
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
	const { isAuthenticated } = useAuthContext()
	const { data: { protocols = [], chains: rawChains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()

	const chains: Chain[] = rawChains
	const [items, setItems] = useState<DashboardItemConfig[]>([])
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
	const [dashboardName, setDashboardName] = useState<string>('My Dashboard')
	const [dashboardId, setDashboardId] = useState<string | null>(initialDashboardId || null)
	const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null)

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
		isAuthenticated,
		updateDashboard,
		cleanItemsForSaving
	})

	// Load initial dashboard
	const { isLoading: isLoadingDashboard } = useQuery({
		queryKey: ['dashboard', initialDashboardId],
		queryFn: async () => {
			if (!initialDashboardId || !isAuthenticated) {
				return null
			}

			try {
				const dashboard = await loadDashboardData(initialDashboardId)

				if (!dashboard?.data?.items || !Array.isArray(dashboard.data.items)) {
					throw new Error('Invalid dashboard data structure')
				}

				setDashboardId(dashboard.id)
				setDashboardName(dashboard.data.dashboardName || 'My Dashboard')
				setItems(dashboard.data.items)
				setCurrentDashboard(dashboard)

				return dashboard
			} catch (error) {
				console.error('Failed to load dashboard:', error)
				router.push('/pro')
				return null
			}
		},
		enabled: !!initialDashboardId && isAuthenticated
	})

	// Save dashboard
	const saveDashboard = useCallback(async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to save dashboards')
			return
		}

		const cleanedItems = cleanItemsForSaving(items)
		const data = { items: cleanedItems, dashboardName }

		if (dashboardId) {
			await updateDashboard({ id: dashboardId, data })
		} else {
			const newDashboard = await createDashboard(data)
			setDashboardId(newDashboard.id)
		}
	}, [items, dashboardName, dashboardId, isAuthenticated, updateDashboard, createDashboard])

	// Save dashboard name
	const saveDashboardName = useCallback(async () => {
		if (dashboardId && isAuthenticated) {
			const cleanedItems = cleanItemsForSaving(items)
			const data = { items: cleanedItems, dashboardName }
			try {
				await updateDashboard({ id: dashboardId, data })
			} catch (error) {
				console.error('Failed to save dashboard name:', error)
			}
		}
	}, [dashboardId, isAuthenticated, items, dashboardName, updateDashboard])

	// Copy dashboard
	const copyDashboard = useCallback(async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to copy dashboards')
			return
		}

		const cleanedItems = cleanItemsForSaving(items)
		const data = {
			items: cleanedItems,
			dashboardName: `${dashboardName} (Copy)`
		}

		try {
			await createDashboard(data)
		} catch (error) {
			console.error('Failed to copy dashboard:', error)
		}
	}, [items, dashboardName, isAuthenticated, createDashboard])

	const createNewDashboard = useCallback(async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to create dashboards')
			return
		}

		try {
			const data = {
				items: [],
				dashboardName: 'My Dashboard'
			}

			await createDashboard(data)
		} catch (error) {
			console.error('Failed to create new dashboard:', error)
			toast.error('Failed to create new dashboard')
		}
	}, [isAuthenticated, createDashboard])

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
					const chartTypeDetails = CHART_TYPES[chart.type]
					let processedData = query.data || []
					if (chartTypeDetails?.groupable) {
						processedData = groupData(query.data, chart.grouping)
					}
					return {
						...chart,
						data: processedData,
						isLoading: query.isLoading || false,
						hasError: query.isError || false,
						refetch: query.refetch || (() => {})
					}
				} else if (item.kind === 'multi') {
					const processedItems = item.items.map((nestedChart) => {
						const idx = allChartItems.findIndex((c) => c.id === nestedChart.id)
						const query = chartQueries[idx] || ({} as QueryObserverResult<any, Error>)
						const chartTypeDetails = CHART_TYPES[nestedChart.type]
						let processedData = query.data || []
						if (chartTypeDetails?.groupable) {
							processedData = groupData(query.data, nestedChart.grouping)
						}
						return {
							...nestedChart,
							data: processedData,
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
				chain: item
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
		datasetType?: 'stablecoins' | 'cex' | 'revenue' | 'holders-revenue' | 'earnings' | 'token-usage',
		datasetChain?: string,
		tokenSymbol?: string | string[],
		includeCex?: boolean
	) => {
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
		const newMultiChart: MultiChartConfig = {
			id: generateItemId('multi', ''),
			kind: 'multi',
			name: name || `Multi-Chart ${items.filter((item) => item.kind === 'multi').length + 1}`,
			items: chartItems,
			grouping: 'day',
			colSpan: 1
		}
		setItems((prev) => {
			const newItems = [...prev, newMultiChart]
			autoSave(newItems)
			return newItems
		})
	}

	const handleAddText = (title: string | undefined, content: string) => {
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

	const handleEditItem = (itemId: string, newItem: DashboardItemConfig) => {
		setItems((prev) => {
			const newItems = prev.map((item) => (item.id === itemId ? newItem : item))
			autoSave(newItems)
			return newItems
		})
	}

	const handleRemoveItem = useCallback(
		(itemId: string) => {
			setItems((prev) => {
				const newItems = prev.filter((item) => item.id !== itemId)
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave]
	)

	const handleChartsReordered = useCallback(
		(newCharts: DashboardItemConfig[]) => {
			setItems(newCharts)
			autoSave(newCharts)
		},
		[autoSave]
	)

	const handleGroupingChange = useCallback(
		(chartId: string, newGrouping: 'day' | 'week' | 'month') => {
			setItems((prev) => {
				const newItems = prev.map((item) => {
					if (item.id === chartId && item.kind === 'chart') {
						return { ...item, grouping: newGrouping }
					} else if (item.kind === 'multi' && item.id === chartId) {
						return { ...item, grouping: newGrouping }
					}
					return item
				})
				autoSave(newItems)
				return newItems
			})
		},
		[autoSave]
	)

	const handleColSpanChange = useCallback(
		(chartId: string, newColSpan: 1 | 2) => {
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
		[autoSave]
	)

	const handleTableFiltersChange = useCallback(
		(tableId: string, filters: TableFilters) => {
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
		[autoSave]
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
		setTimePeriod,
		setDashboardName,
		handleAddChart,
		handleAddTable,
		handleAddMultiChart,
		handleAddText,
		handleEditItem,
		handleRemoveItem,
		handleChartsReordered,
		handleGroupingChange,
		handleColSpanChange,
		handleTableFiltersChange,
		getChainInfo,
		getProtocolInfo,
		createNewDashboard,
		loadDashboard,
		deleteDashboard: deleteDashboardWithConfirmation,
		saveDashboard,
		saveDashboardName,
		copyDashboard
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
