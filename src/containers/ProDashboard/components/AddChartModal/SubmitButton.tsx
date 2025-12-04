import { ChartConfig, DashboardItemConfig } from '../../types'
import { ChartBuilderConfig, ChartModeType, ChartTabType, CombinedTableType, MainTabType } from './types'

interface SubmitButtonProps {
	editItem?: DashboardItemConfig | null
	selectedMainTab: MainTabType
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedChains: string[]
	selectedProtocol: string | null
	selectedChartTypes?: string[]
	selectedYieldPool?: { configID: string; name: string; project: string; chain: string } | null
	composerItems: ChartConfig[]
	textContent: string
	chartTypesLoading: boolean
	selectedTableType?: CombinedTableType
	selectedDatasetChain?: string | null
	selectedTokens?: string[]
	chartBuilder?: ChartBuilderConfig
	chartCreationMode?: 'separate' | 'combined'
	chartMode?: ChartModeType
	metricSubjectType?: 'chain' | 'protocol'
	metricChain?: string | null
	metricProtocol?: string | null
	metricType?: string
	selectedStablecoinChain?: string
	selectedStablecoinChartType?: string
	onSubmit: () => void
}

export function SubmitButton({
	editItem,
	selectedMainTab,
	selectedChartTab,
	selectedChain,
	selectedChains = [],
	selectedProtocol,
	selectedChartTypes = [],
	selectedYieldPool,
	composerItems,
	textContent,
	chartTypesLoading,
	selectedTableType = 'protocols',
	selectedDatasetChain,
	selectedTokens = [],
	chartBuilder,
	chartCreationMode = 'separate',
	chartMode = 'manual',
	metricSubjectType,
	metricChain,
	metricProtocol,
	metricType,
	selectedStablecoinChain,
	selectedStablecoinChartType,
	onSubmit
}: SubmitButtonProps) {
	const isDisabled =
		chartTypesLoading ||
		(selectedMainTab === 'charts' && chartMode === 'manual' && selectedChartTab === 'yields' && !selectedYieldPool) ||
		(selectedMainTab === 'charts' &&
			chartMode === 'manual' &&
			selectedChartTab === 'stablecoins' &&
			(!selectedStablecoinChain || !selectedStablecoinChartType)) ||
		(selectedMainTab === 'charts' &&
			chartMode === 'manual' &&
			selectedChartTab !== 'yields' &&
			selectedChartTab !== 'stablecoins' &&
			composerItems.length === 0) ||
		(selectedMainTab === 'charts' && chartMode === 'builder' && !chartBuilder?.metric) ||
		(selectedMainTab === 'table' &&
			selectedTableType === 'protocols' &&
			(!selectedChains || selectedChains.length === 0)) ||
		(selectedMainTab === 'table' && selectedTableType === 'stablecoins' && !selectedDatasetChain) ||
		(selectedMainTab === 'table' && selectedTableType === 'trending-contracts' && !selectedDatasetChain) ||
		(selectedMainTab === 'table' &&
			selectedTableType === 'token-usage' &&
			(!selectedTokens || selectedTokens.length === 0)) ||
		(selectedMainTab === 'text' && !textContent.trim()) ||
		(selectedMainTab === 'metric' &&
			(!metricType ||
				(metricSubjectType === 'chain' && !metricChain) ||
				(metricSubjectType === 'protocol' && !metricProtocol)))

	const getButtonText = () => {
		if (editItem) return 'Save Changes'

		switch (selectedMainTab) {
			case 'table':
				return 'Add Table'
			case 'metric':
				return 'Add Metric'
			case 'charts':
				if (chartMode === 'builder') {
					return 'Add Chart'
				}
				if (selectedChartTab === 'yields' || selectedChartTab === 'stablecoins') {
					return 'Add Chart'
				}
				if (chartCreationMode === 'combined') {
					return 'Add Multi-Chart'
				} else if (composerItems.length > 1) {
					return `Add ${composerItems.length} Charts`
				} else if (composerItems.length === 1) {
					return 'Add Chart'
				} else if (selectedChartTypes.length > 1) {
					return `Add ${selectedChartTypes.length} Charts`
				}
				return 'Add Chart'
			case 'text':
				return 'Add Text'
			default:
				return 'Add Chart'
		}
	}

	return (
		<div className="pro-border mt-2 flex justify-end border-t pt-2">
			<button
				className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 md:px-4 md:py-2 md:text-sm ${
					isDisabled ? 'pro-border pro-text3 cursor-not-allowed border opacity-50' : 'pro-btn-blue'
				}`}
				onClick={onSubmit}
				disabled={isDisabled}
			>
				{getButtonText()}
			</button>
		</div>
	)
}
