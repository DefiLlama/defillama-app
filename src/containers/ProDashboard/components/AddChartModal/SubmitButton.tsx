import { MainTabType, ChartTabType, CombinedTableType, ChartBuilderConfig } from './types'
import { DashboardItemConfig, ChartConfig } from '../../types'

interface SubmitButtonProps {
	editItem?: DashboardItemConfig | null
	selectedMainTab: MainTabType
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedChains: string[]
	selectedProtocol: string | null
	selectedChartTypes?: string[]
	composerItems: ChartConfig[]
	textContent: string
	chartTypesLoading: boolean
	selectedTableType?: CombinedTableType
	selectedDatasetChain?: string | null
	selectedTokens?: string[]
	chartBuilder?: ChartBuilderConfig
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
	composerItems,
	textContent,
	chartTypesLoading,
	selectedTableType = 'protocols',
	selectedDatasetChain,
	selectedTokens = [],
	chartBuilder,
	onSubmit
}: SubmitButtonProps) {
	const isDisabled =
		chartTypesLoading ||
		(selectedMainTab === 'chart' &&
			selectedChartTab === 'chain' &&
			(!selectedChain || selectedChartTypes.length === 0)) ||
		(selectedMainTab === 'chart' &&
			selectedChartTab === 'protocol' &&
			(!selectedProtocol || selectedChartTypes.length === 0)) ||
		(selectedMainTab === 'table' &&
			selectedTableType === 'protocols' &&
			(!selectedChains || selectedChains.length === 0)) ||
		(selectedMainTab === 'table' && selectedTableType === 'stablecoins' && !selectedDatasetChain) ||
		(selectedMainTab === 'table' && selectedTableType === 'trending-contracts' && !selectedDatasetChain) ||
		(selectedMainTab === 'table' &&
			selectedTableType === 'token-usage' &&
			(!selectedTokens || selectedTokens.length === 0)) ||
		(selectedMainTab === 'composer' && composerItems.length === 0) ||
		(selectedMainTab === 'text' && !textContent.trim()) ||
		(selectedMainTab === 'builder' && (!chartBuilder || chartBuilder.chains.length === 0))

	const getButtonText = () => {
		if (editItem) return 'Save Changes'

		switch (selectedMainTab) {
			case 'table':
				return 'Add Table'
			case 'composer':
				return 'Add Multi-Chart'
			case 'text':
				return 'Add Text'
			case 'builder':
				return 'Add Chart'
			case 'chart':
				if (selectedChartTypes.length > 1) {
					return `Add ${selectedChartTypes.length} Charts`
				}
				return 'Add Chart'
			default:
				return 'Add Chart'
		}
	}

	return (
		<div className="flex justify-end mt-5 md:mt-7">
			<button
				className="px-4 py-2.5 md:px-6 md:py-3 bg-(--primary) text-white font-medium hover:bg-(--primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm md:text-base"
				onClick={onSubmit}
				disabled={isDisabled}
			>
				{getButtonText()}
			</button>
		</div>
	)
}
