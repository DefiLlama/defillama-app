import { useAvailableChartTypes, useChartData } from '../../queries'
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

	const { availableChartTypes, isLoading: chartTypesLoading } = useAvailableChartTypes(
		getCurrentSelectedItem(),
		state.selectedMainTab === 'table' ? 'chain' : getCurrentItemType(),
		computed.selectedProtocolData?.geckoId,
		computed.timePeriod
	)

	const shouldFetchPreviewData = state.selectedMainTab === 'chart' && getCurrentSelectedItem() && state.selectedChartType
	const previewChartData = useChartData(
		state.selectedChartType,
		getCurrentItemType(),
		getCurrentSelectedItem() || '',
		computed.selectedProtocolData?.geckoId,
		computed.timePeriod
	)

	const showPreview = shouldFetchPreviewData && availableChartTypes.includes(state.selectedChartType)

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="pro-bg1 border pro-border p-6 max-w-4xl w-full shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<ModalHeader editItem={editItem} onClose={onClose} />

				<TabNavigation
					selectedMainTab={state.selectedMainTab}
					editItem={editItem}
					onTabChange={actions.handleMainTabChange}
				/>

				<div className="space-y-5">
					{state.selectedMainTab === 'chart' && (
						<ChartTab
							selectedChartTab={state.selectedChartTab}
							selectedChain={state.selectedChain}
							selectedProtocol={state.selectedProtocol}
							selectedChartType={state.selectedChartType}
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
							onChartTypeChange={actions.setSelectedChartType}
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
							selectedTableType={state.selectedTableType}
							onTableTypeChange={actions.setSelectedTableType}
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
						composerItems={state.composerItems}
						textContent={state.textContent}
						chartTypesLoading={chartTypesLoading}
						selectedTableType={state.selectedTableType}
						selectedDatasetChain={state.selectedDatasetChain}
						onSubmit={actions.handleSubmit}
					/>
				</div>
			</div>
		</div>
	)
}