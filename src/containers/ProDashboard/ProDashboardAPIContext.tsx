import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef
} from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { CustomTimePeriod, dashboardReducer, initDashboardState, TimePeriod } from './dashboardReducer'
import { useAutoSave, useDashboardAPI, useDashboardPermissions } from './hooks'
import { useChartsData, useProtocolsAndChains } from './queries'
import { Dashboard } from './services/DashboardAPI'
import {
	Chain,
	ChartBuilderConfig,
	ChartConfig,
	DashboardItemConfig,
	LlamaAIChartConfig,
	MetricConfig,
	Protocol,
	StoredColSpan,
	TableFilters,
	UnifiedTableConfig
} from './types'
import { useDashboardActions } from './useDashboardActions'
import { cleanItemsForSaving } from './utils/dashboardUtils'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export type { TimePeriod, CustomTimePeriod } from './dashboardReducer'

export interface AISessionData {
	rating?: number
	feedback?: string
	mode: 'create' | 'iterate'
	timestamp: string
	userId: string
	rated: boolean
	skipped?: boolean
	prompt: string
}

export interface AISessionState {
	sessionId: string
	mode: 'create' | 'iterate'
	timestamp: string
	prompt: string
	rated?: boolean
}

export type AIGeneratedData = Record<string, AISessionData>

export interface AIGenerationContext {
	sessionId: string
	mode: 'create' | 'iterate'
	timestamp: string
	prompt?: string
}

type DialogStore = ReturnType<typeof Ariakit.useDialogStore>

interface ProDashboardTimeContextType {
	timePeriod: TimePeriod
	customTimePeriod: CustomTimePeriod | null
	setTimePeriod: (period: TimePeriod) => void
	setCustomTimePeriod: (customPeriod: CustomTimePeriod | null) => void
}

interface ProDashboardCatalogContextType {
	protocols: Protocol[]
	chains: Chain[]
	protocolsLoading: boolean
	getChainInfo: (chainName: string) => Chain | undefined
	getProtocolInfo: (protocolId: string) => Protocol | undefined
}

interface ProDashboardPermissionsContextType {
	isReadOnly: boolean
	dashboardOwnerId: string | null
}

interface ProDashboardDashboardContextType {
	dashboardId: string | null
	currentDashboard: Dashboard | null
	dashboardName: string
	dashboardVisibility: 'private' | 'public'
	dashboardTags: string[]
	dashboardDescription: string
	isLoadingDashboard: boolean
	getCurrentRatingSession: () => (AISessionData & { sessionId: string }) | null
	autoSkipOlderSessionsForRating: () => Promise<void>
	setDashboardName: (name: string) => void
	setDashboardVisibility: (visibility: 'private' | 'public') => void
	setDashboardTags: (tags: string[]) => void
	setDashboardDescription: (description: string) => void
	deleteDashboard: (id: string) => Promise<void>
	saveDashboard: (overrides?: {
		dashboardName?: string
		visibility?: 'private' | 'public'
		tags?: string[]
		description?: string
		aiGenerated?: AIGeneratedData | null
		items?: DashboardItemConfig[]
		aiUndoState?: any
	}) => Promise<void>
	copyDashboard: () => Promise<void>
	handleCreateDashboard: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items?: DashboardItemConfig[]
		aiGenerated?: AIGeneratedData | null
	}) => Promise<void>
	handleGenerateDashboard: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items: DashboardItemConfig[]
		aiGenerationContext?: {
			sessionId: string
			mode: 'create' | 'iterate'
			timestamp: string
			prompt: string
		}
	}) => Promise<void>
	handleIterateDashboard: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items: DashboardItemConfig[]
		aiGenerationContext?: {
			sessionId: string
			mode: 'create' | 'iterate'
			timestamp: string
			prompt: string
		}
	}) => Promise<void>
	submitRating: (sessionId: string, rating: number, feedback?: string) => Promise<void>
	skipRating: (sessionId: string) => Promise<void>
	dismissRating: (sessionId: string) => void
	undoAIGeneration: () => Promise<void>
	canUndo: boolean
}

interface ProDashboardEditorActionsContextType {
	handleAddChart: (
		item: string,
		chartType: string,
		itemType: 'chain' | 'protocol',
		geckoId?: string | null,
		color?: string
	) => void
	handleAddYieldChart: (
		poolConfigId: string,
		poolName: string,
		project: string,
		chain: string,
		chartType?: string
	) => void
	handleAddStablecoinsChart: (chain: string, chartType: string) => void
	handleAddStablecoinAssetChart: (stablecoin: string, stablecoinId: string, chartType: string) => void
	handleAddAdvancedTvlChart: (protocol: string, protocolName: string, chartType: string) => void
	handleAddBorrowedChart: (protocol: string, protocolName: string, chartType: string) => void
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
	handleAddMetric: (config: MetricConfig) => void
	handleAddUnifiedTable: (config?: Partial<UnifiedTableConfig>) => void
	handleAddChartBuilder: (name: string | undefined, config: ChartBuilderConfig['config']) => void
	handleAddLlamaAIChart: (savedChartId: string, title?: string) => void
	handleEditItem: (itemId: string, newItem: DashboardItemConfig) => void
	handleRemoveItem: (itemId: string) => void
	handleChartsReordered: (newCharts: DashboardItemConfig[]) => void
	handleGroupingChange: (chartId: string, newGrouping: 'day' | 'week' | 'month' | 'quarter') => void
	handleColSpanChange: (chartId: string, newColSpan: StoredColSpan) => void
	handleCumulativeChange: (itemId: string, showCumulative: boolean) => void
	handlePercentageChange: (itemId: string, showPercentage: boolean) => void
	handleStackedChange: (itemId: string, showStacked: boolean) => void
	handleTreemapChange: (itemId: string, showTreemap: boolean) => void
	handleHideOthersChange: (itemId: string, hideOthers: boolean) => void
	handleChartTypeChange: (itemId: string, chartType: 'stackedBar' | 'stackedArea' | 'line' | 'treemap') => void
	handleTableFiltersChange: (tableId: string, filters: TableFilters) => void
	handleTableColumnsChange: (
		tableId: string,
		columnOrder?: string[],
		columnVisibility?: Record<string, boolean>,
		customColumns?: any[],
		activeViewId?: string,
		activePresetId?: string
	) => void
}

interface ProDashboardItemsStateContextType {
	items: DashboardItemConfig[]
}

interface ProDashboardChartsDataContextType {
	chartsWithData: DashboardItemConfig[]
}

interface ProDashboardUIContextType {
	createDashboardDialogStore: DialogStore
	showGenerateDashboardModal: boolean
	setShowGenerateDashboardModal: (show: boolean) => void
	showIterateDashboardModal: boolean
	setShowIterateDashboardModal: (show: boolean) => void
}

const ProDashboardTimeContext = createContext<ProDashboardTimeContextType | undefined>(undefined)
const ProDashboardCatalogContext = createContext<ProDashboardCatalogContextType | undefined>(undefined)
const ProDashboardPermissionsContext = createContext<ProDashboardPermissionsContextType | undefined>(undefined)
const ProDashboardDashboardContext = createContext<ProDashboardDashboardContextType | undefined>(undefined)
const ProDashboardEditorActionsContext = createContext<ProDashboardEditorActionsContextType | undefined>(undefined)
const ProDashboardItemsStateContext = createContext<ProDashboardItemsStateContextType | undefined>(undefined)
const ProDashboardChartsDataContext = createContext<ProDashboardChartsDataContextType | undefined>(undefined)
const ProDashboardUIContext = createContext<ProDashboardUIContextType | undefined>(undefined)

export function ProDashboardAPIProvider({
	children,
	initialDashboardId
}: {
	children: ReactNode
	initialDashboardId?: string
}) {
	const { isAuthenticated, user } = useAuthContext()
	const { data: { protocols = [], chains: rawChains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()

	const chains = useMemo(() => rawChains as Chain[], [rawChains])

	const [state, dispatch] = useReducer(dashboardReducer, initialDashboardId, initDashboardState)

	const {
		items,
		timePeriod,
		customTimePeriod,
		dashboardName,
		dashboardId,
		currentDashboard,
		dashboardVisibility,
		dashboardTags,
		dashboardDescription,
		showGenerateDashboardModal,
		showIterateDashboardModal
	} = state

	const applyDashboard = useCallback((dashboard: Dashboard) => {
		dispatch({ type: 'APPLY_DASHBOARD', payload: dashboard })
	}, [])

	const createDashboardDialogStore = Ariakit.useDialogStore()

	// Use the dashboard API hook
	const {
		createDashboard,
		updateDashboard,
		deleteDashboard: deleteDashboardWithConfirmation,
		loadDashboard: loadDashboardData
	} = useDashboardAPI()

	// Use the permissions hook
	const { isReadOnly, dashboardOwnerId } = useDashboardPermissions(currentDashboard)
	const isReadOnlyUntilDashboardLoaded = isReadOnly || (initialDashboardId ? !currentDashboard : false)

	// Use the auto-save hook
	const { autoSave } = useAutoSave({
		dashboardId,
		dashboardName,
		dashboardVisibility,
		dashboardTags,
		dashboardDescription,
		timePeriod,
		customTimePeriod,
		isAuthenticated,
		isReadOnly: isReadOnlyUntilDashboardLoaded,
		currentDashboard,
		userId: user?.id,
		updateDashboard,
		cleanItemsForSaving
	})

	const actions = useDashboardActions(dispatch, state, autoSave, isReadOnlyUntilDashboardLoaded)

	const {
		handleAddChart,
		handleAddYieldChart,
		handleAddStablecoinsChart,
		handleAddStablecoinAssetChart,
		handleAddAdvancedTvlChart,
		handleAddBorrowedChart,
		handleAddTable,
		handleAddUnifiedTable,
		handleAddMultiChart,
		handleAddText,
		handleAddChartBuilder,
		handleAddLlamaAIChart,
		handleEditItem,
		handleRemoveItem,
		handleAddMetric,
		setTimePeriod,
		setCustomTimePeriod,
		handleChartsReordered,
		handleGroupingChange,
		handleColSpanChange,
		handleCumulativeChange,
		handlePercentageChange,
		handleStackedChange,
		handleTreemapChange,
		handleHideOthersChange,
		handleChartTypeChange,
		handleTableFiltersChange,
		handleTableColumnsChange,
		setDashboardName,
		setDashboardVisibility,
		setDashboardTags,
		setDashboardDescription,
		setShowGenerateDashboardModal,
		setShowIterateDashboardModal,
		setItems,
		setCurrentDashboard
	} = actions

	const getCurrentRatingSession = useCallback(() => {
		if (!isAuthenticated || !currentDashboard?.aiGenerated || !user?.id) return null

		const unratedSessions = Object.entries(currentDashboard.aiGenerated)
			.filter(
				([_, sessionData]: [string, AISessionData]) =>
					sessionData.userId === user.id && sessionData.rating === undefined && !sessionData.skipped
			)
			.map(([sessionId, sessionData]) => ({
				sessionId,
				...sessionData
			}))

		if (unratedSessions.length === 0) return null

		unratedSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		return {
			...unratedSessions[0],
			rated: false
		}
	}, [isAuthenticated, currentDashboard?.aiGenerated, user?.id])

	// Load initial dashboard
	const { data: currentDashboard2 = null, isLoading: isLoadingDashboard } = useQuery({
		queryKey: ['dashboard', initialDashboardId, isAuthenticated, user?.id],
		queryFn: async () => {
			if (!initialDashboardId) {
				return null
			}

			const dashboard = await loadDashboardData(initialDashboardId)

			if (!dashboard) {
				console.log('Dashboard not found or no permission:', initialDashboardId)
				return null
			}
			return dashboard
		},
		staleTime: 1000 * 60 * 5,
		refetchOnMount: 'always',
		enabled: !!initialDashboardId
	})

	useEffect(() => {
		if (
			currentDashboard2 !== null &&
			initialDashboardId === currentDashboard2?.id &&
			currentDashboard?.id !== currentDashboard2?.id
		) {
			applyDashboard(currentDashboard2)
		}
	}, [applyDashboard, currentDashboard2, currentDashboard, initialDashboardId])

	// Save dashboard
	const saveDashboard = useCallback(
		async (overrides?: {
			dashboardName?: string
			visibility?: 'private' | 'public'
			tags?: string[]
			description?: string
			aiGenerated?: Record<string, any> | null
			items?: DashboardItemConfig[]
			aiUndoState?: any
		}) => {
			if (!isAuthenticated) {
				toast.error('Please sign in to save dashboards')
				return
			}

			if (isReadOnly) {
				return
			}

			const itemsToSave = overrides?.items ?? items
			const cleanedItems = cleanItemsForSaving(itemsToSave)
			const nameToSave = overrides?.dashboardName ?? dashboardName
			const data = {
				items: cleanedItems,
				dashboardName: nameToSave,
				timePeriod,
				customTimePeriod,
				visibility: overrides?.visibility ?? dashboardVisibility,
				tags: overrides?.tags ?? dashboardTags,
				description: overrides?.description ?? dashboardDescription,
				aiGenerated: overrides?.aiGenerated ?? currentDashboard?.aiGenerated ?? null,
				...(overrides?.aiUndoState && { aiUndoState: overrides.aiUndoState })
			}

			if (dashboardId) {
				const savedDashboard = await updateDashboard({ id: dashboardId, data })
				if (savedDashboard) {
					applyDashboard(savedDashboard)
				}
			} else {
				const newDashboard = await createDashboard(data)
				if (newDashboard) {
					applyDashboard(newDashboard)
				}
			}
		},
		[
			items,
			dashboardName,
			timePeriod,
			customTimePeriod,
			dashboardId,
			dashboardVisibility,
			dashboardTags,
			dashboardDescription,
			currentDashboard?.aiGenerated,
			isAuthenticated,
			isReadOnly,
			updateDashboard,
			createDashboard,
			cleanItemsForSaving,
			applyDashboard
		]
	)

	const autoSkipOlderSessionsForRating = useCallback(async () => {
		if (!isAuthenticated || !currentDashboard?.aiGenerated || !user?.id || !dashboardId) return

		const unratedSessions = Object.entries(currentDashboard.aiGenerated)
			.filter(
				([_, sessionData]: [string, AISessionData]) =>
					sessionData.userId === user.id && sessionData.rating === undefined && !sessionData.skipped
			)
			.map(([sessionId, sessionData]) => ({
				sessionId,
				...sessionData
			}))

		if (unratedSessions.length <= 1) return

		unratedSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		const olderSessions = unratedSessions.slice(1)

		const updatedAiGenerated = { ...currentDashboard.aiGenerated }
		olderSessions.forEach((session) => {
			updatedAiGenerated[session.sessionId] = {
				...updatedAiGenerated[session.sessionId],
				rated: false,
				skipped: true
			} as AISessionData
		})

		try {
			await saveDashboard({ aiGenerated: updatedAiGenerated })
			setCurrentDashboard((prev) =>
				prev
					? {
							...prev,
							aiGenerated: updatedAiGenerated
						}
					: null
			)
		} catch (error) {
			console.log('Failed to auto-skip older sessions:', error)
		}
	}, [isAuthenticated, currentDashboard?.aiGenerated, user?.id, dashboardId, saveDashboard, setCurrentDashboard])

	// Save dashboard name
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
			timePeriod,
			customTimePeriod
		}

		try {
			await createDashboard(data)
		} catch (error) {
			console.log('Failed to copy dashboard:', error)
		}
	}, [items, dashboardName, timePeriod, customTimePeriod, isAuthenticated, createDashboard])

	const handleCreateDashboard = useCallback(
		async (data: {
			dashboardName: string
			visibility: 'private' | 'public'
			tags: string[]
			description: string
			items?: DashboardItemConfig[]
			aiGenerated?: AIGeneratedData | null
		}) => {
			try {
				const dashboardData = {
					items: data.items || [],
					dashboardName: data.dashboardName,
					timePeriod: '365d' as TimePeriod,
					visibility: data.visibility,
					tags: data.tags,
					description: data.description,
					aiGenerated: data.aiGenerated || null
				}

				await createDashboard(dashboardData)
			} catch (error) {
				console.log('Failed to create new dashboard:', error)
				toast.error('Failed to create new dashboard')
			}
		},
		[createDashboard]
	)

	const handleGenerateDashboard = useCallback(
		async (data: {
			dashboardName: string
			visibility: 'private' | 'public'
			tags: string[]
			description: string
			items: DashboardItemConfig[]
			aiGenerationContext?: {
				sessionId: string
				mode: 'create' | 'iterate'
				timestamp: string
				prompt: string
			}
		}) => {
			let aiGeneratedData = null
			if (data.aiGenerationContext && user?.id) {
				const { sessionId, mode, timestamp, prompt } = data.aiGenerationContext
				aiGeneratedData = {
					[sessionId]: {
						rating: undefined,
						mode,
						timestamp,
						prompt,
						userId: user.id,
						rated: false
					}
				}
			}

			await handleCreateDashboard({
				...data,
				aiGenerated: aiGeneratedData
			})
		},
		[handleCreateDashboard, user?.id]
	)

	const handleIterateDashboard = useCallback(
		async (data: {
			dashboardName: string
			visibility: 'private' | 'public'
			tags: string[]
			description: string
			items: DashboardItemConfig[]
			aiGenerationContext?: {
				sessionId: string
				mode: 'create' | 'iterate'
				timestamp: string
				prompt: string
			}
		}) => {
			let updatedAiGenerated = null
			if (data.aiGenerationContext && user?.id) {
				const { sessionId, mode, timestamp, prompt } = data.aiGenerationContext
				const currentAiGenerated = currentDashboard?.aiGenerated || {}

				updatedAiGenerated = {
					...currentAiGenerated,
					[sessionId]: {
						rating: undefined,
						mode,
						timestamp,
						prompt,
						userId: user.id,
						rated: false
					}
				}
			}

			if (dashboardId) {
				const aiUndoState = data.aiGenerationContext
					? {
							items: items,
							timestamp: new Date().toISOString(),
							sessionId: data.aiGenerationContext.sessionId
						}
					: undefined

				await saveDashboard({
					items: data.items,
					visibility: data.visibility,
					tags: data.tags,
					description: data.description,
					aiGenerated: updatedAiGenerated,
					aiUndoState
				})

				setItems(data.items)
				setCurrentDashboard((prev) =>
					prev
						? {
								...prev,
								data: {
									...prev.data,
									items: data.items,
									aiUndoState
								},
								aiGenerated: updatedAiGenerated || prev.aiGenerated
							}
						: null
				)
			} else {
				setItems(data.items)
			}
		},
		[dashboardId, saveDashboard, user?.id, currentDashboard?.aiGenerated, items, setItems, setCurrentDashboard]
	)

	const submitRating = useCallback(
		async (sessionId: string, rating: number, feedback?: string) => {
			if (!isAuthenticated || !user?.id || !dashboardId) {
				toast.error('Please sign in to rate dashboards')
				return
			}

			try {
				const currentAiGenerated = currentDashboard?.aiGenerated || {}
				const existingSession = currentAiGenerated[sessionId]
				const updatedAiGenerated = {
					...currentAiGenerated,
					[sessionId]: {
						...existingSession,
						rating,
						feedback,
						mode: existingSession?.mode || 'create',
						timestamp: existingSession?.timestamp || new Date().toISOString(),
						userId: user.id,
						rated: true
					}
				}

				await saveDashboard({
					aiGenerated: updatedAiGenerated
				})

				setCurrentDashboard((prev) =>
					prev
						? {
								...prev,
								aiGenerated: updatedAiGenerated
							}
						: null
				)

				toast.success('Thank you for your feedback!')
			} catch (error) {
				console.log('Failed to submit rating:', error)
				toast.error('Failed to submit rating. Please try again.')
			}
		},
		[isAuthenticated, user?.id, dashboardId, currentDashboard?.aiGenerated, saveDashboard, setCurrentDashboard]
	)

	const skipRating = useCallback(
		async (sessionId: string) => {
			if (!isAuthenticated || !user?.id || !dashboardId) {
				return
			}

			try {
				const currentAiGenerated = currentDashboard?.aiGenerated || {}
				const existingSession = currentAiGenerated[sessionId]
				const updatedAiGenerated = {
					...currentAiGenerated,
					[sessionId]: {
						...existingSession,
						mode: existingSession?.mode || 'create',
						timestamp: existingSession?.timestamp || new Date().toISOString(),
						userId: user.id,
						rated: false,
						skipped: true
					}
				}

				await saveDashboard({
					aiGenerated: updatedAiGenerated
				})

				setCurrentDashboard((prev) =>
					prev
						? {
								...prev,
								aiGenerated: updatedAiGenerated
							}
						: null
				)
			} catch (error) {
				console.log('Failed to skip rating:', error)
			}
		},
		[isAuthenticated, user?.id, dashboardId, currentDashboard?.aiGenerated, saveDashboard, setCurrentDashboard]
	)

	const dismissRating = useCallback(
		async (sessionId: string) => {
			await skipRating(sessionId)
		},
		[skipRating]
	)

	const undoAIGeneration = useCallback(async () => {
		if (!currentDashboard?.data?.aiUndoState || !dashboardId) {
			return
		}

		const previousItems = currentDashboard.data.aiUndoState.items
		const sessionId = currentDashboard.data.aiUndoState.sessionId

		const updatedAiGenerated = currentDashboard.aiGenerated
			? {
					...currentDashboard.aiGenerated,
					[sessionId]: {
						...currentDashboard.aiGenerated[sessionId],
						rating: -99
					}
				}
			: null

		await saveDashboard({
			items: previousItems,
			aiUndoState: undefined,
			aiGenerated: updatedAiGenerated
		})

		setItems(previousItems)
		setCurrentDashboard((prev) =>
			prev
				? {
						...prev,
						data: {
							...prev.data,
							items: previousItems,
							aiUndoState: undefined
						},
						aiGenerated: updatedAiGenerated
					}
				: null
		)
	}, [
		currentDashboard?.data?.aiUndoState,
		currentDashboard?.aiGenerated,
		dashboardId,
		saveDashboard,
		setItems,
		setCurrentDashboard
	])

	const canUndo = useMemo(() => {
		return !!currentDashboard?.data?.aiUndoState?.items
	}, [currentDashboard?.data?.aiUndoState])

	// Load dashboard
	const allChartItems: ChartConfig[] = useMemo(() => {
		const chartItems: ChartConfig[] = []
		items.forEach((item) => {
			if (item.kind === 'chart') {
				chartItems.push(item)
			} else if (item.kind === 'multi') {
				chartItems.push(...item.items)
			}
		})
		return chartItems
	}, [items])

	const chartQueries = useChartsData(allChartItems, timePeriod, customTimePeriod)

	const queryById = useMemo(() => {
		const map = new Map<string, any>()
		allChartItems.forEach((chartConfig, index) => {
			if (chartQueries[index]) {
				map.set(chartConfig.id, chartQueries[index])
			}
		})
		return map
	}, [allChartItems, chartQueries])

	const chartsWithData: DashboardItemConfig[] = useMemo(
		() =>
			items.map((item) => {
				if (item.kind === 'chart') {
					const query = queryById.get(item.id)
					return {
						...item,
						data: query?.data || [],
						isLoading: query?.isLoading || false,
						hasError: query?.isError || false,
						refetch: query?.refetch || (() => {})
					}
				} else if (item.kind === 'multi') {
					const processedItems = item.items.map((nestedChart) => {
						const query = queryById.get(nestedChart.id)
						return {
							...nestedChart,
							data: query?.data || [],
							isLoading: query?.isLoading || false,
							hasError: query?.isError || false,
							refetch: query?.refetch || (() => {})
						}
					})
					return {
						...item,
						items: processedItems
					}
				}
				return item
			}),
		[items, queryById]
	)

	const handlersRef = useRef<{
		handleAddChart: typeof handleAddChart
		handleAddYieldChart: typeof handleAddYieldChart
		handleAddStablecoinsChart: typeof handleAddStablecoinsChart
		handleAddStablecoinAssetChart: typeof handleAddStablecoinAssetChart
		handleAddAdvancedTvlChart: typeof handleAddAdvancedTvlChart
		handleAddBorrowedChart: typeof handleAddBorrowedChart
		handleAddTable: typeof handleAddTable
		handleAddMultiChart: typeof handleAddMultiChart
		handleAddText: typeof handleAddText
		handleAddMetric: typeof handleAddMetric
		handleAddUnifiedTable: typeof handleAddUnifiedTable
		handleAddChartBuilder: typeof handleAddChartBuilder
		handleAddLlamaAIChart: typeof handleAddLlamaAIChart
		handleEditItem: typeof handleEditItem
		handleRemoveItem: typeof handleRemoveItem
		handleChartsReordered: typeof handleChartsReordered
		handleGroupingChange: typeof handleGroupingChange
		handleColSpanChange: typeof handleColSpanChange
		handleCumulativeChange: typeof handleCumulativeChange
		handlePercentageChange: typeof handlePercentageChange
		handleStackedChange: typeof handleStackedChange
		handleTreemapChange: typeof handleTreemapChange
		handleHideOthersChange: typeof handleHideOthersChange
		handleChartTypeChange: typeof handleChartTypeChange
		handleTableFiltersChange: typeof handleTableFiltersChange
		handleTableColumnsChange: typeof handleTableColumnsChange
	}>(null as any)

	useIsomorphicLayoutEffect(() => {
		handlersRef.current = {
			handleAddChart,
			handleAddYieldChart,
			handleAddStablecoinsChart,
			handleAddStablecoinAssetChart,
			handleAddAdvancedTvlChart,
			handleAddBorrowedChart,
			handleAddTable,
			handleAddMultiChart,
			handleAddText,
			handleAddMetric,
			handleAddUnifiedTable,
			handleAddChartBuilder,
			handleAddLlamaAIChart,
			handleEditItem,
			handleRemoveItem,
			handleChartsReordered,
			handleGroupingChange,
			handleColSpanChange,
			handleCumulativeChange,
			handlePercentageChange,
			handleStackedChange,
			handleTreemapChange,
			handleHideOthersChange,
			handleChartTypeChange,
			handleTableFiltersChange,
			handleTableColumnsChange
		}
	})

	const chainByName = useMemo(() => {
		const map = new Map<string, Chain>()
		chains.forEach((chain) => {
			map.set(chain.name, chain)
		})
		return map
	}, [chains])

	const protocolBySlug = useMemo(() => {
		const map = new Map<string, Protocol>()
		protocols.forEach((protocol: Protocol) => {
			map.set(protocol.slug, protocol)
		})
		return map
	}, [protocols])

	const getChainInfo = useCallback(
		(chainName: string) => {
			return chainByName.get(chainName)
		},
		[chainByName]
	)

	const getProtocolInfo = useCallback(
		(protocolId: string) => {
			return protocolBySlug.get(protocolId)
		},
		[protocolBySlug]
	)

	const timeContextValue = useMemo(
		() => ({
			timePeriod,
			customTimePeriod,
			setTimePeriod,
			setCustomTimePeriod
		}),
		[timePeriod, customTimePeriod, setTimePeriod, setCustomTimePeriod]
	)

	const catalogContextValue = useMemo(
		() => ({
			protocols,
			chains,
			protocolsLoading,
			getChainInfo,
			getProtocolInfo
		}),
		[protocols, chains, protocolsLoading, getChainInfo, getProtocolInfo]
	)

	const permissionsContextValue = useMemo(
		() => ({
			isReadOnly: isReadOnlyUntilDashboardLoaded,
			dashboardOwnerId
		}),
		[isReadOnlyUntilDashboardLoaded, dashboardOwnerId]
	)

	const dashboardContextValue = useMemo(
		() => ({
			dashboardId,
			currentDashboard,
			dashboardName,
			dashboardVisibility,
			dashboardTags,
			dashboardDescription,
			isLoadingDashboard,
			getCurrentRatingSession,
			autoSkipOlderSessionsForRating,
			setDashboardName,
			setDashboardVisibility,
			setDashboardTags,
			setDashboardDescription,
			deleteDashboard: deleteDashboardWithConfirmation,
			saveDashboard,
			copyDashboard,
			handleCreateDashboard,
			handleGenerateDashboard,
			handleIterateDashboard,
			submitRating,
			skipRating,
			dismissRating,
			undoAIGeneration,
			canUndo
		}),
		[
			dashboardId,
			currentDashboard,
			dashboardName,
			dashboardVisibility,
			dashboardTags,
			dashboardDescription,
			isLoadingDashboard,
			getCurrentRatingSession,
			autoSkipOlderSessionsForRating,
			setDashboardName,
			setDashboardVisibility,
			setDashboardTags,
			setDashboardDescription,
			deleteDashboardWithConfirmation,
			saveDashboard,
			copyDashboard,
			handleCreateDashboard,
			handleGenerateDashboard,
			handleIterateDashboard,
			submitRating,
			skipRating,
			dismissRating,
			undoAIGeneration,
			canUndo
		]
	)

	const editorActionsContextValue = useMemo(
		(): ProDashboardEditorActionsContextType => ({
			handleAddChart: (...args: Parameters<typeof handleAddChart>) => handlersRef.current.handleAddChart(...args),
			handleAddYieldChart: (...args: Parameters<typeof handleAddYieldChart>) =>
				handlersRef.current.handleAddYieldChart(...args),
			handleAddStablecoinsChart: (...args: Parameters<typeof handleAddStablecoinsChart>) =>
				handlersRef.current.handleAddStablecoinsChart(...args),
			handleAddStablecoinAssetChart: (...args: Parameters<typeof handleAddStablecoinAssetChart>) =>
				handlersRef.current.handleAddStablecoinAssetChart(...args),
			handleAddAdvancedTvlChart: (...args: Parameters<typeof handleAddAdvancedTvlChart>) =>
				handlersRef.current.handleAddAdvancedTvlChart(...args),
			handleAddBorrowedChart: (...args: Parameters<typeof handleAddBorrowedChart>) =>
				handlersRef.current.handleAddBorrowedChart(...args),
			handleAddTable: (...args: Parameters<typeof handleAddTable>) => handlersRef.current.handleAddTable(...args),
			handleAddMultiChart: (...args: Parameters<typeof handleAddMultiChart>) =>
				handlersRef.current.handleAddMultiChart(...args),
			handleAddText: (...args: Parameters<typeof handleAddText>) => handlersRef.current.handleAddText(...args),
			handleAddMetric: (...args: Parameters<typeof handleAddMetric>) => handlersRef.current.handleAddMetric(...args),
			handleAddUnifiedTable: (...args: Parameters<typeof handleAddUnifiedTable>) =>
				handlersRef.current.handleAddUnifiedTable(...args),
			handleAddChartBuilder: (...args: Parameters<typeof handleAddChartBuilder>) =>
				handlersRef.current.handleAddChartBuilder(...args),
			handleAddLlamaAIChart: (...args: Parameters<typeof handleAddLlamaAIChart>) =>
				handlersRef.current.handleAddLlamaAIChart(...args),
			handleEditItem: (...args: Parameters<typeof handleEditItem>) => handlersRef.current.handleEditItem(...args),
			handleRemoveItem: (...args: Parameters<typeof handleRemoveItem>) => handlersRef.current.handleRemoveItem(...args),
			handleChartsReordered: (...args: Parameters<typeof handleChartsReordered>) =>
				handlersRef.current.handleChartsReordered(...args),
			handleGroupingChange: (...args: Parameters<typeof handleGroupingChange>) =>
				handlersRef.current.handleGroupingChange(...args),
			handleColSpanChange: (...args: Parameters<typeof handleColSpanChange>) =>
				handlersRef.current.handleColSpanChange(...args),
			handleCumulativeChange: (...args: Parameters<typeof handleCumulativeChange>) =>
				handlersRef.current.handleCumulativeChange(...args),
			handlePercentageChange: (...args: Parameters<typeof handlePercentageChange>) =>
				handlersRef.current.handlePercentageChange(...args),
			handleStackedChange: (...args: Parameters<typeof handleStackedChange>) =>
				handlersRef.current.handleStackedChange(...args),
			handleTreemapChange: (...args: Parameters<typeof handleTreemapChange>) =>
				handlersRef.current.handleTreemapChange(...args),
			handleHideOthersChange: (...args: Parameters<typeof handleHideOthersChange>) =>
				handlersRef.current.handleHideOthersChange(...args),
			handleChartTypeChange: (...args: Parameters<typeof handleChartTypeChange>) =>
				handlersRef.current.handleChartTypeChange(...args),
			handleTableFiltersChange: (...args: Parameters<typeof handleTableFiltersChange>) =>
				handlersRef.current.handleTableFiltersChange(...args),
			handleTableColumnsChange: (...args: Parameters<typeof handleTableColumnsChange>) =>
				handlersRef.current.handleTableColumnsChange(...args)
		}),
		[]
	)

	const itemsStateContextValue = useMemo(
		() => ({
			items
		}),
		[items]
	)

	const chartsDataContextValue = useMemo(
		() => ({
			chartsWithData
		}),
		[chartsWithData]
	)

	const uiContextValue = useMemo(
		() => ({
			createDashboardDialogStore,
			showGenerateDashboardModal,
			setShowGenerateDashboardModal,
			showIterateDashboardModal,
			setShowIterateDashboardModal
		}),
		[
			createDashboardDialogStore,
			showGenerateDashboardModal,
			setShowGenerateDashboardModal,
			showIterateDashboardModal,
			setShowIterateDashboardModal
		]
	)

	return (
		<ProDashboardTimeContext.Provider value={timeContextValue}>
			<ProDashboardCatalogContext.Provider value={catalogContextValue}>
				<ProDashboardPermissionsContext.Provider value={permissionsContextValue}>
					<ProDashboardDashboardContext.Provider value={dashboardContextValue}>
						<ProDashboardEditorActionsContext.Provider value={editorActionsContextValue}>
							<ProDashboardItemsStateContext.Provider value={itemsStateContextValue}>
								<ProDashboardChartsDataContext.Provider value={chartsDataContextValue}>
									<ProDashboardUIContext.Provider value={uiContextValue}>{children}</ProDashboardUIContext.Provider>
								</ProDashboardChartsDataContext.Provider>
							</ProDashboardItemsStateContext.Provider>
						</ProDashboardEditorActionsContext.Provider>
					</ProDashboardDashboardContext.Provider>
				</ProDashboardPermissionsContext.Provider>
			</ProDashboardCatalogContext.Provider>
		</ProDashboardTimeContext.Provider>
	)
}

export function useProDashboardTime() {
	const context = useContext(ProDashboardTimeContext)
	if (context === undefined) {
		throw new Error('useProDashboardTime must be used within a ProDashboardAPIProvider')
	}
	return context
}

export function useProDashboardCatalog() {
	const context = useContext(ProDashboardCatalogContext)
	if (context === undefined) {
		throw new Error('useProDashboardCatalog must be used within a ProDashboardAPIProvider')
	}
	return context
}

export function useProDashboardPermissions() {
	const context = useContext(ProDashboardPermissionsContext)
	if (context === undefined) {
		throw new Error('useProDashboardPermissions must be used within a ProDashboardAPIProvider')
	}
	return context
}

export function useProDashboardDashboard() {
	const context = useContext(ProDashboardDashboardContext)
	if (context === undefined) {
		throw new Error('useProDashboardDashboard must be used within a ProDashboardAPIProvider')
	}
	return context
}

export function useProDashboardEditorActions() {
	const context = useContext(ProDashboardEditorActionsContext)
	if (context === undefined) {
		throw new Error('useProDashboardEditorActions must be used within a ProDashboardAPIProvider')
	}
	return context
}

export function useProDashboardItemsState() {
	const context = useContext(ProDashboardItemsStateContext)
	if (context === undefined) {
		throw new Error('useProDashboardItemsState must be used within a ProDashboardAPIProvider')
	}
	return context
}

export function useProDashboardChartsData() {
	const context = useContext(ProDashboardChartsDataContext)
	if (context === undefined) {
		throw new Error('useProDashboardChartsData must be used within a ProDashboardAPIProvider')
	}
	return context
}

export function useProDashboardUI() {
	const context = useContext(ProDashboardUIContext)
	if (context === undefined) {
		throw new Error('useProDashboardUI must be used within a ProDashboardAPIProvider')
	}
	return context
}
