import { ChartBuilderTab } from './ChartBuilderTab'
import { ChartModeType, ChartTabType } from './types'
import { UnifiedChartTab } from './UnifiedChartTab'

interface ChartTabProps {
	chartMode: ChartModeType
	onChartModeChange: (mode: ChartModeType) => void
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedProtocol: string | null
	selectedChartTypes: string[]
	selectedChains: string[]
	selectedProtocols: string[]
	selectedYieldPool?: { configID: string; name: string; project: string; chain: string } | null
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	availableChartTypes: string[]
	chartTypesLoading: boolean
	protocolsLoading: boolean
	unifiedChartName: string
	chartCreationMode: 'separate' | 'combined'
	composerItems: any[]
	onChartTabChange: (tab: ChartTabType) => void
	onChainChange: (option: any) => void
	onProtocolChange: (option: any) => void
	onChartTypesChange: (types: string[]) => void
	onSelectedChainsChange?: (chains: string[]) => void
	onSelectedProtocolsChange?: (protocols: string[]) => void
	onSelectedYieldPoolChange?: (pool: { configID: string; name: string; project: string; chain: string } | null) => void
	selectedYieldChains?: string[]
	selectedYieldProjects?: string[]
	selectedYieldCategories?: string[]
	minTvl?: number | null
	maxTvl?: number | null
	onSelectedYieldChainsChange?: (chains: string[]) => void
	onSelectedYieldProjectsChange?: (projects: string[]) => void
	onSelectedYieldCategoriesChange?: (categories: string[]) => void
	onMinTvlChange?: (tvl: number | null) => void
	onMaxTvlChange?: (tvl: number | null) => void
	onUnifiedChartNameChange: (name: string) => void
	onChartCreationModeChange: (mode: 'separate' | 'combined') => void
	onAddToComposer: (types?: string[]) => void
	onRemoveFromComposer: (id: string) => void
	chartBuilder: any
	chartBuilderName: string
	onChartBuilderChange: (updates: any) => void
	onChartBuilderNameChange: (name: string) => void
	timePeriod: any
}

export function ChartTab(props: ChartTabProps) {
	const { chartMode, onChartModeChange } = props

	return (
		<div className="flex h-full flex-col">
			<div className="mb-2 flex gap-0">
				<button
					onClick={() => onChartModeChange('builder')}
					className={`-ml-px flex-1 rounded-none border px-3 py-2 text-sm font-medium transition-colors first:ml-0 first:rounded-l-md last:rounded-r-md ${
						chartMode === 'builder' ? 'pro-border pro-btn-blue' : 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
					}`}
				>
					Builder
				</button>
				<button
					onClick={() => onChartModeChange('manual')}
					className={`-ml-px flex-1 rounded-none border px-3 py-2 text-sm font-medium transition-colors first:ml-0 first:rounded-l-md last:rounded-r-md ${
						chartMode === 'manual' ? 'pro-border pro-btn-blue' : 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
					}`}
				>
					Manual
				</button>
			</div>

			{chartMode === 'builder' ? (
				<ChartBuilderTab
					chartBuilder={props.chartBuilder}
					chartBuilderName={props.chartBuilderName}
					chainOptions={props.chainOptions}
					protocolOptions={props.protocolOptions}
					protocolsLoading={props.protocolsLoading}
					onChartBuilderChange={props.onChartBuilderChange}
					onChartBuilderNameChange={props.onChartBuilderNameChange}
					timePeriod={props.timePeriod}
				/>
			) : (
				<UnifiedChartTab
					selectedChartTab={props.selectedChartTab}
					selectedChain={props.selectedChain}
					selectedProtocol={props.selectedProtocol}
					selectedChartTypes={props.selectedChartTypes}
					selectedChains={props.selectedChains}
					selectedProtocols={props.selectedProtocols}
					selectedYieldPool={props.selectedYieldPool}
					chainOptions={props.chainOptions}
					protocolOptions={props.protocolOptions}
					availableChartTypes={props.availableChartTypes}
					chartTypesLoading={props.chartTypesLoading}
					protocolsLoading={props.protocolsLoading}
					unifiedChartName={props.unifiedChartName}
					chartCreationMode={props.chartCreationMode}
					composerItems={props.composerItems}
					onChartTabChange={props.onChartTabChange}
					onChainChange={props.onChainChange}
					onProtocolChange={props.onProtocolChange}
					onChartTypesChange={props.onChartTypesChange}
					onSelectedChainsChange={props.onSelectedChainsChange}
					onSelectedProtocolsChange={props.onSelectedProtocolsChange}
					onSelectedYieldPoolChange={props.onSelectedYieldPoolChange}
					selectedYieldChains={props.selectedYieldChains}
					selectedYieldProjects={props.selectedYieldProjects}
					selectedYieldCategories={props.selectedYieldCategories}
					minTvl={props.minTvl}
					maxTvl={props.maxTvl}
					onSelectedYieldChainsChange={props.onSelectedYieldChainsChange}
					onSelectedYieldProjectsChange={props.onSelectedYieldProjectsChange}
					onSelectedYieldCategoriesChange={props.onSelectedYieldCategoriesChange}
					onMinTvlChange={props.onMinTvlChange}
					onMaxTvlChange={props.onMaxTvlChange}
					onUnifiedChartNameChange={props.onUnifiedChartNameChange}
					onChartCreationModeChange={props.onChartCreationModeChange}
					onAddToComposer={props.onAddToComposer}
					onRemoveFromComposer={props.onRemoveFromComposer}
				/>
			)}
		</div>
	)
}
