import { ItemSelect } from '../ItemSelect'

interface TableTabProps {
	selectedChain: string | null
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChainChange: (option: any) => void
}

export function TableTab({ selectedChain, chainOptions, protocolsLoading, onChainChange }: TableTabProps) {
	return (
		<ItemSelect
			label="Select Chain"
			options={chainOptions}
			selectedValue={selectedChain}
			onChange={onChainChange}
			isLoading={protocolsLoading}
			placeholder="Select a chain..."
			itemType="chain"
		/>
	)
}