import { Icon } from '~/components/Icon'
import { CHART_TYPES, ChartConfig, getChainChartTypes, getProtocolChartTypes } from '../../types'
import { ItemSelect } from '../ItemSelect'
import { LoadingSpinner } from '../LoadingSpinner'
import { ChartTypeSelector } from './ChartTypeSelector'
import { ChartTabType } from './types'

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
				<label className="pro-text2 mb-1.5 block text-sm font-medium md:mb-2">Chart Name</label>
				<input
					type="text"
					value={composerChartName}
					onChange={(e) => onComposerChartNameChange(e.target.value)}
					placeholder="Enter chart name..."
					className="pro-border pro-text1 placeholder-pro-text3 pro-bg2 w-full border px-3 py-2 text-sm focus:border-(--primary) focus:outline-hidden md:text-base"
				/>
			</div>

			<div className="flex flex-col gap-4 lg:h-96 lg:flex-row">
				<div className="pro-border flex-1 space-y-3 border p-3 md:space-y-4 md:p-4 lg:flex-7">
					<div className="grid grid-cols-2 gap-0">
						<button
							className={`border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
								composerSubType === 'chain'
									? 'border-(--primary) bg-(--primary) text-white'
									: 'pro-border pro-hover-bg pro-text2'
							}`}
							onClick={() => onComposerSubTypeChange('chain')}
						>
							Chain
						</button>
						<button
							className={`border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
								composerSubType === 'protocol'
									? 'border-(--primary) bg-(--primary) text-white'
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
						className="w-full border border-(--primary) bg-(--primary) px-3 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-(--primary-hover) disabled:opacity-50 md:px-4 md:py-3"
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

				<div className="pro-border min-h-[200px] flex-1 border p-3 md:p-4 lg:min-h-0 lg:flex-3">
					<div className="pro-text2 mb-2 text-sm font-medium md:mb-3">Charts ({composerItems.length})</div>
					<div className="thin-scrollbar max-h-60 space-y-2 overflow-y-auto lg:max-h-80">
						{composerItems.length === 0 ? (
							<div className="pro-text3 py-6 text-center text-xs md:py-8">No charts added yet</div>
						) : (
							composerItems.map((item) => (
								<div key={item.id} className="pro-border pro-bg2 flex items-center justify-between border p-2 text-xs">
									<div className="min-w-0 flex-1">
										<div className="pro-text1 truncate font-medium">{item.protocol || item.chain}</div>
										<div className="pro-text3 truncate">{CHART_TYPES[item.type]?.title}</div>
									</div>
									<button
										onClick={() => onRemoveFromComposer(item.id)}
										className="pro-text3 hover:pro-text1 pro-hover-bg pro-border ml-2 border p-1.5 transition-colors duration-200 md:p-1"
									>
										<Icon name="x" height={14} width={14} className="md:h-3 md:w-3" />
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
