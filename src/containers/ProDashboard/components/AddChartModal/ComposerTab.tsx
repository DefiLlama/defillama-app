import { Icon } from '~/components/Icon'
import { ItemSelect } from '../ItemSelect'
import { ChartTypeSelector } from './ChartTypeSelector'
import { LoadingSpinner } from '../LoadingSpinner'
import { ChartTabType } from './types'
import { ChartConfig, CHART_TYPES, getProtocolChartTypes, getChainChartTypes } from '../../types'

interface ComposerTabProps {
	composerChartName: string
	composerSubType: ChartTabType
	composerItems: ChartConfig[]
	selectedChain: string | null
	selectedProtocol: string | null
	selectedChartType: string
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	availableChartTypes: string[]
	chartTypesLoading: boolean
	protocolsLoading: boolean
	onComposerChartNameChange: (name: string) => void
	onComposerSubTypeChange: (type: ChartTabType) => void
	onChainChange: (option: any) => void
	onProtocolChange: (option: any) => void
	onChartTypeChange: (type: string) => void
	onAddToComposer: () => void
	onRemoveFromComposer: (id: string) => void
}

export function ComposerTab({
	composerChartName,
	composerSubType,
	composerItems,
	selectedChain,
	selectedProtocol,
	selectedChartType,
	chainOptions,
	protocolOptions,
	availableChartTypes,
	chartTypesLoading,
	protocolsLoading,
	onComposerChartNameChange,
	onComposerSubTypeChange,
	onChainChange,
	onProtocolChange,
	onChartTypeChange,
	onAddToComposer,
	onRemoveFromComposer
}: ComposerTabProps) {
	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()

	return (
		<div className="space-y-3 md:space-y-4">
			<div>
				<label className="block mb-1.5 md:mb-2 text-sm font-medium pro-text2">Chart Name</label>
				<input
					type="text"
					value={composerChartName}
					onChange={(e) => onComposerChartNameChange(e.target.value)}
					placeholder="Enter chart name..."
					className="w-full px-3 py-2 border pro-border pro-text1 placeholder-pro-text3 focus:border-(--primary1) focus:outline-hidden pro-bg2 text-sm md:text-base"
				/>
			</div>

			<div className="flex flex-col lg:flex-row gap-4 lg:h-96">
				<div className="flex-1 lg:flex-7 border pro-border p-3 md:p-4 space-y-3 md:space-y-4">
					<div className="grid grid-cols-2 gap-0">
						<button
							className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
								composerSubType === 'chain'
									? 'border-(--primary1) bg-(--primary1) text-white'
									: 'pro-border pro-hover-bg pro-text2'
							}`}
							onClick={() => onComposerSubTypeChange('chain')}
						>
							Chain
						</button>
						<button
							className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
								composerSubType === 'protocol'
									? 'border-(--primary1) bg-(--primary1) text-white'
									: 'pro-border pro-hover-bg pro-text2'
							}`}
							onClick={() => onComposerSubTypeChange('protocol')}
						>
							Protocol
						</button>
					</div>

					{composerSubType === 'chain' && (
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

					{composerSubType === 'protocol' && (
						<ItemSelect
							label="Select Protocol"
							options={protocolOptions}
							selectedValue={selectedProtocol}
							onChange={onProtocolChange}
							isLoading={protocolsLoading}
							placeholder="Select a protocol..."
							itemType="protocol"
						/>
					)}

					{(selectedChain || selectedProtocol) && (
						<ChartTypeSelector
							selectedChartType={selectedChartType}
							availableChartTypes={availableChartTypes}
							chartTypes={composerSubType === 'chain' ? chainChartTypes : protocolChartTypes}
							isLoading={chartTypesLoading}
							onChange={onChartTypeChange}
						/>
					)}

					<button
						className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-(--primary1) text-white text-sm font-medium hover:bg-(--primary1-hover) disabled:opacity-50 border border-(--primary1) transition-colors duration-200"
						onClick={onAddToComposer}
						disabled={
							(composerSubType === 'chain' && !selectedChain) ||
							(composerSubType === 'protocol' && !selectedProtocol) ||
							!selectedChartType
						}
					>
						Add Chart
					</button>
				</div>

				<div className="flex-1 lg:flex-3 border pro-border p-3 md:p-4 min-h-[200px] lg:min-h-0">
					<div className="text-sm font-medium pro-text2 mb-2 md:mb-3">
						Charts ({composerItems.length})
					</div>
					<div className="space-y-2 overflow-y-auto max-h-60 lg:max-h-80 thin-scrollbar">
						{composerItems.length === 0 ? (
							<div className="text-xs pro-text3 text-center py-6 md:py-8">No charts added yet</div>
						) : (
							composerItems.map((item) => (
								<div
									key={item.id}
									className="flex items-center justify-between p-2 text-xs border pro-border pro-bg2"
								>
									<div className="flex-1 min-w-0">
										<div className="font-medium pro-text1 truncate">
											{item.protocol || item.chain}
										</div>
										<div className="pro-text3 truncate">
											{CHART_TYPES[item.type]?.title}
										</div>
									</div>
									<button
										onClick={() => onRemoveFromComposer(item.id)}
										className="ml-2 p-1.5 md:p-1 pro-text3 hover:pro-text1 pro-hover-bg border pro-border transition-colors duration-200"
									>
										<Icon name="x" height={14} width={14} className="md:w-3 md:h-3" />
									</button>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	)
}