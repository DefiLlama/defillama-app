import * as Ariakit from '@ariakit/react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { ChartTab } from './ChartTab'
import { LlamaAITab } from './LlamaAITab'
import { MetricTab } from './MetricTab'
import { ModalHeader } from './ModalHeader'
import { SubmitButton } from './SubmitButton'
import { TabNavigation } from './TabNavigation'
import { TextTab } from './TextTab'
import { AddChartModalProps, CombinedTableType } from './types'
import { UnifiedTableTab } from './UnifiedTableTab'
import { useComposerItemsData } from './useComposerItemsData'
import { useModalActions } from './useModalActions'

export function AddChartModal({ isOpen, onClose, editItem, initialUnifiedFocusSection }: AddChartModalProps) {
	const { user } = useAuthContext()
	const { state, actions, computed } = useModalActions(editItem, isOpen, onClose)
	const isLlama = user?.flags?.['is_llama'] ?? false

	const getCurrentItemType = () => {
		if (state.selectedMainTab === 'charts') {
			return state.selectedChartTab
		} else {
			return 'chain'
		}
	}

	const availableChartTypes: string[] = []
	const chartTypesLoading = false

	const composerItemsWithData = useComposerItemsData(state.composerItems, computed.timePeriod)

	const primaryTableTypes: CombinedTableType[] = [
		'protocols',
		'stablecoins',
		'cex',
		'token-usage',
		'yields',
		'trending-contracts',
		'chains'
	]
	const legacyTableTypes = primaryTableTypes.includes(state.selectedTableType) ? [] : [state.selectedTableType]

	return (
		<Ariakit.DialogProvider
			open={isOpen}
			setOpen={(open) => {
				if (!open) onClose()
			}}
		>
			<Ariakit.Dialog
				className="pro-dashboard add-chart-dialog animate-slidein thin-scrollbar fixed top-0 right-0 bottom-0 z-50 flex h-full w-full max-w-6xl flex-col gap-3 overflow-hidden border-l border-(--cards-border) bg-(--cards-bg) p-3 shadow-xl md:p-4"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<ModalHeader editItem={editItem} />

				<TabNavigation
					selectedMainTab={state.selectedMainTab}
					editItem={editItem}
					onTabChange={actions.handleMainTabChange}
					isLlama={isLlama}
				/>

				<div className="-mx-4 flex flex-1 flex-col overflow-y-auto px-4 md:mx-0 md:px-0">
					{state.selectedMainTab === 'charts' && (
						<ChartTab
							chartMode={state.chartMode}
							onChartModeChange={actions.setChartMode}
							selectedChartTab={state.selectedChartTab}
							selectedChain={state.selectedChain}
							selectedProtocol={state.selectedProtocol}
							selectedChartTypes={state.selectedChartTypes}
							selectedChains={state.selectedChains}
							selectedProtocols={state.selectedProtocols}
							selectedYieldPool={state.selectedYieldPool}
							chainOptions={computed.chainOptions}
							protocolOptions={computed.protocolOptions}
							availableChartTypes={availableChartTypes}
							chartTypesLoading={chartTypesLoading}
							protocolsLoading={computed.protocolsLoading}
							unifiedChartName={state.unifiedChartName}
							chartCreationMode={state.chartCreationMode}
							composerItems={composerItemsWithData}
							onChartTabChange={actions.handleChartTabChange}
							onChainChange={actions.handleChainChange}
							onProtocolChange={actions.handleProtocolChange}
							onChartTypesChange={actions.setSelectedChartTypes}
							onSelectedChainsChange={actions.setSelectedChains}
							onSelectedProtocolsChange={actions.setSelectedProtocols}
							onSelectedYieldPoolChange={actions.setSelectedYieldPool}
							selectedYieldChains={state.selectedYieldChains}
							selectedYieldProjects={state.selectedYieldProjects}
							selectedYieldCategories={state.selectedYieldCategories}
							selectedYieldTokens={state.selectedYieldTokens}
							minTvl={state.minTvl}
							maxTvl={state.maxTvl}
							onSelectedYieldChainsChange={actions.setSelectedYieldChains}
							onSelectedYieldProjectsChange={actions.setSelectedYieldProjects}
							onSelectedYieldCategoriesChange={actions.setSelectedYieldCategories}
							onSelectedYieldTokensChange={actions.setSelectedYieldTokens}
							onMinTvlChange={actions.setMinTvl}
							onMaxTvlChange={actions.setMaxTvl}
							selectedYieldChartType={state.selectedYieldChartType}
							onSelectedYieldChartTypeChange={actions.setSelectedYieldChartType}
							selectedStablecoinChain={state.selectedStablecoinChain}
							selectedStablecoinChartType={state.selectedStablecoinChartType}
							stablecoinMode={state.stablecoinMode}
							selectedStablecoinAsset={state.selectedStablecoinAsset}
							selectedStablecoinAssetId={state.selectedStablecoinAssetId}
							selectedStablecoinAssetChartType={state.selectedStablecoinAssetChartType}
							onSelectedStablecoinChainChange={actions.setSelectedStablecoinChain}
							onSelectedStablecoinChartTypeChange={actions.setSelectedStablecoinChartType}
							onStablecoinModeChange={actions.setStablecoinMode}
							onSelectedStablecoinAssetChange={actions.setSelectedStablecoinAsset}
							onSelectedStablecoinAssetIdChange={actions.setSelectedStablecoinAssetId}
							onSelectedStablecoinAssetChartTypeChange={actions.setSelectedStablecoinAssetChartType}
							selectedAdvancedTvlProtocol={state.selectedAdvancedTvlProtocol}
							selectedAdvancedTvlProtocolName={state.selectedAdvancedTvlProtocolName}
							selectedAdvancedTvlChartType={state.selectedAdvancedTvlChartType}
							onSelectedAdvancedTvlProtocolChange={actions.setSelectedAdvancedTvlProtocol}
							onSelectedAdvancedTvlProtocolNameChange={actions.setSelectedAdvancedTvlProtocolName}
							onSelectedAdvancedTvlChartTypeChange={actions.setSelectedAdvancedTvlChartType}
							selectedBorrowedProtocol={state.selectedBorrowedProtocol}
							selectedBorrowedProtocolName={state.selectedBorrowedProtocolName}
							selectedBorrowedChartType={state.selectedBorrowedChartType}
							onSelectedBorrowedProtocolChange={actions.setSelectedBorrowedProtocol}
							onSelectedBorrowedProtocolNameChange={actions.setSelectedBorrowedProtocolName}
							onSelectedBorrowedChartTypeChange={actions.setSelectedBorrowedChartType}
							onUnifiedChartNameChange={actions.setUnifiedChartName}
							onChartCreationModeChange={actions.setChartCreationMode}
							onComposerItemColorChange={actions.handleUpdateComposerItemColor}
							onAddToComposer={actions.handleAddToComposer}
							onRemoveFromComposer={actions.handleRemoveFromComposer}
							chartBuilder={state.chartBuilder}
							chartBuilderName={state.chartBuilderName}
							onChartBuilderChange={actions.updateChartBuilder}
							onChartBuilderNameChange={actions.setChartBuilderName}
							timePeriod={computed.timePeriod}
							customTimePeriod={computed.customTimePeriod}
						/>
					)}

					{state.selectedMainTab === 'metric' && (
						<MetricTab
							metricSubjectType={state.metricSubjectType}
							metricChain={state.metricChain}
							metricProtocol={state.metricProtocol}
							metricType={state.metricType}
							metricAggregator={state.metricAggregator}
							metricWindow={state.metricWindow}
							metricLabel={state.metricLabel}
							metricShowSparkline={state.metricShowSparkline}
							onSubjectTypeChange={actions.setMetricSubjectType}
							onChainChange={(opt) => actions.setMetricChain(opt?.value ?? null)}
							onProtocolChange={(opt) => actions.setMetricProtocol(opt?.value ?? null)}
							onTypeChange={actions.setMetricType}
							onAggregatorChange={actions.setMetricAggregator}
							onWindowChange={actions.setMetricWindow}
							onLabelChange={actions.setMetricLabel}
							onShowSparklineChange={actions.setMetricShowSparkline}
						/>
					)}

					{state.selectedMainTab === 'table' && (
						<UnifiedTableTab
							onClose={onClose}
							chainOptions={computed.chainOptions ?? []}
							editItem={editItem?.kind === 'unified-table' ? editItem : undefined}
							initialFocusSection={editItem?.kind === 'unified-table' ? initialUnifiedFocusSection : undefined}
							selectedTableType={state.selectedTableType}
							onTableTypeChange={actions.setSelectedTableType}
							selectedChains={state.selectedChains}
							onChainsChange={actions.handleChainsChange}
							selectedDatasetChain={state.selectedDatasetChain}
							onDatasetChainChange={actions.handleDatasetChainChange}
							selectedDatasetTimeframe={state.selectedDatasetTimeframe}
							onDatasetTimeframeChange={actions.setSelectedDatasetTimeframe}
							selectedTokens={state.selectedTokens}
							onTokensChange={actions.handleTokensChange}
							includeCex={state.includeCex}
							onIncludeCexChange={actions.setIncludeCex}
							protocolsLoading={computed.protocolsLoading}
							legacyTableTypes={legacyTableTypes}
						/>
					)}

					{state.selectedMainTab === 'text' && (
						<TextTab
							textTitle={state.textTitle}
							textContent={state.textContent}
							onTextTitleChange={actions.setTextTitle}
							onTextContentChange={actions.setTextContent}
						/>
					)}

					{state.selectedMainTab === 'llamaai' && isLlama && (
						<LlamaAITab
							selectedChart={state.selectedLlamaAIChart}
							onChartSelect={actions.setSelectedLlamaAIChart}
						/>
					)}
				</div>

				{(state.selectedMainTab !== 'table' || state.selectedTableType !== 'protocols') && (
					<div className="flex-shrink-0">
						<SubmitButton
							editItem={editItem}
							selectedMainTab={state.selectedMainTab}
							selectedChartTab={state.selectedChartTab}
							selectedChain={state.selectedChain}
							selectedChains={state.selectedChains}
							selectedProtocol={state.selectedProtocol}
							selectedChartTypes={state.selectedChartTypes}
							selectedYieldPool={state.selectedYieldPool}
							composerItems={state.composerItems}
							textContent={state.textContent}
							chartTypesLoading={chartTypesLoading}
							selectedTableType={state.selectedTableType}
							selectedDatasetChain={state.selectedDatasetChain}
							selectedTokens={state.selectedTokens}
							chartBuilder={state.chartBuilder}
							chartCreationMode={state.chartCreationMode}
							chartMode={state.chartMode}
							metricSubjectType={state.metricSubjectType}
							metricChain={state.metricChain}
							metricProtocol={state.metricProtocol}
							metricType={state.metricType}
							selectedStablecoinChain={state.selectedStablecoinChain}
							selectedStablecoinChartType={state.selectedStablecoinChartType}
							stablecoinMode={state.stablecoinMode}
							selectedStablecoinAsset={state.selectedStablecoinAsset}
							selectedStablecoinAssetId={state.selectedStablecoinAssetId}
							selectedStablecoinAssetChartType={state.selectedStablecoinAssetChartType}
							selectedAdvancedTvlProtocol={state.selectedAdvancedTvlProtocol}
							selectedAdvancedTvlChartType={state.selectedAdvancedTvlChartType}
							selectedBorrowedProtocol={state.selectedBorrowedProtocol}
							selectedBorrowedChartType={state.selectedBorrowedChartType}
							selectedLlamaAIChart={state.selectedLlamaAIChart}
							onSubmit={actions.handleSubmit}
						/>
					</div>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
