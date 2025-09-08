import { ItemSelect } from './ItemSelect'

interface SelectOption {
	value: string
	label: string
	logo?: string
	isChild?: boolean
}

interface ProtocolSelectProps {
	label?: string
	options: Array<SelectOption>
	selectedValue: string | null | undefined
	onChange: (option: any) => void
	isLoading: boolean
	placeholder?: string
}

export function ProtocolSelect({
	label = 'Protocol',
	options,
	selectedValue,
	onChange,
	isLoading,
	placeholder = 'Select a protocol...'
}: ProtocolSelectProps) {
	return (
		<ItemSelect
			label={label}
			options={options}
			selectedValue={selectedValue || null}
			onChange={onChange}
			isLoading={isLoading}
			placeholder={placeholder}
			itemType="protocol"
		/>
	)
}
