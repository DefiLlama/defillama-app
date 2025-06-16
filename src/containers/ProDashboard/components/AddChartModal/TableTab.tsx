import { MultiItemSelect } from '../MultiItemSelect'
import { ItemSelect } from '../ItemSelect'
import { CombinedTableType } from './types'

interface TableTabProps {
	selectedChains: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChainsChange: (options: any[]) => void
	selectedDatasetChain: string | null
	onDatasetChainChange: (option: any) => void
	selectedTableType: CombinedTableType
	onTableTypeChange: (type: CombinedTableType) => void
}

const tableTypeOptions = [
	{ value: 'protocols', label: 'Protocols' },
	{ value: 'cex', label: 'CEX' },
	{ value: 'stablecoins', label: 'Stablecoins' }
]

export function TableTab({
	selectedChains,
	chainOptions,
	protocolsLoading,
	onChainsChange,
	selectedDatasetChain,
	onDatasetChainChange,
	selectedTableType,
	onTableTypeChange
}: TableTabProps) {
	return (
		<div className="flex flex-col gap-4">
			<ItemSelect
				label="Table Type"
				options={tableTypeOptions}
				selectedValue={selectedTableType}
				onChange={(option) => onTableTypeChange(option.value as CombinedTableType)}
				placeholder="Select table type..."
				isLoading={false}
				itemType="text"
			/>

			{selectedTableType === 'protocols' ? (
				<MultiItemSelect
					label="Select Chains"
					options={chainOptions}
					selectedValues={selectedChains}
					onChange={onChainsChange}
					isLoading={protocolsLoading}
					placeholder="Select chains..."
					itemType="chain"
				/>
			) : selectedTableType === 'stablecoins' ? (
				<ItemSelect
					label="Select Chain"
					options={chainOptions}
					selectedValue={selectedDatasetChain}
					onChange={onDatasetChainChange}
					isLoading={protocolsLoading}
					placeholder="Select chain..."
					itemType="chain"
				/>
			) : null}
		</div>
	)
}
