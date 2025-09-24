import * as Ariakit from '@ariakit/react'
import { ChartBuilderTab } from './ChartBuilderTab'
import { ModalHeader } from './ModalHeader'
import { SubmitButton } from './SubmitButton'
import { TableTab } from './TableTab'
import { TabNavigation } from './TabNavigation'
import { TextTab } from './TextTab'
import { AddChartModalProps } from './types'
import { UnifiedChartTab } from './UnifiedChartTab'
import { useComposerItemsData } from './useComposerItemsData'
import { useModalActions } from './useModalActions'

export function AddChartModal({ isOpen, onClose, editItem }: AddChartModalProps) {
	const { state, actions, computed } = useModalActions(editItem, isOpen, onClose)

	const getCurrentItemType = () => {
		if (state.selectedMainTab === 'charts') {
			return state.selectedChartTab
		} else {
			return 'chain'
		}
	}

	const getCurrentSelectedItem = () => {
		if (state.selectedMainTab === 'charts') {
			return state.selectedChartTab === 'chain' ? state.selectedChain : state.selectedProtocol
		} else {
			return state.selectedChain
		}
	}

	const getCurrentGeckoId = () => {
		const itemType = getCurrentItemType()
		if (itemType === 'protocol') {
			return computed.selectedProtocolData?.geckoId
		} else if (itemType === 'chain') {
			return computed.selectedChainData?.gecko_id
		}
		return undefined
	}

	const availableChartTypes: string[] = []
	const chartTypesLoading = false

	const composerItemsWithData = useComposerItemsData(state.composerItems, computed.timePeriod)

	return (
		<Ariakit.DialogProvider
			open={isOpen}
			setOpen={(open) => {
				if (!open) onClose()
			}}
		>
			<Ariakit.Dialog
				className={`pro-dashboard dialog add-chart-dialog max-sm:drawer thin-scrollbar flex w-[90%] flex-col overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 shadow-xl md:p-4 ${
					state.selectedMainTab === 'builder'
						? 'max-h-[90dvh] md:max-h-[85dvh] md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl'
						: state.selectedMainTab === 'charts'
							? 'max-h-[90dvh] md:max-h-[85dvh] md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl'
							: 'max-h-[85dvh] md:max-h-[80dvh] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl'
				}`}
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<ModalHeader editItem={editItem} />

				<TabNavigation
					selectedMainTab={state.selectedMainTab}
					editItem={editItem}
					onTabChange={actions.handleMainTabChange}
				/>

				<div className="-mx-4 flex flex-1 flex-col overflow-y-auto px-4 md:mx-0 md:px-0">
					{state.selectedMainTab === 'charts' && (
						<UnifiedChartTab
							selectedChartTab={state.selectedChartTab}
							selectedChain={state.selectedChain}
							selectedProtocol={state.selectedProtocol}
							selectedChartTypes={state.selectedChartTypes}
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
							onUnifiedChartNameChange={actions.setUnifiedChartName}
							onChartCreationModeChange={actions.setChartCreationMode}
							onAddToComposer={actions.handleAddToComposer}
							onRemoveFromComposer={actions.handleRemoveFromComposer}
						/>
					)}

					{state.selectedMainTab === 'builder' && (
						<ChartBuilderTab
							chartBuilder={state.chartBuilder}
							chartBuilderName={state.chartBuilderName}
							chainOptions={computed.chainOptions}
							protocolOptions={computed.protocolOptions}
							protocolsLoading={computed.protocolsLoading}
							onChartBuilderChange={actions.updateChartBuilder}
							onChartBuilderNameChange={actions.setChartBuilderName}
						/>
					)}

					{state.selectedMainTab === 'table' && (
						<TableTab
							selectedChains={state.selectedChains}
							chainOptions={computed.chainOptions}
							protocolsLoading={computed.protocolsLoading}
							onChainsChange={actions.handleChainsChange}
							selectedDatasetChain={state.selectedDatasetChain}
							onDatasetChainChange={actions.handleDatasetChainChange}
							selectedDatasetTimeframe={state.selectedDatasetTimeframe}
							onDatasetTimeframeChange={actions.setSelectedDatasetTimeframe}
							selectedTableType={state.selectedTableType}
							onTableTypeChange={actions.setSelectedTableType}
							selectedTokens={state.selectedTokens}
							onTokensChange={actions.handleTokensChange}
							includeCex={state.includeCex}
							onIncludeCexChange={actions.setIncludeCex}
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
				</div>

				<div className="flex-shrink-0">
					<SubmitButton
						editItem={editItem}
						selectedMainTab={state.selectedMainTab}
						selectedChartTab={state.selectedChartTab}
						selectedChain={state.selectedChain}
						selectedChains={state.selectedChains}
						selectedProtocol={state.selectedProtocol}
						selectedChartTypes={state.selectedChartTypes}
						composerItems={state.composerItems}
						textContent={state.textContent}
						chartTypesLoading={chartTypesLoading}
						selectedTableType={state.selectedTableType}
						selectedDatasetChain={state.selectedDatasetChain}
						selectedTokens={state.selectedTokens}
						chartBuilder={state.chartBuilder}
						chartCreationMode={state.chartCreationMode}
						onSubmit={actions.handleSubmit}
					/>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
