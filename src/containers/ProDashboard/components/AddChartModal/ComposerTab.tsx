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
		<div className="space-y-4">
			<div>
				<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Chart Name</label>
				<input
					type="text"
					value={composerChartName}
					onChange={(e) => onComposerChartNameChange(e.target.value)}
					placeholder="Enter chart name..."
					className="w-full px-3 py-2 border border-white/20 text-[var(--text1)] placeholder-[var(--text3)] focus:border-[var(--primary1)] focus:outline-none"
					style={{ backgroundColor: '#070e0f' }}
				/>
			</div>

			<div className="flex gap-4 h-96">
				<div className="flex-[7] border border-white/20 p-4 space-y-4">
					<div className="grid grid-cols-2 gap-0">
						<button
							className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
								composerSubType === 'chain'
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
							}`}
							onClick={() => onComposerSubTypeChange('chain')}
						>
							Chain
						</button>
						<button
							className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
								composerSubType === 'protocol'
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
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
						className="w-full px-4 py-3 bg-[var(--primary1)] text-white text-sm font-medium hover:bg-[var(--primary1-hover)] disabled:opacity-50 border border-[var(--primary1)] transition-colors duration-200"
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

				<div className="flex-[3] border border-white/20 p-4">
					<div className="text-sm font-medium text-[var(--text2)] mb-3">
						Charts ({composerItems.length})
					</div>
					<div className="space-y-2 overflow-y-auto max-h-80 thin-scrollbar">
						{composerItems.length === 0 ? (
							<div className="text-xs text-[var(--text3)] text-center py-8">No charts added yet</div>
						) : (
							composerItems.map((item) => (
								<div
									key={item.id}
									className="flex items-center justify-between p-2 text-xs border border-white/10"
									style={{ backgroundColor: '#070e0f' }}
								>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-[var(--text1)] truncate">
											{item.protocol || item.chain}
										</div>
										<div className="text-[var(--text3)] truncate">
											{CHART_TYPES[item.type]?.title}
										</div>
									</div>
									<button
										onClick={() => onRemoveFromComposer(item.id)}
										className="ml-2 p-1 text-[var(--text3)] hover:text-[var(--text1)] hover:bg-[var(--bg2)] border border-white/20 transition-colors duration-200"
									>
										<Icon name="x" height={12} width={12} />
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