import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react'
import { QueryObserverResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import {
	ChartConfig,
	CHART_TYPES,
	DashboardItemConfig,
	ProtocolsTableConfig,
	MultiChartConfig,
	TextConfig,
	Chain
} from './types'
import { useChartsData, useProtocolsAndChains } from './queries'
import { groupData } from './utils'
import { Protocol } from './types'
import { dashboardAPI, Dashboard } from './services/DashboardAPI'
import { useAuthContext } from '~/containers/Subscribtion/auth'

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
	setTimePeriod: (period: TimePeriod) => void
	setDashboardName: (name: string) => void
	handleAddChart: (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => void
	handleAddTable: (chain: string) => void
	handleAddMultiChart: (chartItems: ChartConfig[], name?: string) => void
	handleAddText: (title: string | undefined, content: string) => void
	handleRemoveItem: (itemId: string) => void
	handleChartsReordered: (newCharts: DashboardItemConfig[]) => void
	handleGroupingChange: (chartId: string, newGrouping: 'day' | 'week' | 'month') => void
	handleColSpanChange: (chartId: string, newColSpan: 1 | 2) => void
	getChainInfo: (chainName: string) => Chain | undefined
	getProtocolInfo: (protocolId: string) => Protocol | undefined
	createNewDashboard: () => Promise<void>
	loadDashboard: (id: string) => Promise<void>
	deleteDashboard: (id: string) => Promise<void>
	saveDashboard: () => Promise<void>
	saveDashboardName: () => Promise<void>
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
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const { data: { protocols = [], chains: rawChains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()

	const chains: Chain[] = rawChains
	const [items, setItems] = useState<DashboardItemConfig[]>([])

	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
	const [dashboardName, setDashboardName] = useState<string>('My Dashboard')
	const [dashboardId, setDashboardId] = useState<string | null>(initialDashboardId || null)

	const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const { data: dashboards = [], isLoading: isLoadingDashboards } = useQuery({
		queryKey: ['dashboards'],
		queryFn: async () => {
			if (!isAuthenticated) return []
			try {
				return await dashboardAPI.listDashboards(authorizedFetch)
			} catch (error) {
				console.error('Failed to load dashboards:', error)
				return []
			}
		},
		enabled: isAuthenticated
	})

	const { isLoading: isLoadingDashboard } = useQuery({
		queryKey: ['dashboard', initialDashboardId],
		queryFn: async () => {
			if (!initialDashboardId || !isAuthenticated) {
				return null
			}

			try {
				const dashboard = await dashboardAPI.getDashboard(initialDashboardId, authorizedFetch)

				if (!dashboard?.data?.items || !Array.isArray(dashboard.data.items)) {
					throw new Error('Invalid dashboard data structure')
				}

				setDashboardId(dashboard.id)
				setDashboardName(dashboard.data.dashboardName || 'My Dashboard')
				setItems(dashboard.data.items)
				return dashboard
			} catch (error) {
				console.error('Failed to load dashboard:', error)
				toast.error('Failed to load dashboard')
				router.push('/pro')
				return null
			}
		},
		enabled: !!initialDashboardId && isAuthenticated
	})

	const createDashboardMutation = useMutation({
		mutationFn: async (data: { items: DashboardItemConfig[]; dashboardName: string }) => {
			return await dashboardAPI.createDashboard(data, authorizedFetch)
		},
		onSuccess: (dashboard) => {
			setDashboardId(dashboard.id)
			queryClient.invalidateQueries({ queryKey: ['dashboards'] })
			toast.success('Dashboard created successfully')
			router.push(`/pro/${dashboard.id}`)
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to create dashboard')
		}
	})

	// Mutation to update dashboard
	const updateDashboardMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: { items: DashboardItemConfig[]; dashboardName: string } }) => {
			return await dashboardAPI.updateDashboard(id, data, authorizedFetch)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dashboards'] })
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to save dashboard')
		}
	})

	const deleteDashboardMutation = useMutation({
		mutationFn: async (id: string) => {
			return await dashboardAPI.deleteDashboard(id, authorizedFetch)
		},
		onSuccess: (_, deletedId) => {
			queryClient.invalidateQueries({ queryKey: ['dashboards'] })
			toast.success('Dashboard deleted successfully')
			if (dashboardId === deletedId) {
				setDashboardId(null)
				setItems([])
				setDashboardName('My Dashboard')
				router.push('/pro')
			}
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to delete dashboard')
		}
	})

	// Clean items before saving (remove runtime data)
	const cleanItemsForSaving = useCallback((items: DashboardItemConfig[]) => {
		return items.map((item) => {
			if (item.kind === 'chart') {
				const { data, isLoading, hasError, refetch, ...chartConfigToSave } = item as ChartConfig
				return chartConfigToSave
			} else if (item.kind === 'table') {
				return item as ProtocolsTableConfig
			} else if (item.kind === 'text') {
				return item as TextConfig
			} else if (item.kind === 'multi') {
				const { items: nestedItems, ...rest } = item as MultiChartConfig
				const cleanNestedItems = nestedItems.map((nestedItem) => {
					const { data, isLoading, hasError, refetch, ...cleanItem } = nestedItem
					return cleanItem
				})
				return { ...rest, items: cleanNestedItems }
			}
			return item
		})
	}, [])

	const autoSave = useCallback(
		(newItems: DashboardItemConfig[]) => {
			if (!dashboardId || !isAuthenticated) return

			if (autoSaveTimeoutRef.current) {
				clearTimeout(autoSaveTimeoutRef.current)
			}

			const cleanedItems = cleanItemsForSaving(newItems)
			const data = { items: cleanedItems, dashboardName }

			autoSaveTimeoutRef.current = setTimeout(() => {
				updateDashboardMutation.mutateAsync({ id: dashboardId, data }).catch((error) => {
					console.error('Auto-save failed:', error)
				})
			}, 1000)
		},
		[dashboardId, isAuthenticated, dashboardName, cleanItemsForSaving, updateDashboardMutation]
	)

	// Save dashboard (manual save)
	const saveDashboard = useCallback(async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to save dashboards')
			return
		}

		const cleanedItems = cleanItemsForSaving(items)
		const data = { items: cleanedItems, dashboardName }

		if (dashboardId) {
			await updateDashboardMutation.mutateAsync({ id: dashboardId, data })
		} else {
			await createDashboardMutation.mutateAsync(data)
		}
	}, [
		items,
		dashboardName,
		dashboardId,
		isAuthenticated,
		cleanItemsForSaving,
		updateDashboardMutation,
		createDashboardMutation
	])

	// Create new dashboard
	const createNewDashboard = useCallback(async () => {
		setDashboardId(null)
		setDashboardName('My Dashboard')
		setItems([])
		router.push('/pro/new')
	}, [router])

	// Load dashboard
	const loadDashboard = useCallback(
		async (id: string) => {
			router.push(`/pro/${id}`)
		},
		[router]
	)

	const deleteDashboard = useCallback(
		async (id: string) => {
			if (confirm('Are you sure you want to delete this dashboard?')) {
				await deleteDashboardMutation.mutateAsync(id)
			}
		},
		[deleteDashboardMutation]
	)

	// Save dashboard name when needed
	const saveDashboardName = useCallback(async () => {
		if (dashboardId && isAuthenticated) {
			const cleanedItems = cleanItemsForSaving(items)
			const data = { items: cleanedItems, dashboardName }
			try {
				await updateDashboardMutation.mutateAsync({ id: dashboardId, data })
			} catch (error) {
				console.error('Failed to save dashboard name:', error)
			}
		}
	}, [dashboardId, isAuthenticated, items, dashboardName, cleanItemsForSaving, updateDashboardMutation])

	const allChartItems: ChartConfig[] = []
	items.forEach((item) => {
		if (item.kind === 'chart') {
			allChartItems.push(item)
		} else if (item.kind === 'multi') {
			allChartItems.push(...item.items)
		}
	})

	const chartQueries = useChartsData(allChartItems, timePeriod)

	const chartsWithData: DashboardItemConfig[] = items.map((item) => {
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
	})

	const handleAddChart = (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => {
		const newChartId = `${item}-${chartType}-${Date.now()}`
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

	const handleAddTable = (chain: string) => {
		const newTable: ProtocolsTableConfig = {
			id: `table-${chain}-${Date.now()}`,
			kind: 'table',
			chain,
			colSpan: 2
		}
		setItems((prev) => {
			const newItems = [...prev, newTable]
			autoSave(newItems)
			return newItems
		})
	}

	const handleAddMultiChart = (chartItems: ChartConfig[], name?: string) => {
		const newMultiChart: MultiChartConfig = {
			id: `multi-${Date.now()}`,
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
			id: `text-${Date.now()}`,
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

	const handleRemoveItem = (itemId: string) => {
		setItems((prev) => {
			const newItems = prev.filter((item) => item.id !== itemId)
			autoSave(newItems)
			return newItems
		})
	}

	const handleChartsReordered = (newCharts: DashboardItemConfig[]) => {
		setItems(newCharts)
		autoSave(newCharts)
	}

	const handleGroupingChange = (chartId: string, newGrouping: 'day' | 'week' | 'month') => {
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
	}

	const handleColSpanChange = (chartId: string, newColSpan: 1 | 2) => {
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
	}

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
		setTimePeriod,
		setDashboardName,
		handleAddChart,
		handleAddTable,
		handleAddMultiChart,
		handleAddText,
		handleRemoveItem,
		handleChartsReordered,
		handleGroupingChange,
		handleColSpanChange,
		getChainInfo,
		getProtocolInfo,
		createNewDashboard,
		loadDashboard,
		deleteDashboard,
		saveDashboard,
		saveDashboardName
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
