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
	chartCreationMode?: 'separate' | 'combined'
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
	chartCreationMode = 'separate',
	onSubmit
}: SubmitButtonProps) {
	const isDisabled =
		chartTypesLoading ||
		(selectedMainTab === 'charts' && composerItems.length === 0) ||
		(selectedMainTab === 'table' &&
			selectedTableType === 'protocols' &&
			(!selectedChains || selectedChains.length === 0)) ||
		(selectedMainTab === 'table' && selectedTableType === 'stablecoins' && !selectedDatasetChain) ||
		(selectedMainTab === 'table' && selectedTableType === 'trending-contracts' && !selectedDatasetChain) ||
		(selectedMainTab === 'table' &&
			selectedTableType === 'token-usage' &&
			(!selectedTokens || selectedTokens.length === 0)) ||
		(selectedMainTab === 'text' && !textContent.trim()) ||
		(selectedMainTab === 'builder' &&
			(
				!chartBuilder ||
				(chartBuilder.mode === 'protocol' && !chartBuilder.protocol)
			))

	const getButtonText = () => {
		if (editItem) return 'Save Changes'

		switch (selectedMainTab) {
			case 'table':
				return 'Add Table'
			case 'charts':
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
			case 'builder':
				return 'Add Chart'
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
