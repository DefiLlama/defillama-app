import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from 'react'
import {
	DEFAULT_COLUMN_ORDER,
	DEFAULT_ROW_HEADERS,
	DEFAULT_UNIFIED_TABLE_SORTING
} from './components/UnifiedTable/constants'
import { CustomTimePeriod, DashboardAction, DashboardState, TimePeriod } from './dashboardReducer'
import { Dashboard } from './services/DashboardAPI'
import {
	AdvancedTvlChartConfig,
	AdvancedTvlChartType,
	BorrowedChartConfig,
	BorrowedChartType,
	CHART_TYPES,
	ChartBuilderConfig,
	ChartConfig,
	DashboardItemConfig,
	LlamaAIChartConfig,
	MetricConfig,
	MultiChartConfig,
	ProtocolsTableConfig,
	StablecoinAssetChartConfig,
	StablecoinAssetChartType,
	StablecoinChartType,
	StablecoinsChartConfig,
	StoredColSpan,
	TableFilters,
	TextConfig,
	UnifiedTableConfig,
	YieldsChartConfig
} from './types'
import { generateItemId } from './utils/dashboardUtils'

type AutoSaveOverrides = {
	timePeriod?: TimePeriod
	customTimePeriod?: CustomTimePeriod | null
}

type AutoSaveFunction = (items: DashboardItemConfig[], overrides?: AutoSaveOverrides) => void

export function useDashboardActions(
	dispatch: Dispatch<DashboardAction>,
	state: DashboardState,
	autoSave: AutoSaveFunction,
	isReadOnlyUntilDashboardLoaded: boolean
) {
	const { items } = state

	const itemsRef = useRef(items)
	useEffect(() => {
		itemsRef.current = items
	}, [items])

	const dispatchItemsAndSave = useCallback(
		(updater: SetStateAction<DashboardItemConfig[]>) => {
			const prevItems = itemsRef.current
			const newItems = typeof updater === 'function' ? updater(prevItems) : updater
			itemsRef.current = newItems
			dispatch({ type: 'SET_ITEMS', payload: newItems })
			autoSave(newItems)
		},
		[dispatch, autoSave]
	)

	const handleAddChart = useCallback(
		(item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null, color?: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newChartId = generateItemId(chartType, item)
			const chartTypeDetails = CHART_TYPES[chartType]

			const newChartBase: Partial<ChartConfig> = {
				id: newChartId,
				kind: 'chart',
				type: chartType,
				colSpan: 1,
				color
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

			dispatchItemsAndSave((prev) => [...prev, newChart])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddYieldChart = useCallback(
		(poolConfigId: string, poolName: string, project: string, chain: string, chartType?: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newYieldChart: YieldsChartConfig = {
				id: generateItemId('yields', poolConfigId),
				kind: 'yields',
				poolConfigId,
				poolName,
				project,
				chain,
				chartType: (chartType as YieldsChartConfig['chartType']) || 'tvl-apy',
				colSpan: 1
			}

			dispatchItemsAndSave((prev) => [...prev, newYieldChart])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddStablecoinsChart = useCallback(
		(chain: string, chartType: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newStablecoinsChart: StablecoinsChartConfig = {
				id: generateItemId('stablecoins', `${chain}-${chartType}`),
				kind: 'stablecoins',
				chain,
				chartType: chartType as StablecoinChartType,
				colSpan: 1
			}

			dispatchItemsAndSave((prev) => [...prev, newStablecoinsChart])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddStablecoinAssetChart = useCallback(
		(stablecoin: string, stablecoinId: string, chartType: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newStablecoinAssetChart: StablecoinAssetChartConfig = {
				id: generateItemId('stablecoin-asset', `${stablecoin}-${chartType}`),
				kind: 'stablecoin-asset',
				stablecoin,
				stablecoinId,
				chartType: chartType as StablecoinAssetChartType,
				colSpan: 1
			}

			dispatchItemsAndSave((prev) => [...prev, newStablecoinAssetChart])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddAdvancedTvlChart = useCallback(
		(protocol: string, protocolName: string, chartType: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newAdvancedTvlChart: AdvancedTvlChartConfig = {
				id: generateItemId('advanced-tvl', `${protocol}-${chartType}`),
				kind: 'advanced-tvl',
				protocol,
				protocolName,
				chartType: chartType as AdvancedTvlChartType,
				colSpan: 1
			}

			dispatchItemsAndSave((prev) => [...prev, newAdvancedTvlChart])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddBorrowedChart = useCallback(
		(protocol: string, protocolName: string, chartType: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newBorrowedChart: BorrowedChartConfig = {
				id: generateItemId('advanced-borrowed', `${protocol}-${chartType}`),
				kind: 'advanced-borrowed',
				protocol,
				protocolName,
				chartType: chartType as BorrowedChartType,
				colSpan: 1
			}

			dispatchItemsAndSave((prev) => [...prev, newBorrowedChart])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
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
			if (isReadOnlyUntilDashboardLoaded) return

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

			dispatchItemsAndSave((prev) => [...prev, newTable])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddUnifiedTable = useCallback(
		(configOverrides?: Partial<UnifiedTableConfig>) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const resolvedSorting =
				configOverrides?.defaultSorting && configOverrides.defaultSorting.length
					? configOverrides.defaultSorting.map((item) => ({ id: item.id, desc: item.desc ?? false }))
					: DEFAULT_UNIFIED_TABLE_SORTING.map((item) => ({ ...item }))

			const newUnifiedTable: UnifiedTableConfig = {
				id: generateItemId('unified-table', 'protocols'),
				kind: 'unified-table',
				rowHeaders: configOverrides?.rowHeaders ?? [...DEFAULT_ROW_HEADERS],
				defaultSorting: resolvedSorting,
				params: configOverrides?.params ?? { chains: ['All'] },
				filters: configOverrides?.filters,
				columnOrder: configOverrides?.columnOrder ?? [...DEFAULT_COLUMN_ORDER],
				columnVisibility: configOverrides?.columnVisibility ?? {},
				activePresetId: configOverrides?.activePresetId,
				colSpan: configOverrides?.colSpan ?? 2,
				customColumns: configOverrides?.customColumns
			}

			dispatchItemsAndSave((prev) => [...prev, newUnifiedTable])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddMultiChart = useCallback(
		(chartItems: ChartConfig[], name?: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const defaultGrouping = 'day'

			dispatchItemsAndSave((prev) => {
				const newMultiChart: MultiChartConfig = {
					id: generateItemId('multi', ''),
					kind: 'multi',
					name: name || `Multi-Chart ${prev.filter((item) => item.kind === 'multi').length + 1}`,
					items: chartItems.map((chart) => ({
						...chart,
						grouping: chart.grouping || defaultGrouping
					})),
					grouping: defaultGrouping,
					colSpan: 1
				}
				return [...prev, newMultiChart]
			})
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddText = useCallback(
		(title: string | undefined, content: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newText: TextConfig = {
				id: generateItemId('text', ''),
				kind: 'text',
				title,
				content,
				colSpan: 1
			}

			dispatchItemsAndSave((prev) => [...prev, newText])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddChartBuilder = useCallback(
		(name: string | undefined, config: ChartBuilderConfig['config']) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newBuilder = {
				id: generateItemId('builder', ''),
				kind: 'builder' as const,
				name,
				config,
				colSpan: 1 as const
			}

			dispatchItemsAndSave((prev) => [...prev, newBuilder])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddLlamaAIChart = useCallback(
		(savedChartId: string, title?: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newChart: LlamaAIChartConfig = {
				id: generateItemId('llamaai-chart', savedChartId),
				kind: 'llamaai-chart',
				savedChartId,
				title,
				colSpan: 1
			}

			dispatchItemsAndSave((prev) => [...prev, newChart])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleEditItem = useCallback(
		(itemId: string, newItem: DashboardItemConfig) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) => prev.map((item) => (item.id === itemId ? newItem : item)))
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleRemoveItem = useCallback(
		(itemId: string) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) => prev.filter((item) => item.id !== itemId))
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleAddMetric = useCallback(
		(config: MetricConfig) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const metric: MetricConfig = {
				id: generateItemId('metric', ''),
				kind: 'metric',
				subject: config.subject,
				type: config.type,
				aggregator: config.aggregator,
				window: config.window,
				compare: config.compare,
				label: config.label,
				format: config.format,
				showSparkline: config.showSparkline !== false,
				colSpan: (config.colSpan ?? 0.5) as StoredColSpan
			}

			dispatchItemsAndSave((prev) => [...prev, metric])
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const setTimePeriod = useCallback(
		(period: TimePeriod) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newCustomTimePeriod = period !== 'custom' ? null : state.customTimePeriod

			dispatch({ type: 'SET_TIME_PERIOD', payload: period })
			autoSave(itemsRef.current, { timePeriod: period, customTimePeriod: newCustomTimePeriod })
		},
		[dispatch, autoSave, isReadOnlyUntilDashboardLoaded, state.customTimePeriod]
	)

	const setCustomTimePeriod = useCallback(
		(period: CustomTimePeriod | null) => {
			if (isReadOnlyUntilDashboardLoaded) return

			const newTimePeriod = period ? 'custom' : state.timePeriod

			dispatch({ type: 'SET_CUSTOM_TIME_PERIOD', payload: period })
			autoSave(itemsRef.current, { timePeriod: newTimePeriod, customTimePeriod: period })
		},
		[dispatch, autoSave, isReadOnlyUntilDashboardLoaded, state.timePeriod]
	)

	const handleChartsReordered = useCallback(
		(newCharts: DashboardItemConfig[]) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatch({ type: 'SET_ITEMS', payload: newCharts })
			autoSave(newCharts)
		},
		[dispatch, autoSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleGroupingChange = useCallback(
		(chartId: string, newGrouping: 'day' | 'week' | 'month' | 'quarter') => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
					if (item.id === chartId && item.kind === 'chart') {
						return { ...item, grouping: newGrouping }
					} else if (item.kind === 'multi' && item.id === chartId) {
						return {
							...item,
							grouping: newGrouping,
							items: item.items.map((nestedChart) => ({
								...nestedChart,
								grouping: newGrouping
							}))
						}
					} else if (item.kind === 'builder' && item.id === chartId) {
						return { ...item, grouping: newGrouping }
					}
					return item
				})
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleColSpanChange = useCallback(
		(chartId: string, newColSpan: StoredColSpan) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
					if (item.id === chartId) {
						if (item.kind === 'metric') {
							const clampedMetric = Math.min(1, Math.max(0.5, newColSpan)) as StoredColSpan
							return { ...item, colSpan: clampedMetric }
						}
						const clamped = Math.min(2, Math.max(0.5, newColSpan)) as StoredColSpan
						return { ...item, colSpan: clamped }
					}
					return item
				})
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleCumulativeChange = useCallback(
		(itemId: string, showCumulative: boolean) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
					if (item.id === itemId && item.kind === 'chart') {
						return { ...item, showCumulative }
					} else if (item.id === itemId && item.kind === 'multi') {
						return { ...item, showCumulative }
					}
					return item
				})
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handlePercentageChange = useCallback(
		(itemId: string, showPercentage: boolean) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
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
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleStackedChange = useCallback(
		(itemId: string, showStacked: boolean) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
					if (item.id === itemId && item.kind === 'multi') {
						return { ...item, showStacked }
					}
					return item
				})
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleHideOthersChange = useCallback(
		(itemId: string, hideOthers: boolean) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
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
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleChartTypeChange = useCallback(
		(itemId: string, newChartType: 'stackedBar' | 'stackedArea' | 'line') => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
					if (item.id === itemId && item.kind === 'builder') {
						return {
							...item,
							config: {
								...item.config,
								chartType: newChartType
							}
						} as ChartBuilderConfig
					}
					return item
				})
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleTableFiltersChange = useCallback(
		(tableId: string, filters: TableFilters) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
					if (item.id === tableId && item.kind === 'table') {
						return { ...item, filters } as ProtocolsTableConfig
					}
					return item
				})
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const handleTableColumnsChange = useCallback(
		(
			tableId: string,
			columnOrder?: string[],
			columnVisibility?: Record<string, boolean>,
			customColumns?: any[],
			activeViewId?: string,
			activePresetId?: string
		) => {
			if (isReadOnlyUntilDashboardLoaded) return

			dispatchItemsAndSave((prev) =>
				prev.map((item) => {
					if (item.id === tableId && item.kind === 'table') {
						return {
							...item,
							columnOrder,
							columnVisibility,
							customColumns,
							activeViewId,
							activePresetId
						} as ProtocolsTableConfig
					}
					return item
				})
			)
		},
		[dispatchItemsAndSave, isReadOnlyUntilDashboardLoaded]
	)

	const setDashboardName = useCallback(
		(name: string) => {
			dispatch({ type: 'SET_DASHBOARD_NAME', payload: name })
		},
		[dispatch]
	)

	const setDashboardVisibility = useCallback(
		(visibility: 'private' | 'public') => {
			dispatch({ type: 'SET_DASHBOARD_VISIBILITY', payload: visibility })
		},
		[dispatch]
	)

	const setDashboardTags = useCallback(
		(tags: string[]) => {
			dispatch({ type: 'SET_DASHBOARD_TAGS', payload: tags })
		},
		[dispatch]
	)

	const setDashboardDescription = useCallback(
		(description: string) => {
			dispatch({ type: 'SET_DASHBOARD_DESCRIPTION', payload: description })
		},
		[dispatch]
	)

	const setShowGenerateDashboardModal = useCallback(
		(show: boolean) => {
			dispatch({ type: 'SET_SHOW_GENERATE_DASHBOARD_MODAL', payload: show })
		},
		[dispatch]
	)

	const setShowIterateDashboardModal = useCallback(
		(show: boolean) => {
			dispatch({ type: 'SET_SHOW_ITERATE_DASHBOARD_MODAL', payload: show })
		},
		[dispatch]
	)

	const setItems = useCallback(
		(newItems: DashboardItemConfig[]) => {
			dispatch({ type: 'SET_ITEMS', payload: newItems })
		},
		[dispatch]
	)

	const setCurrentDashboard = useCallback(
		(updater: SetStateAction<Dashboard | null>) => {
			dispatch({ type: 'SET_CURRENT_DASHBOARD', payload: updater })
		},
		[dispatch]
	)

	return {
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
	}
}
