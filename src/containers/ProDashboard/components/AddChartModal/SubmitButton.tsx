import { MainTabType, ChartTabType, CombinedTableType } from './types'
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
	onSubmit: () => void
	selectedTab?: 'charts' | 'script'
	script?: string
	composerChartName?: string
	onAddLlamaScriptChart?: (chart: { id: string; name: string; llamascript: string }) => void
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
	onSubmit,
	selectedTab = 'charts',
	script = '',
	composerChartName = '',
	onAddLlamaScriptChart,
	selectedTokens = []
}: SubmitButtonProps) {
	const isComposerScriptValid = selectedTab === 'script' && script.trim() && composerChartName.trim()
	const isComposerChartsValid = selectedTab === 'charts' && composerItems.length > 0

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
		(selectedMainTab === 'table' &&
			selectedTableType === 'token-usage' &&
			(!selectedTokens || selectedTokens.length === 0)) ||
		(selectedMainTab === 'composer' && !(isComposerChartsValid || isComposerScriptValid)) ||
		(selectedMainTab === 'text' && !textContent.trim())

	const getButtonText = () => {
		if (editItem) return 'Save Changes'

		switch (selectedMainTab) {
			case 'table':
				return 'Add Table'
			case 'composer':
				if (selectedTab === 'script') return 'Add Script Chart'
				return 'Add Multi-Chart'
			case 'text':
				return 'Add Text'
			case 'chart':
				if (selectedChartTypes.length > 1) {
					return `Add ${selectedChartTypes.length} Charts`
				}
				return 'Add Chart'
			default:
				return 'Add Chart'
		}
	}

	const handleClick = () => {
		if (!editItem && selectedMainTab === 'composer') {
			if (selectedTab === 'script' && isComposerScriptValid && onAddLlamaScriptChart) {
				const id = `llamascript-${Date.now()}`
				onAddLlamaScriptChart({ id, name: composerChartName || 'LlamaScript Chart', llamascript: script })
				return
			}
		}
		onSubmit()
	}

	return (
		<div className="flex justify-end mt-5 md:mt-7">
			<button
				className="px-4 py-2.5 md:px-6 md:py-3 bg-[var(--primary1)] text-white font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm md:text-base"
				onClick={handleClick}
				disabled={isDisabled}
			>
				{getButtonText()}
			</button>
		</div>
	)
}
