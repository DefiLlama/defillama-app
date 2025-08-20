import { Icon } from '~/components/Icon'
import { getChainChartTypes, getProtocolChartTypes, Protocol } from '../../types'
import { ChartPreviewCarousel } from '../ChartPreviewCarousel'
import { ItemSelect } from '../ItemSelect'
import { ChartTypeMultiSelector } from './ChartTypeMultiSelector'
import { ChartTabType } from './types'

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
		<div className="flex flex-col gap-4 lg:flex-row">
			<div className="pro-border flex-1 space-y-3 overflow-visible border p-3 md:space-y-4 md:p-4">
				<div className="grid grid-cols-2 gap-0">
					<button
						className={`border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
							selectedChartTab === 'chain'
								? 'border-(--primary) bg-(--primary) text-white'
								: 'pro-border pro-hover-bg pro-text2'
						}`}
						onClick={() => onChartTabChange('chain')}
					>
						Chain
					</button>
					<button
						className={`border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
							selectedChartTab === 'protocol'
								? 'border-(--primary) bg-(--primary) text-white'
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

			<div className="pro-border min-h-[300px] flex-1 border lg:min-h-[400px]">
				<div className="pro-text2 mt-3 ml-3 text-sm font-medium md:mt-4 md:ml-4">Preview</div>
				{showPreview && selectedChartTypes.length > 0 ? (
					<div className="pro-bg2 h-[calc(100%-2rem)] p-2">
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
					<div className="pro-text3 flex h-full min-h-[150px] items-center justify-center text-center">
						<div>
							<Icon name="bar-chart-2" height={36} width={36} className="mx-auto mb-1" />
							<div className="text-xs">Select charts to see preview</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
