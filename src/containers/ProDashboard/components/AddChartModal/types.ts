import { ChartConfig, DashboardItemConfig, MetricAggregator } from '../../types'

export interface AddChartModalProps {
	isOpen: boolean
	onClose: () => void
	editItem?: DashboardItemConfig | null
}

export type MainTabType = 'charts' | 'metric' | 'table' | 'unified-table' | 'text' | 'builder'
export type ChartModeType = 'manual' | 'builder'
export type ChartTabType = 'chain' | 'protocol' | 'yields'
export type CombinedTableType =
	| 'protocols'
	| 'cex'
	| 'stablecoins'
	| 'revenue'
	| 'holders-revenue'
	| 'earnings'
	| 'fees'
	| 'token-usage'
	| 'yields'
	| 'aggregators'
	| 'perps'
	| 'options'
	| 'dexs'
	| 'bridge-aggregators'
	| 'trending-contracts'
	| 'chains'

export interface ChartBuilderConfig {
	metric:
		| 'tvl'
		| 'fees'
		| 'revenue'
		| 'volume'
		| 'perps'
		| 'open-interest'
		| 'options-notional'
		| 'options-premium'
		| 'bridge-aggregators'
		| 'dex-aggregators'
		| 'perps-aggregators'
		| 'user-fees'
		| 'holders-revenue'
		| 'protocol-revenue'
		| 'supply-side-revenue'
		| 'stablecoins'
		| 'chain-fees'
		| 'chain-revenue'
	mode: 'chains' | 'protocol'
	filterMode?: 'include' | 'exclude'
	protocol?: string
	chains: string[]
	chainCategories?: string[]
	categories: string[]
	groupBy: 'protocol'
	limit: number
	chartType: 'stackedBar' | 'stackedArea' | 'line'
	displayAs: 'timeSeries' | 'percentage'
	hideOthers?: boolean
	groupByParent?: boolean
	additionalFilters?: Record<string, any>
	seriesColors?: Record<string, string>
}

export interface ModalState {
	selectedMainTab: MainTabType
	selectedChartTab: ChartTabType
	chartMode: ChartModeType
	composerItems: ChartConfig[]
	selectedChain: string | null
	selectedChains: string[]
	selectedProtocols: string[]
	selectedProtocol: string | null
	selectedChartType: string
	selectedChartTypes: string[]
	unifiedChartName: string
	chartCreationMode: 'separate' | 'combined'
	textTitle: string
	textContent: string
	selectedTableType: CombinedTableType
	selectedDatasetChain: string | null
	selectedDatasetTimeframe: string | null
	selectedTokens: string[]
	includeCex: boolean
	chartBuilderName: string
	chartBuilder: ChartBuilderConfig
	metricSubjectType: 'chain' | 'protocol'
	metricChain: string | null
	metricProtocol: string | null
	metricType: string
	metricAggregator: MetricAggregator
	metricWindow: '7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all'
	metricLabel: string
	metricShowSparkline: boolean
	selectedYieldPool: { configID: string; name: string; project: string; chain: string } | null
	selectedYieldChains: string[]
	selectedYieldProjects: string[]
	selectedYieldCategories: string[]
	selectedYieldTokens: string[]
	minTvl: number | null
	maxTvl: number | null
}

export interface ModalActions {
	setSelectedMainTab: (tab: MainTabType) => void
	setSelectedChartTab: (tab: ChartTabType) => void
	setChartMode: (mode: ChartModeType) => void
	setComposerItems: React.Dispatch<React.SetStateAction<ChartConfig[]>>
	setSelectedChain: (chain: string | null) => void
	setSelectedChains: (chains: string[]) => void // New action for multi-chain selection
	setSelectedProtocols: (protocols: string[]) => void
	setSelectedProtocol: (protocol: string | null) => void
	setSelectedChartType: (type: string) => void
	setSelectedChartTypes: (types: string[]) => void
	setUnifiedChartName: (name: string) => void
	setChartCreationMode: (mode: 'separate' | 'combined') => void
	setTextTitle: (title: string) => void
	setTextContent: (content: string) => void
	setSelectedTableType: (type: CombinedTableType) => void
	setSelectedDatasetChain: (chain: string | null) => void
	setSelectedDatasetTimeframe: (timeframe: string | null) => void
	setSelectedTokens: (tokens: string[]) => void
	setIncludeCex: (include: boolean) => void
	setChartBuilderName: (name: string) => void
	handleChainChange: (option: any) => void
	handleChainsChange: (values: string[]) => void // New handler for multi-chain selection
	handleProtocolChange: (option: any) => void
	handleDatasetChainChange: (value: string | null) => void
	handleTokensChange: (tokens: string[]) => void
	handleAddToComposer: (typesToAdd?: string[]) => void
	handleRemoveFromComposer: (id: string) => void
	handleUpdateComposerItemColor: (id: string, color: string) => void
	handleMainTabChange: (tab: MainTabType) => void
	handleSubmit: () => void
	handleChartTabChange: (tab: ChartTabType) => void
	setChartBuilder: React.Dispatch<React.SetStateAction<ChartBuilderConfig>>
	updateChartBuilder: (updates: Partial<ChartBuilderConfig>) => void
	setMetricSubjectType: (t: 'chain' | 'protocol') => void
	setMetricChain: (v: string | null) => void
	setMetricProtocol: (v: string | null) => void
	setMetricType: (t: string) => void
	setMetricAggregator: (a: MetricAggregator) => void
	setMetricWindow: (w: '7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all') => void
	setMetricLabel: (s: string) => void
	setMetricShowSparkline: (v: boolean) => void
	setSelectedYieldPool: (pool: { configID: string; name: string; project: string; chain: string } | null) => void
	setSelectedYieldChains: (chains: string[]) => void
	setSelectedYieldProjects: (projects: string[]) => void
	setSelectedYieldCategories: (categories: string[]) => void
	setSelectedYieldTokens: (tokens: string[]) => void
	setMinTvl: (tvl: number | null) => void
	setMaxTvl: (tvl: number | null) => void
}
