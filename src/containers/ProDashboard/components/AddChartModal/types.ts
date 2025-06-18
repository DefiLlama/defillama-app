import { DashboardItemConfig, ChartConfig } from '../../types'

export interface AddChartModalProps {
	isOpen: boolean
	onClose: () => void
	editItem?: DashboardItemConfig | null
}

export type MainTabType = 'chart' | 'composer' | 'table' | 'text'
export type ChartTabType = 'chain' | 'protocol'
export type CombinedTableType = 'protocols' | 'cex' | 'stablecoins' | 'revenue' | 'holders-revenue' | 'earnings'

export interface ModalState {
	selectedMainTab: MainTabType
	selectedChartTab: ChartTabType
	composerItems: ChartConfig[]
	composerSubType: ChartTabType
	composerChartName: string
	composerScript: string
	selectedChain: string | null
	selectedChains: string[]
	selectedProtocol: string | null
	selectedChartType: string
	textTitle: string
	textContent: string
	selectedTableType: CombinedTableType
	selectedDatasetChain: string | null
}

export interface ModalActions {
	setSelectedMainTab: (tab: MainTabType) => void
	setSelectedChartTab: (tab: ChartTabType) => void
	setComposerItems: React.Dispatch<React.SetStateAction<ChartConfig[]>>
	setComposerSubType: (type: ChartTabType) => void
	setComposerChartName: (name: string) => void
	setComposerScript: (script: string) => void
	setSelectedChain: (chain: string | null) => void
	setSelectedChains: (chains: string[]) => void
	setSelectedProtocol: (protocol: string | null) => void
	setSelectedChartType: (type: string) => void
	setTextTitle: (title: string) => void
	setTextContent: (content: string) => void
	setSelectedTableType: (type: CombinedTableType) => void
	setSelectedDatasetChain: (chain: string | null) => void
	handleChainChange: (option: any) => void
	handleChainsChange: (options: any[]) => void
	handleProtocolChange: (option: any) => void
	handleDatasetChainChange: (option: any) => void
	handleAddToComposer: () => void
	handleRemoveFromComposer: (id: string) => void
	handleMainTabChange: (tab: MainTabType) => void
	handleSubmit: () => void
	handleChartTabChange: (tab: ChartTabType) => void
	handleComposerSubTypeChange: (type: ChartTabType) => void
}
