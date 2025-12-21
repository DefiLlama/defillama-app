import { ChartConfig, DashboardItemConfig, MetricAggregator } from '../../types'
import { ChartBuilderConfig, ChartModeType, ChartTabType, CombinedTableType, MainTabType, ModalState } from './types'

type SetStateAction<T> = T | ((prev: T) => T)

export type ModalAction =
	| { type: 'SET_SELECTED_MAIN_TAB'; payload: MainTabType }
	| { type: 'SET_SELECTED_CHART_TAB'; payload: ChartTabType }
	| { type: 'SET_CHART_MODE'; payload: ChartModeType }
	| { type: 'SET_COMPOSER_ITEMS'; payload: SetStateAction<ChartConfig[]> }
	| { type: 'SET_SELECTED_CHAIN'; payload: string | null }
	| { type: 'SET_SELECTED_CHAINS'; payload: string[] }
	| { type: 'SET_SELECTED_PROTOCOL'; payload: string | null }
	| { type: 'SET_SELECTED_PROTOCOLS'; payload: string[] }
	| { type: 'SET_SELECTED_CHART_TYPE'; payload: string }
	| { type: 'SET_SELECTED_CHART_TYPES'; payload: string[] }
	| { type: 'SET_UNIFIED_CHART_NAME'; payload: string }
	| { type: 'SET_CHART_CREATION_MODE'; payload: 'separate' | 'combined' }
	| { type: 'SET_TEXT_TITLE'; payload: string }
	| { type: 'SET_TEXT_CONTENT'; payload: string }
	| { type: 'SET_SELECTED_TABLE_TYPE'; payload: CombinedTableType }
	| { type: 'SET_SELECTED_DATASET_CHAIN'; payload: string | null }
	| { type: 'SET_SELECTED_DATASET_TIMEFRAME'; payload: string | null }
	| { type: 'SET_SELECTED_TOKENS'; payload: string[] }
	| { type: 'SET_INCLUDE_CEX'; payload: boolean }
	| { type: 'SET_CHART_BUILDER_NAME'; payload: string }
	| { type: 'SET_CHART_BUILDER'; payload: SetStateAction<ChartBuilderConfig> }
	| { type: 'SET_METRIC_SUBJECT_TYPE'; payload: 'chain' | 'protocol' }
	| { type: 'SET_METRIC_CHAIN'; payload: string | null }
	| { type: 'SET_METRIC_PROTOCOL'; payload: string | null }
	| { type: 'SET_METRIC_TYPE'; payload: string }
	| { type: 'SET_METRIC_AGGREGATOR'; payload: MetricAggregator }
	| { type: 'SET_METRIC_WINDOW'; payload: '7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all' }
	| { type: 'SET_METRIC_LABEL'; payload: string }
	| { type: 'SET_METRIC_SHOW_SPARKLINE'; payload: boolean }
	| {
			type: 'SET_SELECTED_YIELD_POOL'
			payload: { configID: string; name: string; project: string; chain: string } | null
	  }
	| { type: 'SET_SELECTED_YIELD_CHART_TYPE'; payload: string }
	| { type: 'SET_SELECTED_YIELD_CHAINS'; payload: string[] }
	| { type: 'SET_SELECTED_YIELD_PROJECTS'; payload: string[] }
	| { type: 'SET_SELECTED_YIELD_CATEGORIES'; payload: string[] }
	| { type: 'SET_SELECTED_YIELD_TOKENS'; payload: string[] }
	| { type: 'SET_MIN_TVL'; payload: number | null }
	| { type: 'SET_MAX_TVL'; payload: number | null }
	| { type: 'SET_SELECTED_STABLECOIN_CHAIN'; payload: string }
	| { type: 'SET_SELECTED_STABLECOIN_CHART_TYPE'; payload: string }
	| { type: 'SET_STABLECOIN_MODE'; payload: 'chain' | 'asset' }
	| { type: 'SET_SELECTED_STABLECOIN_ASSET'; payload: string | null }
	| { type: 'SET_SELECTED_STABLECOIN_ASSET_ID'; payload: string | null }
	| { type: 'SET_SELECTED_STABLECOIN_ASSET_CHART_TYPE'; payload: string }
	| { type: 'SET_SELECTED_ADVANCED_TVL_PROTOCOL'; payload: string | null }
	| { type: 'SET_SELECTED_ADVANCED_TVL_PROTOCOL_NAME'; payload: string | null }
	| { type: 'SET_SELECTED_ADVANCED_TVL_CHART_TYPE'; payload: string }
	| { type: 'SET_SELECTED_BORROWED_PROTOCOL'; payload: string | null }
	| { type: 'SET_SELECTED_BORROWED_PROTOCOL_NAME'; payload: string | null }
	| { type: 'SET_SELECTED_BORROWED_CHART_TYPE'; payload: string }
	| { type: 'RESET_STATE' }
	| { type: 'INITIALIZE_FROM_EDIT_ITEM'; payload: { editItem: DashboardItemConfig | null | undefined } }

const CUMULATIVE_METRIC_TYPES = new Set([
	'volume',
	'fees',
	'revenue',
	'perps',
	'aggregators',
	'bridgeAggregators',
	'perpsAggregators',
	'bribes',
	'tokenTax',
	'holdersRevenue',
	'optionsPremium',
	'optionsNotional',
	'tokenVolume',
	'users',
	'txs',
	'activeUsers',
	'newUsers',
	'gasUsed',
	'stablecoinInflows',
	'chainFees',
	'chainRevenue',
	'incentives',
	'options'
])

function getDefaultAggregator(metricType: string): MetricAggregator {
	return CUMULATIVE_METRIC_TYPES.has(metricType) ? 'sum' : 'latest'
}

const DEFAULT_CHART_BUILDER: ChartBuilderConfig = {
	metric: 'tvl',
	mode: 'chains',
	filterMode: 'include',
	chains: [],
	chainCategories: [],
	protocolCategories: [],
	categories: [],
	groupBy: 'protocol',
	limit: 10,
	chartType: 'stackedArea',
	displayAs: 'timeSeries',
	additionalFilters: {},
	seriesColors: {}
}

export const INITIAL_MODAL_STATE: ModalState = {
	selectedMainTab: 'charts',
	selectedChartTab: 'chain',
	chartMode: 'builder',
	composerItems: [],
	selectedChain: null,
	selectedChains: [],
	selectedProtocol: null,
	selectedProtocols: [],
	selectedChartType: 'tvl',
	selectedChartTypes: [],
	unifiedChartName: '',
	chartCreationMode: 'combined',
	textTitle: '',
	textContent: '',
	selectedTableType: 'protocols',
	selectedDatasetChain: null,
	selectedDatasetTimeframe: null,
	selectedTokens: [],
	includeCex: false,
	chartBuilderName: '',
	chartBuilder: DEFAULT_CHART_BUILDER,
	metricSubjectType: 'chain',
	metricChain: null,
	metricProtocol: null,
	metricType: 'tvl',
	metricAggregator: 'latest',
	metricWindow: '30d',
	metricLabel: '',
	metricShowSparkline: true,
	selectedYieldPool: null,
	selectedYieldChartType: 'tvl-apy',
	selectedYieldChains: [],
	selectedYieldProjects: [],
	selectedYieldCategories: [],
	selectedYieldTokens: [],
	minTvl: null,
	maxTvl: null,
	selectedStablecoinChain: 'All',
	selectedStablecoinChartType: 'totalMcap',
	stablecoinMode: 'chain',
	selectedStablecoinAsset: null,
	selectedStablecoinAssetId: null,
	selectedStablecoinAssetChartType: 'totalCirc',
	selectedAdvancedTvlProtocol: null,
	selectedAdvancedTvlProtocolName: null,
	selectedAdvancedTvlChartType: 'tvl',
	selectedBorrowedProtocol: null,
	selectedBorrowedProtocolName: null,
	selectedBorrowedChartType: 'chainsBorrowed'
}

export function initializeFromEditItem(editItem: DashboardItemConfig | null | undefined): ModalState {
	if (!editItem) {
		return {
			...INITIAL_MODAL_STATE,
			composerItems: [],
			selectedChains: [],
			selectedProtocols: [],
			selectedChartTypes: [],
			selectedTokens: [],
			selectedYieldChains: [],
			selectedYieldProjects: [],
			selectedYieldCategories: [],
			selectedYieldTokens: [],
			chartBuilder: {
				...DEFAULT_CHART_BUILDER,
				chains: [],
				chainCategories: [],
				protocolCategories: [],
				categories: []
			}
		}
	}

	const base: ModalState = {
		...INITIAL_MODAL_STATE,
		composerItems: [],
		selectedChains: [],
		selectedProtocols: [],
		selectedChartTypes: [],
		selectedTokens: [],
		selectedYieldChains: [],
		selectedYieldProjects: [],
		selectedYieldCategories: [],
		selectedYieldTokens: [],
		chartBuilder: { ...DEFAULT_CHART_BUILDER, chains: [], chainCategories: [], protocolCategories: [], categories: [] }
	}

	if (editItem.kind === 'chart') {
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'manual',
			selectedChartTab: editItem.protocol ? 'protocol' : 'chain',
			selectedChain: editItem.chain || null,
			selectedProtocol: editItem.protocol || null,
			selectedChartType: editItem.type,
			selectedChartTypes: [editItem.type],
			chartCreationMode: 'combined',
			unifiedChartName: ''
		}
	}

	if (editItem.kind === 'multi') {
		const firstItem = editItem.items[0]
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'manual',
			composerItems: editItem.items,
			unifiedChartName: editItem.name || '',
			chartCreationMode: 'combined',
			selectedChartTab: firstItem?.protocol ? 'protocol' : 'chain',
			selectedChartTypes: [],
			selectedProtocol: firstItem?.protocol || null,
			selectedChain: firstItem?.chain || null
		}
	}

	if (editItem.kind === 'table') {
		return {
			...base,
			selectedMainTab: 'table',
			selectedChains: editItem.chains || [],
			selectedTableType:
				editItem.tableType === 'dataset' ? ((editItem.datasetType || 'stablecoins') as CombinedTableType) : 'protocols',
			selectedDatasetChain: editItem.datasetChain || null,
			selectedDatasetTimeframe: editItem.datasetTimeframe || null,
			selectedTokens: editItem.tokenSymbols || [],
			includeCex: editItem.includeCex || false
		}
	}

	if (editItem.kind === 'unified-table') {
		return { ...base, selectedMainTab: 'unified-table' }
	}

	if (editItem.kind === 'text') {
		return {
			...base,
			selectedMainTab: 'text',
			textTitle: editItem.title || '',
			textContent: editItem.content
		}
	}

	if (editItem.kind === 'builder') {
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'builder',
			chartBuilderName: editItem.name || '',
			chartBuilder: {
				...editItem.config,
				mode: editItem.config.mode || 'chains',
				protocolCategories: editItem.config.protocolCategories || [],
				seriesColors: editItem.config.seriesColors || {}
			}
		}
	}

	if (editItem.kind === 'metric') {
		return {
			...base,
			selectedMainTab: 'metric',
			metricSubjectType: editItem.subject.itemType,
			metricChain: editItem.subject.chain || null,
			metricProtocol: editItem.subject.protocol || null,
			metricType: editItem.type,
			metricAggregator: editItem.aggregator,
			metricWindow: editItem.window,
			metricLabel: editItem.label || '',
			metricShowSparkline: editItem.showSparkline !== false
		}
	}

	if (editItem.kind === 'yields') {
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'manual',
			selectedChartTab: 'yields',
			selectedYieldPool: {
				configID: editItem.poolConfigId,
				name: editItem.poolName,
				project: editItem.project,
				chain: editItem.chain
			},
			selectedYieldChartType: editItem.chartType || 'tvl-apy'
		}
	}

	if (editItem.kind === 'stablecoins') {
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'manual',
			selectedChartTab: 'stablecoins',
			stablecoinMode: 'chain',
			selectedStablecoinChain: editItem.chain,
			selectedStablecoinChartType: editItem.chartType
		}
	}

	if (editItem.kind === 'stablecoin-asset') {
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'manual',
			selectedChartTab: 'stablecoins',
			stablecoinMode: 'asset',
			selectedStablecoinAsset: editItem.stablecoin,
			selectedStablecoinAssetId: editItem.stablecoinId,
			selectedStablecoinAssetChartType: editItem.chartType
		}
	}

	if (editItem.kind === 'advanced-tvl') {
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'manual',
			selectedChartTab: 'advanced-tvl',
			selectedAdvancedTvlProtocol: editItem.protocol,
			selectedAdvancedTvlProtocolName: editItem.protocolName,
			selectedAdvancedTvlChartType: editItem.chartType
		}
	}

	if (editItem.kind === 'advanced-borrowed') {
		return {
			...base,
			selectedMainTab: 'charts',
			chartMode: 'manual',
			selectedChartTab: 'borrowed',
			selectedBorrowedProtocol: editItem.protocol,
			selectedBorrowedProtocolName: editItem.protocolName,
			selectedBorrowedChartType: editItem.chartType
		}
	}

	return base
}

export function modalReducer(state: ModalState, action: ModalAction): ModalState {
	switch (action.type) {
		case 'SET_SELECTED_MAIN_TAB':
			return { ...state, selectedMainTab: action.payload }

		case 'SET_SELECTED_CHART_TAB':
			return { ...state, selectedChartTab: action.payload }

		case 'SET_CHART_MODE':
			return { ...state, chartMode: action.payload }

		case 'SET_COMPOSER_ITEMS':
			return {
				...state,
				composerItems: typeof action.payload === 'function' ? action.payload(state.composerItems) : action.payload
			}

		case 'SET_SELECTED_CHAIN':
			return { ...state, selectedChain: action.payload }

		case 'SET_SELECTED_CHAINS':
			return { ...state, selectedChains: action.payload }

		case 'SET_SELECTED_PROTOCOL':
			return { ...state, selectedProtocol: action.payload }

		case 'SET_SELECTED_PROTOCOLS':
			return { ...state, selectedProtocols: action.payload }

		case 'SET_SELECTED_CHART_TYPE':
			return { ...state, selectedChartType: action.payload }

		case 'SET_SELECTED_CHART_TYPES':
			return { ...state, selectedChartTypes: action.payload }

		case 'SET_UNIFIED_CHART_NAME':
			return { ...state, unifiedChartName: action.payload }

		case 'SET_CHART_CREATION_MODE':
			return { ...state, chartCreationMode: action.payload }

		case 'SET_TEXT_TITLE':
			return { ...state, textTitle: action.payload }

		case 'SET_TEXT_CONTENT':
			return { ...state, textContent: action.payload }

		case 'SET_SELECTED_TABLE_TYPE':
			return { ...state, selectedTableType: action.payload }

		case 'SET_SELECTED_DATASET_CHAIN':
			return { ...state, selectedDatasetChain: action.payload }

		case 'SET_SELECTED_DATASET_TIMEFRAME':
			return { ...state, selectedDatasetTimeframe: action.payload }

		case 'SET_SELECTED_TOKENS':
			return { ...state, selectedTokens: action.payload }

		case 'SET_INCLUDE_CEX':
			return { ...state, includeCex: action.payload }

		case 'SET_CHART_BUILDER_NAME':
			return { ...state, chartBuilderName: action.payload }

		case 'SET_CHART_BUILDER':
			return {
				...state,
				chartBuilder: typeof action.payload === 'function' ? action.payload(state.chartBuilder) : action.payload
			}

		case 'SET_METRIC_SUBJECT_TYPE':
			return { ...state, metricSubjectType: action.payload }

		case 'SET_METRIC_CHAIN':
			return { ...state, metricChain: action.payload }

		case 'SET_METRIC_PROTOCOL':
			return { ...state, metricProtocol: action.payload }

		case 'SET_METRIC_TYPE':
			return {
				...state,
				metricType: action.payload,
				metricAggregator: getDefaultAggregator(action.payload)
			}

		case 'SET_METRIC_AGGREGATOR':
			return { ...state, metricAggregator: action.payload }

		case 'SET_METRIC_WINDOW':
			return { ...state, metricWindow: action.payload }

		case 'SET_METRIC_LABEL':
			return { ...state, metricLabel: action.payload }

		case 'SET_METRIC_SHOW_SPARKLINE':
			return { ...state, metricShowSparkline: action.payload }

		case 'SET_SELECTED_YIELD_POOL':
			return { ...state, selectedYieldPool: action.payload }

		case 'SET_SELECTED_YIELD_CHART_TYPE':
			return { ...state, selectedYieldChartType: action.payload }

		case 'SET_SELECTED_YIELD_CHAINS':
			return { ...state, selectedYieldChains: action.payload }

		case 'SET_SELECTED_YIELD_PROJECTS':
			return { ...state, selectedYieldProjects: action.payload }

		case 'SET_SELECTED_YIELD_CATEGORIES':
			return { ...state, selectedYieldCategories: action.payload }

		case 'SET_SELECTED_YIELD_TOKENS':
			return { ...state, selectedYieldTokens: action.payload }

		case 'SET_MIN_TVL':
			return { ...state, minTvl: action.payload }

		case 'SET_MAX_TVL':
			return { ...state, maxTvl: action.payload }

		case 'SET_SELECTED_STABLECOIN_CHAIN':
			return { ...state, selectedStablecoinChain: action.payload }

		case 'SET_SELECTED_STABLECOIN_CHART_TYPE':
			return { ...state, selectedStablecoinChartType: action.payload }

		case 'SET_STABLECOIN_MODE':
			return { ...state, stablecoinMode: action.payload }

		case 'SET_SELECTED_STABLECOIN_ASSET':
			return { ...state, selectedStablecoinAsset: action.payload }

		case 'SET_SELECTED_STABLECOIN_ASSET_ID':
			return { ...state, selectedStablecoinAssetId: action.payload }

		case 'SET_SELECTED_STABLECOIN_ASSET_CHART_TYPE':
			return { ...state, selectedStablecoinAssetChartType: action.payload }

		case 'SET_SELECTED_ADVANCED_TVL_PROTOCOL':
			return { ...state, selectedAdvancedTvlProtocol: action.payload }

		case 'SET_SELECTED_ADVANCED_TVL_PROTOCOL_NAME':
			return { ...state, selectedAdvancedTvlProtocolName: action.payload }

		case 'SET_SELECTED_ADVANCED_TVL_CHART_TYPE':
			return { ...state, selectedAdvancedTvlChartType: action.payload }

		case 'SET_SELECTED_BORROWED_PROTOCOL':
			return { ...state, selectedBorrowedProtocol: action.payload }

		case 'SET_SELECTED_BORROWED_PROTOCOL_NAME':
			return { ...state, selectedBorrowedProtocolName: action.payload }

		case 'SET_SELECTED_BORROWED_CHART_TYPE':
			return { ...state, selectedBorrowedChartType: action.payload }

		case 'RESET_STATE':
			return INITIAL_MODAL_STATE

		case 'INITIALIZE_FROM_EDIT_ITEM':
			return initializeFromEditItem(action.payload.editItem)

		default:
			return state
	}
}
