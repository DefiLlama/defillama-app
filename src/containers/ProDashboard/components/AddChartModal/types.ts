import { ChartConfig, DashboardItemConfig } from '../../types'

export interface AddChartModalProps {
	isOpen: boolean
	onClose: () => void
	editItem?: DashboardItemConfig | null
}

export type MainTabType = 'charts' | 'table' | 'text' | 'builder'
export type ChartTabType = 'chain' | 'protocol'
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
		| 'options-notional'
		| 'options-premium'
		| 'bridge-aggregators'
		| 'dex-aggregators'
		| 'perps-aggregators'
		| 'user-fees'
		| 'holders-revenue'
		| 'protocol-revenue'
		| 'supply-side-revenue'
	mode: 'chains' | 'protocol'
	filterMode?: 'include' | 'exclude'
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

export interface ModalState {
	selectedMainTab: MainTabType
	selectedChartTab: ChartTabType
	composerItems: ChartConfig[]
	selectedChain: string | null
	selectedChains: string[]
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
}

export interface ModalActions {
	setSelectedMainTab: (tab: MainTabType) => void
	setSelectedChartTab: (tab: ChartTabType) => void
	setComposerItems: React.Dispatch<React.SetStateAction<ChartConfig[]>>
	setSelectedChain: (chain: string | null) => void
	setSelectedChains: (chains: string[]) => void // New action for multi-chain selection
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
	handleChainsChange: (options: any[]) => void // New handler for multi-chain selection
	handleProtocolChange: (option: any) => void
	handleDatasetChainChange: (option: any) => void
	handleTokensChange: (options: any) => void
	handleAddToComposer: (typesToAdd?: string[]) => void
	handleRemoveFromComposer: (id: string) => void
	handleMainTabChange: (tab: MainTabType) => void
	handleSubmit: () => void
	handleChartTabChange: (tab: ChartTabType) => void
	setChartBuilder: React.Dispatch<React.SetStateAction<ChartBuilderConfig>>
	updateChartBuilder: (updates: Partial<ChartBuilderConfig>) => void
}
