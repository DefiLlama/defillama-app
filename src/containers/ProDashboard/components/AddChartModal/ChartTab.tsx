import { memo } from 'react'
import { Icon } from '~/components/Icon'
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
	selectedYieldTokens?: string[]
	minTvl?: number | null
	maxTvl?: number | null
	onSelectedYieldChainsChange?: (chains: string[]) => void
	onSelectedYieldProjectsChange?: (projects: string[]) => void
	onSelectedYieldCategoriesChange?: (categories: string[]) => void
	onSelectedYieldTokensChange?: (tokens: string[]) => void
	onMinTvlChange?: (tvl: number | null) => void
	onMaxTvlChange?: (tvl: number | null) => void
	selectedYieldChartType?: string
	onSelectedYieldChartTypeChange?: (chartType: string) => void
	selectedStablecoinChain?: string
	selectedStablecoinChartType?: string
	stablecoinMode?: 'chain' | 'asset'
	selectedStablecoinAsset?: string | null
	selectedStablecoinAssetId?: string | null
	selectedStablecoinAssetChartType?: string
	onSelectedStablecoinChainChange?: (chain: string) => void
	onSelectedStablecoinChartTypeChange?: (chartType: string) => void
	onStablecoinModeChange?: (mode: 'chain' | 'asset') => void
	onSelectedStablecoinAssetChange?: (asset: string | null) => void
	onSelectedStablecoinAssetIdChange?: (id: string | null) => void
	onSelectedStablecoinAssetChartTypeChange?: (chartType: string) => void
	selectedAdvancedTvlProtocol?: string | null
	selectedAdvancedTvlProtocolName?: string | null
	selectedAdvancedTvlChartType?: string
	onSelectedAdvancedTvlProtocolChange?: (protocol: string | null) => void
	onSelectedAdvancedTvlProtocolNameChange?: (name: string | null) => void
	onSelectedAdvancedTvlChartTypeChange?: (chartType: string) => void
	selectedBorrowedProtocol?: string | null
	selectedBorrowedProtocolName?: string | null
	selectedBorrowedChartType?: string
	onSelectedBorrowedProtocolChange?: (protocol: string | null) => void
	onSelectedBorrowedProtocolNameChange?: (name: string | null) => void
	onSelectedBorrowedChartTypeChange?: (chartType: string) => void
	onUnifiedChartNameChange: (name: string) => void
	onChartCreationModeChange: (mode: 'separate' | 'combined') => void
	onComposerItemColorChange: (id: string, color: string) => void
	onAddToComposer: (types?: string[]) => void
	onRemoveFromComposer: (id: string) => void
	chartBuilder: any
	chartBuilderName: string
	onChartBuilderChange: (updates: any) => void
	onChartBuilderNameChange: (name: string) => void
	timePeriod: any
	customTimePeriod?: any
}

export const ChartTab = memo(function ChartTab(props: ChartTabProps) {
	const { chartMode, onChartModeChange } = props

	return (
		<div className="flex h-full flex-col">
			<div className="mb-3 rounded-xl border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1 shadow-sm">
				<div className="grid grid-cols-2 gap-1">
					<button
						onClick={() => onChartModeChange('builder')}
						className={`group flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
							chartMode === 'builder'
								? 'bg-(--old-blue) text-white shadow-md ring-1 ring-black/10'
								: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary) hover:shadow-sm'
						}`}
					>
						<Icon
							name="pencil-ruler"
							width={15}
							height={15}
							className={chartMode === 'builder' ? 'text-white' : 'text-(--text-tertiary) group-hover:text-(--text-secondary)'}
						/>
						<span>Builder</span>
					</button>
					<button
						onClick={() => onChartModeChange('manual')}
						className={`group flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
							chartMode === 'manual'
								? 'bg-(--old-blue) text-white shadow-md ring-1 ring-black/10'
								: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary) hover:shadow-sm'
						}`}
					>
						<Icon
							name="layers"
							width={15}
							height={15}
							className={chartMode === 'manual' ? 'text-white' : 'text-(--text-tertiary) group-hover:text-(--text-secondary)'}
						/>
						<span>Manual</span>
					</button>
				</div>
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
					customTimePeriod={props.customTimePeriod}
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
					selectedYieldTokens={props.selectedYieldTokens}
					minTvl={props.minTvl}
					maxTvl={props.maxTvl}
					onSelectedYieldChainsChange={props.onSelectedYieldChainsChange}
					onSelectedYieldProjectsChange={props.onSelectedYieldProjectsChange}
					onSelectedYieldCategoriesChange={props.onSelectedYieldCategoriesChange}
					onSelectedYieldTokensChange={props.onSelectedYieldTokensChange}
					onMinTvlChange={props.onMinTvlChange}
					onMaxTvlChange={props.onMaxTvlChange}
					selectedYieldChartType={props.selectedYieldChartType}
					onSelectedYieldChartTypeChange={props.onSelectedYieldChartTypeChange}
					selectedStablecoinChain={props.selectedStablecoinChain}
					selectedStablecoinChartType={props.selectedStablecoinChartType}
					stablecoinMode={props.stablecoinMode}
					selectedStablecoinAsset={props.selectedStablecoinAsset}
					selectedStablecoinAssetId={props.selectedStablecoinAssetId}
					selectedStablecoinAssetChartType={props.selectedStablecoinAssetChartType}
					onSelectedStablecoinChainChange={props.onSelectedStablecoinChainChange}
					onSelectedStablecoinChartTypeChange={props.onSelectedStablecoinChartTypeChange}
					onStablecoinModeChange={props.onStablecoinModeChange}
					onSelectedStablecoinAssetChange={props.onSelectedStablecoinAssetChange}
					onSelectedStablecoinAssetIdChange={props.onSelectedStablecoinAssetIdChange}
					onSelectedStablecoinAssetChartTypeChange={props.onSelectedStablecoinAssetChartTypeChange}
					selectedAdvancedTvlProtocol={props.selectedAdvancedTvlProtocol}
					selectedAdvancedTvlProtocolName={props.selectedAdvancedTvlProtocolName}
					selectedAdvancedTvlChartType={props.selectedAdvancedTvlChartType}
					onSelectedAdvancedTvlProtocolChange={props.onSelectedAdvancedTvlProtocolChange}
					onSelectedAdvancedTvlProtocolNameChange={props.onSelectedAdvancedTvlProtocolNameChange}
					onSelectedAdvancedTvlChartTypeChange={props.onSelectedAdvancedTvlChartTypeChange}
					selectedBorrowedProtocol={props.selectedBorrowedProtocol}
					selectedBorrowedProtocolName={props.selectedBorrowedProtocolName}
					selectedBorrowedChartType={props.selectedBorrowedChartType}
					onSelectedBorrowedProtocolChange={props.onSelectedBorrowedProtocolChange}
					onSelectedBorrowedProtocolNameChange={props.onSelectedBorrowedProtocolNameChange}
					onSelectedBorrowedChartTypeChange={props.onSelectedBorrowedChartTypeChange}
					onUnifiedChartNameChange={props.onUnifiedChartNameChange}
					onChartCreationModeChange={props.onChartCreationModeChange}
					onComposerItemColorChange={props.onComposerItemColorChange}
					onAddToComposer={props.onAddToComposer}
					onRemoveFromComposer={props.onRemoveFromComposer}
				/>
			)}
		</div>
	)
})
