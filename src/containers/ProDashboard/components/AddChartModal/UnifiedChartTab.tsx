import { Icon } from '~/components/Icon'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { CHART_TYPES, ChartConfig, getChainChartTypes, getProtocolChartTypes } from '../../types'
import { ItemSelect } from '../ItemSelect'
import { ProtocolSelect } from '../ProtocolSelect'
import { ChartTypeMultiSelector } from './ChartTypeMultiSelector'
import { CombinedChartPreview } from './CombinedChartPreview'
import { ComposerItemsCarousel } from './ComposerItemsCarousel'
import { ChartTabType } from './types'

interface UnifiedChartTabProps {
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedProtocol: string | null
	selectedChartTypes: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	availableChartTypes: string[]
	chartTypesLoading: boolean
	protocolsLoading: boolean
	unifiedChartName: string
	chartCreationMode: 'separate' | 'combined'
	composerItems: ChartConfig[]
	onChartTabChange: (tab: ChartTabType) => void
	onChainChange: (option: any) => void
	onProtocolChange: (option: any) => void
	onChartTypesChange: (types: string[]) => void
	onUnifiedChartNameChange: (name: string) => void
	onChartCreationModeChange: (mode: 'separate' | 'combined') => void
	onAddToComposer: (typesToAdd?: string[]) => void
	onRemoveFromComposer: (id: string) => void
}

export function UnifiedChartTab({
	selectedChartTab,
	selectedChain,
	selectedProtocol,
	selectedChartTypes,
	chainOptions,
	protocolOptions,
	availableChartTypes,
	chartTypesLoading,
	protocolsLoading,
	unifiedChartName,
	chartCreationMode,
	composerItems,
	onChartTabChange,
	onChainChange,
	onProtocolChange,
	onChartTypesChange,
	onUnifiedChartNameChange,
	onChartCreationModeChange,
	onAddToComposer,
	onRemoveFromComposer
}: UnifiedChartTabProps) {
	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()
	const { loading: metaLoading, availableProtocolChartTypes, availableChainChartTypes } = useAppMetadata()
	const { protocols, chains } = useProDashboard()

	const handleChartTypesChange = (types: string[]) => {
		onChartTypesChange(types)
	}

	const handleAddToSelection = () => {
		if (selectedChartTypes.length > 0 && (selectedChain || selectedProtocol)) {
			onAddToComposer(selectedChartTypes)
			onChartTypesChange([])
		}
	}

	const instantAvailableChartTypes = (() => {
		if (selectedChartTab === 'protocol' && selectedProtocol) {
			const geckoId = protocols.find((p: any) => p.slug === selectedProtocol)?.geckoId
			return availableProtocolChartTypes(selectedProtocol, { hasGeckoId: !!geckoId })
		}
		if (selectedChartTab === 'chain' && selectedChain) {
			const geckoId = chains.find((c: any) => c.name === selectedChain)?.gecko_id
			return availableChainChartTypes(selectedChain, { hasGeckoId: !!geckoId })
		}
		return []
	})()

	return (
		<div className="flex h-full min-h-[400px] gap-3 overflow-hidden">
			<div className="pro-border flex w-[380px] flex-col overflow-hidden border lg:w-[420px]">
				<div className="flex h-full min-h-0 flex-col p-3">
					{chartCreationMode === 'combined' && (
						<div className="mb-2">
							<label className="pro-text2 mb-1 block text-xs font-medium">Chart Name</label>
							<input
								type="text"
								value={unifiedChartName}
								onChange={(e) => onUnifiedChartNameChange(e.target.value)}
								placeholder="Enter chart name..."
								className="pro-text1 placeholder:pro-text3 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1 text-xs focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
							/>
						</div>
					)}

					<div className="mb-2">
						<div className="mb-2 grid grid-cols-2 gap-0">
							<button
								className={`-ml-px rounded-none border px-2 py-1 text-xs font-medium transition-colors duration-200 first:ml-0 first:rounded-l-md last:rounded-r-md ${
									selectedChartTab === 'chain'
										? 'pro-border pro-btn-blue'
										: 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
								}`}
								onClick={() => onChartTabChange('chain')}
							>
								Chain
							</button>
							<button
								className={`-ml-px rounded-none border px-2 py-1 text-xs font-medium transition-colors duration-200 first:ml-0 first:rounded-l-md last:rounded-r-md ${
									selectedChartTab === 'protocol'
										? 'pro-border pro-btn-blue'
										: 'pro-border pro-hover-bg pro-text2 hover:pro-text1'
								}`}
								onClick={() => onChartTabChange('protocol')}
							>
								Protocol
							</button>
						</div>

						{selectedChartTab === 'chain' && (
							<ItemSelect
								label="Select Chain"
								options={chainOptions}
								selectedValue={selectedChain}
								onChange={onChainChange}
								isLoading={protocolsLoading}
								placeholder="Select a chain..."
								itemType="chain"
							/>
						)}

						{selectedChartTab === 'protocol' && (
							<ProtocolSelect
								label="Select Protocol"
								options={protocolOptions}
								selectedValue={selectedProtocol}
								onChange={onProtocolChange}
								isLoading={protocolsLoading}
								placeholder="Select a protocol..."
							/>
						)}
					</div>

					{(selectedChain || selectedProtocol) && (
						<div className="mb-2 min-h-0 flex-1">
							<ChartTypeMultiSelector
								selectedChartTypes={selectedChartTypes}
								availableChartTypes={
									instantAvailableChartTypes.length > 0 ? instantAvailableChartTypes : availableChartTypes
								}
								chartTypes={selectedChartTab === 'chain' ? chainChartTypes : protocolChartTypes}
								isLoading={metaLoading}
								onChange={handleChartTypesChange}
							/>
						</div>
					)}

					<button
						onClick={handleAddToSelection}
						disabled={selectedChartTypes.length === 0 || (!selectedChain && !selectedProtocol)}
						className={`mb-2 w-full rounded-md px-3 py-2 text-xs font-medium transition-colors duration-200 ${
							selectedChartTypes.length === 0 || (!selectedChain && !selectedProtocol)
								? 'pro-border pro-text3 cursor-not-allowed border opacity-50'
								: 'pro-btn-blue'
						}`}
					>
						Add to Selection{' '}
						{selectedChartTypes.length > 0 &&
							`(${selectedChartTypes.length} chart${selectedChartTypes.length > 1 ? 's' : ''})`}
					</button>

					<div className="pro-border border-t pt-2">
						<label className="pro-text2 mb-1 block text-xs font-medium">Create as</label>
						<div className="space-y-1">
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="chartCreationMode"
									value="separate"
									checked={chartCreationMode === 'separate'}
									onChange={(e) => onChartCreationModeChange(e.target.value as 'separate' | 'combined')}
									className="h-3 w-3 text-(--primary)"
								/>
								<span className="pro-text1 text-xs">Separate Charts ({composerItems.length})</span>
							</label>
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="chartCreationMode"
									value="combined"
									checked={chartCreationMode === 'combined'}
									onChange={(e) => onChartCreationModeChange(e.target.value as 'separate' | 'combined')}
									className="h-3 w-3 text-(--primary)"
								/>
								<span className="pro-text1 text-xs">Combined Chart (1 multi-chart)</span>
							</label>
						</div>
					</div>
				</div>
			</div>

			<div className="pro-border flex flex-1 flex-col overflow-hidden border">
				<div className="pro-text2 flex-shrink-0 px-3 py-2 text-xs font-medium">Preview</div>

				{composerItems.length > 0 ? (
					<div className="min-h-0 flex-1 overflow-hidden rounded-md bg-(--cards-bg) p-2">
						<div className="h-full w-full" key={`${composerItems.map((i) => i.id).join(',')}`}>
							{chartCreationMode === 'combined' ? (
								<CombinedChartPreview composerItems={composerItems} />
							) : (
								<ComposerItemsCarousel composerItems={composerItems} />
							)}
						</div>
					</div>
				) : (
					<div className="pro-text3 flex flex-1 items-center justify-center text-center">
						<div>
							<Icon name="bar-chart-2" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select charts to see preview</div>
							<div className="pro-text3 mt-1 text-xs">
								Choose a {selectedChartTab} and chart types to generate preview
							</div>
						</div>
					</div>
				)}

				{composerItems.length > 0 && (
					<div className="flex-shrink-0 border-t border-(--cards-border) px-2 py-2">
						<div className="thin-scrollbar flex items-center gap-2 overflow-x-auto">
							<span className="pro-text2 shrink-0 text-xs font-medium">
								{chartCreationMode === 'combined' ? 'Charts in Multi-Chart:' : 'Charts to Create:'}
							</span>
							{composerItems.map((item) => (
								<div
									key={item.id}
									className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1 text-xs"
								>
									<span className="pro-text1">
										{item.protocol || item.chain} - {CHART_TYPES[item.type]?.title || item.type}
									</span>
									<button
										onClick={() => onRemoveFromComposer(item.id)}
										className="pro-text3 transition-colors hover:text-red-500"
										title="Remove from selection"
									>
										<Icon name="x" height={12} width={12} />
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
