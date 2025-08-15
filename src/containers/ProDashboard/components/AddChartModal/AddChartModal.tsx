import { useAvailableChartTypes } from '../../queries'
import { useMultipleChartData } from '../../hooks/useMultipleChartData'
import { ModalHeader } from './ModalHeader'
import { TabNavigation } from './TabNavigation'
import { ChartTab } from './ChartTab'
import { ComposerTab } from './ComposerTab'
import { TableTab } from './TableTab'
import { TextTab } from './TextTab'
import { SubmitButton } from './SubmitButton'
import { useModalActions } from './useModalActions'
import { AddChartModalProps } from './types'

export function AddChartModal({ isOpen, onClose, editItem }: AddChartModalProps) {
	const { state, actions, computed } = useModalActions(editItem, isOpen, onClose)

	const getCurrentItemType = () => {
		if (state.selectedMainTab === 'chart') {
			return state.selectedChartTab
		} else if (state.selectedMainTab === 'composer') {
			return state.composerSubType
		} else {
			return 'chain'
		}
	}

	const getCurrentSelectedItem = () => {
		if (state.selectedMainTab === 'chart') {
			return state.selectedChartTab === 'chain' ? state.selectedChain : state.selectedProtocol
		} else if (state.selectedMainTab === 'composer') {
			return state.composerSubType === 'chain' ? state.selectedChain : state.selectedProtocol
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

	const { availableChartTypes, isLoading: chartTypesLoading } = useAvailableChartTypes(
		getCurrentSelectedItem(),
		state.selectedMainTab === 'table' ? 'chain' : getCurrentItemType(),
		getCurrentGeckoId(),
		computed.timePeriod
	)

	const shouldFetchPreviewData =
		state.selectedMainTab === 'chart' && getCurrentSelectedItem() && state.selectedChartTypes.length > 0

	const previewChartData = useMultipleChartData(
		shouldFetchPreviewData ? state.selectedChartTypes : [],
		getCurrentItemType(),
		getCurrentSelectedItem() || '',
		getCurrentGeckoId(),
		computed.timePeriod
	)

	const showPreview =
		shouldFetchPreviewData && state.selectedChartTypes.some((type) => availableChartTypes.includes(type))

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex justify-center items-end md:items-center z-50 add-chart-modal"
			onClick={onClose}
		>
			<div
				className="pro-bg1 border pro-border p-4 md:p-6 w-full md:max-w-2xl lg:max-w-4xl shadow-xl md:ml-0 lg:ml-[240px] max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<ModalHeader editItem={editItem} onClose={onClose} />

				<TabNavigation
					selectedMainTab={state.selectedMainTab}
					editItem={editItem}
					onTabChange={actions.handleMainTabChange}
				/>

				<div className="space-y-3 md:space-y-5 overflow-y-auto flex-1 -mx-4 px-4 md:mx-0 md:px-0">
					{state.selectedMainTab === 'chart' && (
						<ChartTab
							selectedChartTab={state.selectedChartTab}
							selectedChain={state.selectedChain}
							selectedProtocol={state.selectedProtocol}
							selectedChartTypes={state.selectedChartTypes}
							selectedProtocolData={computed.selectedProtocolData}
							chainOptions={computed.chainOptions}
							protocolOptions={computed.protocolOptions}
							availableChartTypes={availableChartTypes}
							chartTypesLoading={chartTypesLoading}
							protocolsLoading={computed.protocolsLoading}
							showPreview={showPreview}
							previewChartData={previewChartData}
							onChartTabChange={actions.handleChartTabChange}
							onChainChange={actions.handleChainChange}
							onProtocolChange={actions.handleProtocolChange}
							onChartTypesChange={actions.setSelectedChartTypes}
						/>
					)}

					{state.selectedMainTab === 'composer' && (
						<ComposerTab
							composerChartName={state.composerChartName}
							composerSubType={state.composerSubType}
							composerItems={state.composerItems}
							selectedChain={state.selectedChain}
							selectedProtocol={state.selectedProtocol}
							selectedChartType={state.selectedChartType}
							chainOptions={computed.chainOptions}
							protocolOptions={computed.protocolOptions}
							availableChartTypes={availableChartTypes}
							chartTypesLoading={chartTypesLoading}
							protocolsLoading={computed.protocolsLoading}
							onComposerChartNameChange={actions.setComposerChartName}
							onComposerSubTypeChange={actions.handleComposerSubTypeChange}
							onChainChange={actions.handleChainChange}
							onProtocolChange={actions.handleProtocolChange}
							onChartTypeChange={actions.setSelectedChartType}
							onAddToComposer={actions.handleAddToComposer}
							onRemoveFromComposer={actions.handleRemoveFromComposer}
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
						onSubmit={actions.handleSubmit}
					/>
				</div>
			</div>
		</div>
	)
}
