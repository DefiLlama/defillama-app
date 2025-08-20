import { ChartConfig, DashboardItemConfig } from '../../types'
import { ChartBuilderConfig, ChartTabType, CombinedTableType, MainTabType } from './types'

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
		<div className="mt-5 flex justify-end md:mt-7">
			<button
				className="bg-(--primary) px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50 md:px-6 md:py-3 md:text-base"
				onClick={onSubmit}
				disabled={isDisabled}
			>
				{getButtonText()}
			</button>
		</div>
	)
}
