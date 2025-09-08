import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
	getCurrentRatingSession: () => (AISessionData & { sessionId: string }) | null
	autoSkipOlderSessionsForRating: () => Promise<void>
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
				| 'tvl'
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
		aiGenerated?: AIGeneratedData | null
	}) => Promise<void>
	saveDashboardName: () => Promise<void>
	copyDashboard: () => Promise<void>
	showCreateDashboardModal: boolean
	setShowCreateDashboardModal: (show: boolean) => void
	showGenerateDashboardModal: boolean
	setShowGenerateDashboardModal: (show: boolean) => void
	showIterateDashboardModal: boolean
	setShowIterateDashboardModal: (show: boolean) => void
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

const ProDashboardContext = createContext<ProDashboardContextType | undefined>(undefined)

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
	const [items, setItems] = useState<DashboardItemConfig[]>([])
	const [timePeriod, setTimePeriodState] = useState<TimePeriod>('365d')
	const [dashboardName, setDashboardName] = useState<string>('My Dashboard')
	const [dashboardId, setDashboardId] = useState<string | null>(initialDashboardId || null)
	const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null)
	const [dashboardVisibility, setDashboardVisibility] = useState<'private' | 'public'>('private')
	const [dashboardTags, setDashboardTags] = useState<string[]>([])
	const [dashboardDescription, setDashboardDescription] = useState<string>('')
	const [showCreateDashboardModal, setShowCreateDashboardModal] = useState(false)
	const [showGenerateDashboardModal, setShowGenerateDashboardModal] = useState(false)
	const [showIterateDashboardModal, setShowIterateDashboardModal] = useState(false)

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
		enabled: !!initialDashboardId
	})

	useEffect(() => {
		if (
			currentDashboard?.id !== currentDashboard2?.id &&
			currentDashboard2 !== null &&
			initialDashboardId === currentDashboard2?.id
		) {
			if (!currentDashboard2?.data?.items || !Array.isArray(currentDashboard2.data.items)) {
				return
			}
			setDashboardId(currentDashboard2.id)
			setDashboardName(currentDashboard2.data.dashboardName || 'My Dashboard')
			setItems(currentDashboard2.data.items)
			setTimePeriodState(currentDashboard2.data.timePeriod || '365d')
			setCurrentDashboard(currentDashboard2)
			setDashboardVisibility(currentDashboard2.visibility || 'private')
			setDashboardTags(currentDashboard2.tags || [])
			setDashboardDescription(currentDashboard2.description || '')
		}
	}, [currentDashboard2, currentDashboard, initialDashboardId])

	// Save dashboard
	const saveDashboard = useCallback(
		async (overrides?: {
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
			const data = {
				items: cleanedItems,
				dashboardName,
				timePeriod,
				visibility: overrides?.visibility ?? dashboardVisibility,
				tags: overrides?.tags ?? dashboardTags,
				description: overrides?.description ?? dashboardDescription,
				aiGenerated: overrides?.aiGenerated ?? currentDashboard?.aiGenerated ?? null,
				...(overrides?.aiUndoState && { aiUndoState: overrides.aiUndoState })
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
			currentDashboard?.aiGenerated,
			isAuthenticated,
			isReadOnly,
			updateDashboard,
			createDashboard,
			cleanItemsForSaving
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
			console.error('Failed to auto-skip older sessions:', error)
		}
	}, [isAuthenticated, currentDashboard?.aiGenerated, user?.id, dashboardId, saveDashboard])

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
				description: dashboardDescription,
				aiGenerated: currentDashboard?.aiGenerated ?? null
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
		currentDashboard?.aiGenerated,
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
				console.error('Failed to create new dashboard:', error)
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
		[dashboardId, saveDashboard, user?.id, currentDashboard?.aiGenerated, items]
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
				console.error('Failed to submit rating:', error)
				toast.error('Failed to submit rating. Please try again.')
			}
		},
		[isAuthenticated, user?.id, dashboardId, currentDashboard?.aiGenerated, saveDashboard]
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
				console.error('Failed to skip rating:', error)
			}
		},
		[isAuthenticated, user?.id, dashboardId, currentDashboard?.aiGenerated, saveDashboard]
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
	}, [currentDashboard?.data?.aiUndoState, currentDashboard?.aiGenerated, dashboardId, saveDashboard])

	const canUndo = useMemo(() => {
		return !!currentDashboard?.data?.aiUndoState?.items
	}, [currentDashboard?.data?.aiUndoState])

	// Load dashboard
	const loadDashboard = useCallback(
		async (id: string) => {
			navigateToDashboard(id)
		},
		[navigateToDashboard]
	)

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

	const chartQueries = useChartsData(allChartItems, timePeriod)

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

	// Handle adding items
	const handleAddChart = useCallback(
		(item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => {
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
		},
		[isReadOnly, initialDashboardId, currentDashboard, autoSave]
	)

	const handleAddTable = useCallback(
		(
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
		},
		[isReadOnly, autoSave]
	)

	const handleAddMultiChart = useCallback(
		(chartItems: ChartConfig[], name?: string) => {
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
		},
		[isReadOnly, items, autoSave]
	)

	const handleAddText = useCallback(
		(title: string | undefined, content: string) => {
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
		},
		[isReadOnly, autoSave]
	)

	const handleAddChartBuilder = useCallback(
		(
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
					| 'tvl'
				mode: 'chains' | 'protocol'
				protocol?: string
				chains: string[]
				categories: string[]
				groupBy: 'protocol'
				limit: number
				chartType: 'stackedBar' | 'stackedArea' | 'line'
				displayAs: 'timeSeries' | 'percentage'
				hideOthers?: boolean
				groupByParent?: boolean
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
		},
		[isReadOnly, autoSave]
	)

	const handleEditItem = useCallback(
		(itemId: string, newItem: DashboardItemConfig) => {
			if (isReadOnly) {
				return
			}
			setItems((prev) => {
				const newItems = prev.map((item) => (item.id === itemId ? newItem : item))
				autoSave(newItems)
				return newItems
			})
		},
		[isReadOnly, autoSave]
	)

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

	const value: ProDashboardContextType = useMemo(
		() => ({
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
			getCurrentRatingSession,
			autoSkipOlderSessionsForRating,
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
			showGenerateDashboardModal,
			setShowGenerateDashboardModal,
			showIterateDashboardModal,
			setShowIterateDashboardModal,
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
			getCurrentRatingSession,
			autoSkipOlderSessionsForRating,
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
			deleteDashboardWithConfirmation,
			saveDashboard,
			saveDashboardName,
			copyDashboard,
			showCreateDashboardModal,
			setShowCreateDashboardModal,
			showGenerateDashboardModal,
			setShowGenerateDashboardModal,
			showIterateDashboardModal,
			setShowIterateDashboardModal,
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

	return <ProDashboardContext.Provider value={value}>{children}</ProDashboardContext.Provider>
}

export function useProDashboard() {
	const context = useContext(ProDashboardContext)
	if (context === undefined) {
		throw new Error('useProDashboard must be used within a ProDashboardAPIProvider')
	}
	return context
}
