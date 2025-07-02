import { ChartTabType } from './types'
import { ItemSelect } from '../ItemSelect'
import { ChartTypeMultiSelector } from './ChartTypeMultiSelector'
import { ChartPreviewCarousel } from '../ChartPreviewCarousel'
import { Icon } from '~/components/Icon'
import { Protocol, getProtocolChartTypes, getChainChartTypes } from '../../types'

interface ChartTabProps {
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedProtocol: string | null
	selectedChartTypes: string[]
	selectedProtocolData?: Protocol
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	availableChartTypes: string[]
	chartTypesLoading: boolean
	protocolsLoading: boolean
	showPreview: boolean
	previewChartData: Map<string, any>
	onChartTabChange: (tab: ChartTabType) => void
	onChainChange: (option: any) => void
	onProtocolChange: (option: any) => void
	onChartTypesChange: (types: string[]) => void
}

export function ChartTab({
	selectedChartTab,
	selectedChain,
	selectedProtocol,
	selectedChartTypes,
	selectedProtocolData,
	chainOptions,
	protocolOptions,
	availableChartTypes,
	chartTypesLoading,
	protocolsLoading,
	showPreview,
	previewChartData,
	onChartTabChange,
	onChainChange,
	onProtocolChange,
	onChartTypesChange
}: ChartTabProps) {
	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()

	return (
		<div className="flex flex-col lg:flex-row gap-4">
			<div className="flex-1 border pro-border p-3 md:p-4 space-y-3 md:space-y-4 overflow-visible">
				<div className="grid grid-cols-2 gap-0">
					<button
						className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
							selectedChartTab === 'chain'
								? 'border-(--primary1) bg-(--primary1) text-white'
								: 'pro-border pro-hover-bg pro-text2'
						}`}
						onClick={() => onChartTabChange('chain')}
					>
						Chain
					</button>
					<button
						className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
							selectedChartTab === 'protocol'
								? 'border-(--primary1) bg-(--primary1) text-white'
								: 'pro-border pro-hover-bg pro-text2'
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
					<ChartTypeMultiSelector
						selectedChartTypes={selectedChartTypes}
						availableChartTypes={availableChartTypes}
						chartTypes={selectedChartTab === 'chain' ? chainChartTypes : protocolChartTypes}
						isLoading={chartTypesLoading}
						onChange={onChartTypesChange}
					/>
				)}
			</div>

			<div className="flex-1 border pro-border min-h-[300px] lg:min-h-[400px]">
				<div className="text-sm font-medium pro-text2 mt-3 ml-3 md:mt-4 md:ml-4">Preview</div>
				{showPreview && selectedChartTypes.length > 0 ? (
					<div className="pro-bg2 p-2 h-[calc(100%-2rem)]">
						<ChartPreviewCarousel
							selectedChartTypes={selectedChartTypes}
							chartData={previewChartData}
							itemName={
								selectedChartTab === 'chain'
									? selectedChain || ''
									: selectedProtocolData?.name || selectedProtocol || ''
							}
						/>
					</div>
				) : (
					<div className="flex items-center justify-center h-full min-h-[150px] pro-text3 text-center">
						<div>
							<Icon name="bar-chart-2" height={36} width={36} className="mb-1 mx-auto" />
							<div className="text-xs">Select charts to see preview</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
