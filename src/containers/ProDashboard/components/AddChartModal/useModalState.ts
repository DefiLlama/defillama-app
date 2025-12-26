import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { ChartConfig, DashboardItemConfig, MetricAggregator } from '../../types'
import { initializeFromEditItem, modalReducer } from './modalReducer'
import { ChartBuilderConfig, ChartModeType, ChartTabType, CombinedTableType, MainTabType } from './types'

export function useModalState(editItem?: DashboardItemConfig | null, isOpen?: boolean) {
	const [state, dispatch] = useReducer(modalReducer, editItem, initializeFromEditItem)

	useEffect(() => {
		if (isOpen) {
			dispatch({
				type: 'INITIALIZE_FROM_EDIT_ITEM',
				payload: { editItem: editItem ?? null }
			})
		}
	}, [editItem, isOpen])

	const resetState = useCallback(() => {
		dispatch({ type: 'RESET_STATE' })
	}, [])

	const actions = useMemo(
		() => ({
			setSelectedMainTab: (tab: MainTabType) => dispatch({ type: 'SET_SELECTED_MAIN_TAB', payload: tab }),
			setSelectedChartTab: (tab: ChartTabType) => dispatch({ type: 'SET_SELECTED_CHART_TAB', payload: tab }),
			setChartMode: (mode: ChartModeType) => dispatch({ type: 'SET_CHART_MODE', payload: mode }),
			setComposerItems: (items: React.SetStateAction<ChartConfig[]>) =>
				dispatch({ type: 'SET_COMPOSER_ITEMS', payload: items }),
			setSelectedChain: (chain: string | null) => dispatch({ type: 'SET_SELECTED_CHAIN', payload: chain }),
			setSelectedChains: (chains: string[]) => dispatch({ type: 'SET_SELECTED_CHAINS', payload: chains }),
			setSelectedProtocol: (protocol: string | null) => dispatch({ type: 'SET_SELECTED_PROTOCOL', payload: protocol }),
			setSelectedProtocols: (protocols: string[]) => dispatch({ type: 'SET_SELECTED_PROTOCOLS', payload: protocols }),
			setSelectedChartType: (type: string) => dispatch({ type: 'SET_SELECTED_CHART_TYPE', payload: type }),
			setSelectedChartTypes: (types: string[]) => dispatch({ type: 'SET_SELECTED_CHART_TYPES', payload: types }),
			setUnifiedChartName: (name: string) => dispatch({ type: 'SET_UNIFIED_CHART_NAME', payload: name }),
			setChartCreationMode: (mode: 'separate' | 'combined') =>
				dispatch({ type: 'SET_CHART_CREATION_MODE', payload: mode }),
			setTextTitle: (title: string) => dispatch({ type: 'SET_TEXT_TITLE', payload: title }),
			setTextContent: (content: string) => dispatch({ type: 'SET_TEXT_CONTENT', payload: content }),
			setSelectedTableType: (type: CombinedTableType) => dispatch({ type: 'SET_SELECTED_TABLE_TYPE', payload: type }),
			setSelectedDatasetChain: (chain: string | null) =>
				dispatch({ type: 'SET_SELECTED_DATASET_CHAIN', payload: chain }),
			setSelectedDatasetTimeframe: (timeframe: string | null) =>
				dispatch({ type: 'SET_SELECTED_DATASET_TIMEFRAME', payload: timeframe }),
			setSelectedTokens: (tokens: string[]) => dispatch({ type: 'SET_SELECTED_TOKENS', payload: tokens }),
			setIncludeCex: (include: boolean) => dispatch({ type: 'SET_INCLUDE_CEX', payload: include }),
			setChartBuilderName: (name: string) => dispatch({ type: 'SET_CHART_BUILDER_NAME', payload: name }),
			setChartBuilder: (config: React.SetStateAction<ChartBuilderConfig>) =>
				dispatch({ type: 'SET_CHART_BUILDER', payload: config }),
			setMetricSubjectType: (t: 'chain' | 'protocol') => dispatch({ type: 'SET_METRIC_SUBJECT_TYPE', payload: t }),
			setMetricChain: (v: string | null) => dispatch({ type: 'SET_METRIC_CHAIN', payload: v }),
			setMetricProtocol: (v: string | null) => dispatch({ type: 'SET_METRIC_PROTOCOL', payload: v }),
			setMetricType: (t: string) => dispatch({ type: 'SET_METRIC_TYPE', payload: t }),
			setMetricAggregator: (a: MetricAggregator) => dispatch({ type: 'SET_METRIC_AGGREGATOR', payload: a }),
			setMetricWindow: (w: '7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all') =>
				dispatch({ type: 'SET_METRIC_WINDOW', payload: w }),
			setMetricLabel: (s: string) => dispatch({ type: 'SET_METRIC_LABEL', payload: s }),
			setMetricShowSparkline: (v: boolean) => dispatch({ type: 'SET_METRIC_SHOW_SPARKLINE', payload: v }),
			setSelectedYieldPool: (pool: { configID: string; name: string; project: string; chain: string } | null) =>
				dispatch({ type: 'SET_SELECTED_YIELD_POOL', payload: pool }),
			setSelectedYieldChartType: (chartType: string) =>
				dispatch({ type: 'SET_SELECTED_YIELD_CHART_TYPE', payload: chartType }),
			setSelectedYieldChains: (chains: string[]) => dispatch({ type: 'SET_SELECTED_YIELD_CHAINS', payload: chains }),
			setSelectedYieldProjects: (projects: string[]) =>
				dispatch({ type: 'SET_SELECTED_YIELD_PROJECTS', payload: projects }),
			setSelectedYieldCategories: (categories: string[]) =>
				dispatch({ type: 'SET_SELECTED_YIELD_CATEGORIES', payload: categories }),
			setSelectedYieldTokens: (tokens: string[]) => dispatch({ type: 'SET_SELECTED_YIELD_TOKENS', payload: tokens }),
			setMinTvl: (tvl: number | null) => dispatch({ type: 'SET_MIN_TVL', payload: tvl }),
			setMaxTvl: (tvl: number | null) => dispatch({ type: 'SET_MAX_TVL', payload: tvl }),
			setSelectedStablecoinChain: (chain: string) =>
				dispatch({ type: 'SET_SELECTED_STABLECOIN_CHAIN', payload: chain }),
			setSelectedStablecoinChartType: (chartType: string) =>
				dispatch({ type: 'SET_SELECTED_STABLECOIN_CHART_TYPE', payload: chartType }),
			setStablecoinMode: (mode: 'chain' | 'asset') => dispatch({ type: 'SET_STABLECOIN_MODE', payload: mode }),
			setSelectedStablecoinAsset: (asset: string | null) =>
				dispatch({ type: 'SET_SELECTED_STABLECOIN_ASSET', payload: asset }),
			setSelectedStablecoinAssetId: (id: string | null) =>
				dispatch({ type: 'SET_SELECTED_STABLECOIN_ASSET_ID', payload: id }),
			setSelectedStablecoinAssetChartType: (chartType: string) =>
				dispatch({ type: 'SET_SELECTED_STABLECOIN_ASSET_CHART_TYPE', payload: chartType }),
			setSelectedAdvancedTvlProtocol: (protocol: string | null) =>
				dispatch({ type: 'SET_SELECTED_ADVANCED_TVL_PROTOCOL', payload: protocol }),
			setSelectedAdvancedTvlProtocolName: (name: string | null) =>
				dispatch({ type: 'SET_SELECTED_ADVANCED_TVL_PROTOCOL_NAME', payload: name }),
			setSelectedAdvancedTvlChartType: (chartType: string) =>
				dispatch({ type: 'SET_SELECTED_ADVANCED_TVL_CHART_TYPE', payload: chartType }),
			setSelectedBorrowedProtocol: (protocol: string | null) =>
				dispatch({ type: 'SET_SELECTED_BORROWED_PROTOCOL', payload: protocol }),
			setSelectedBorrowedProtocolName: (name: string | null) =>
				dispatch({ type: 'SET_SELECTED_BORROWED_PROTOCOL_NAME', payload: name }),
			setSelectedBorrowedChartType: (chartType: string) =>
				dispatch({ type: 'SET_SELECTED_BORROWED_CHART_TYPE', payload: chartType })
		}),
		[]
	)

	return {
		state,
		actions,
		resetState
	}
}
