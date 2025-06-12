import { MultiItemSelect } from '../MultiItemSelect'

interface TableTabProps {
	selectedChains: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChainsChange: (options: any[]) => void
}

export function TableTab({ selectedChains, chainOptions, protocolsLoading, onChainsChange }: TableTabProps) {
	return (
		<MultiItemSelect
			label="Select Chains"
			options={chainOptions}
			selectedValues={selectedChains}
			onChange={onChainsChange}
			isLoading={protocolsLoading}
			placeholder="Select chains..."
			itemType="chain"
		/>
	)
}