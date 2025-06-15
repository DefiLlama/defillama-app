import { ChartTabType } from './types'
import { ItemSelect } from '../ItemSelect'
import { ChartTypeSelector } from './ChartTypeSelector'
import { ChartPreview } from '../ChartPreview'
import { Icon } from '~/components/Icon'
import { Chain, Protocol, getProtocolChartTypes, getChainChartTypes } from '../../types'

interface ChartTabProps {
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedProtocol: string | null
	selectedChartType: string
	selectedProtocolData?: Protocol
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	availableChartTypes: string[]
	chartTypesLoading: boolean
	protocolsLoading: boolean
	showPreview: boolean
	previewChartData: any
	onChartTabChange: (tab: ChartTabType) => void
	onChainChange: (option: any) => void
	onProtocolChange: (option: any) => void
	onChartTypeChange: (type: string) => void
}

export function ChartTab({
	selectedChartTab,
	selectedChain,
	selectedProtocol,
	selectedChartType,
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
	onChartTypeChange
}: ChartTabProps) {
	const protocolChartTypes = getProtocolChartTypes()
	const chainChartTypes = getChainChartTypes()

	return (
		<div className="flex gap-4 h-96">
			<div className="flex-1 border pro-border p-4 space-y-4">
				<div className="grid grid-cols-2 gap-0">
					<button
						className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
							selectedChartTab === 'chain'
								? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
								: 'pro-border pro-hover-bg pro-text2'
						}`}
						onClick={() => onChartTabChange('chain')}
					>
						Chain
					</button>
					<button
						className={`px-3 py-2 text-sm font-medium border transition-colors duration-200 ${
							selectedChartTab === 'protocol'
								? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
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
					<ChartTypeSelector
						selectedChartType={selectedChartType}
						availableChartTypes={availableChartTypes}
						chartTypes={selectedChartTab === 'chain' ? chainChartTypes : protocolChartTypes}
						isLoading={chartTypesLoading}
						onChange={onChartTypeChange}
					/>
				)}
			</div>

			<div className="flex-1 border pro-border">
				<div className="text-sm font-medium pro-text2 mt-4 ml-4">Preview</div>
				{showPreview ? (
					<div className="pro-bg2 p-2">
						<ChartPreview
							data={previewChartData.data}
							chartType={selectedChartType}
							isLoading={previewChartData.isLoading}
							hasError={previewChartData.isError}
							itemName={
								selectedChartTab === 'chain'
									? selectedChain || ''
									: selectedProtocolData?.name || selectedProtocol || ''
							}
						/>
					</div>
				) : (
					<div className="flex items-center justify-center h-full pro-text3 text-center">
						<div>
							<Icon name="bar-chart-2" height={36} width={36} className="mb-1 mx-auto" />
							<div className="text-xs">Select a chart to see preview</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
