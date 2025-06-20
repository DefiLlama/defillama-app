import { MainTabType, ChartTabType, CombinedTableType } from './types'
import { DashboardItemConfig, ChartConfig } from '../../types'

interface SubmitButtonProps {
	editItem?: DashboardItemConfig | null
	selectedMainTab: MainTabType
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedChains: string[]
	selectedProtocol: string | null
	composerItems: ChartConfig[]
	textContent: string
	chartTypesLoading: boolean
	selectedTableType?: CombinedTableType
	selectedDatasetChain?: string | null
	selectedTokens?: string[]
	onSubmit: () => void
}

export function SubmitButton({
	editItem,
	selectedMainTab,
	selectedChartTab,
	selectedChain,
	selectedChains = [],
	selectedProtocol,
	composerItems,
	textContent,
	chartTypesLoading,
	selectedTableType = 'protocols',
	selectedDatasetChain,
	selectedTokens = [],
	onSubmit
}: SubmitButtonProps) {
	const isDisabled = 
		chartTypesLoading ||
		(selectedMainTab === 'chart' && selectedChartTab === 'chain' && !selectedChain) ||
		(selectedMainTab === 'chart' && selectedChartTab === 'protocol' && !selectedProtocol) ||
		(selectedMainTab === 'table' && selectedTableType === 'protocols' && (!selectedChains || selectedChains.length === 0)) ||
		(selectedMainTab === 'table' && selectedTableType === 'stablecoins' && !selectedDatasetChain) ||
		(selectedMainTab === 'table' && selectedTableType === 'token-usage' && (!selectedTokens || selectedTokens.length === 0)) ||
		(selectedMainTab === 'composer' && composerItems.length === 0) ||
		(selectedMainTab === 'text' && !textContent.trim())

	const getButtonText = () => {
		if (editItem) return 'Save Changes'
		
		switch (selectedMainTab) {
			case 'table': return 'Add Table'
			case 'composer': return 'Add Multi-Chart'
			case 'text': return 'Add Text'
			default: return 'Add Chart'
		}
	}

	return (
		<div className="flex justify-end mt-5 md:mt-7">
			<button
				className="px-4 py-2.5 md:px-6 md:py-3 bg-[var(--primary1)] text-white font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm md:text-base"
				onClick={onSubmit}
				disabled={isDisabled}
			>
				{getButtonText()}
			</button>
		</div>
	)
}