import { MainTabType, ChartTabType } from './types'
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
	onSubmit
}: SubmitButtonProps) {
	const isDisabled = 
		chartTypesLoading ||
		(selectedMainTab === 'chart' && selectedChartTab === 'chain' && !selectedChain) ||
		(selectedMainTab === 'chart' && selectedChartTab === 'protocol' && !selectedProtocol) ||
		(selectedMainTab === 'table' && (!selectedChains || selectedChains.length === 0)) ||
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
		<div className="flex justify-end mt-7">
			<button
				className="px-6 py-3 bg-[var(--primary1)] text-white font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
				onClick={onSubmit}
				disabled={isDisabled}
			>
				{getButtonText()}
			</button>
		</div>
	)
}