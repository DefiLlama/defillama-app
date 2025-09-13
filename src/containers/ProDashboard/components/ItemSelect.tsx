import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { createFilter } from 'react-select'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { getItemIconUrl } from '../utils'
import { reactSelectStyles } from '../utils/reactSelectStyles'
import { LoadingSpinner } from './LoadingSpinner'
import { ProtocolOption as SharedProtocolOption } from './ProtocolOption'

interface SelectOption {
	value: string
	label: string
	logo?: string
	isChild?: boolean
}

interface ItemSelectProps {
	label: string
	options: Array<SelectOption>
	selectedValue: string | null
	onChange: (option: any) => void
	isLoading: boolean
	placeholder: string
	itemType?: 'chain' | 'protocol' | 'text'
}

const CustomChainOption = ({ innerProps, label, isFocused, isSelected }) => (
	<div
		{...innerProps}
		style={{
			display: 'flex',
			alignItems: 'center',
			padding: '8px',
			cursor: 'pointer',
			backgroundColor: isSelected ? 'var(--primary)' : isFocused ? 'var(--bg-tertiary)' : 'transparent',
			color: isSelected ? 'white' : 'var(--pro-text1)'
		}}
	>
		{label === 'All Chains' ? null : (
			<img
				src={getItemIconUrl('chain', null, label)}
				alt={label}
				style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
			/>
		)}
		{label}
	</div>
)

const CustomProtocolOption = SharedProtocolOption as any

const TextOption = ({ innerProps, label, isFocused, isSelected }) => (
	<div
		{...innerProps}
		style={{
			padding: '8px',
			cursor: 'pointer',
			backgroundColor: isSelected ? 'var(--primary)' : isFocused ? 'var(--bg-tertiary)' : 'transparent',
			color: isSelected ? 'white' : 'var(--pro-text1)'
		}}
	>
		{label}
	</div>
)

function VirtualizedMenuList(props) {
	const { options, children, maxHeight, getValue } = props
	const listRef = useRef<HTMLDivElement>(null)
	const itemCount = options.length
	const virtualizer = useVirtualizer({
		count: itemCount,
		getScrollElement: () => listRef.current,
		estimateSize: () => 40
	})
	return (
		<div
			ref={listRef}
			className="thin-scrollbar"
			style={{
				maxHeight,
				overflowY: 'auto',
				position: 'relative'
			}}
		>
			<div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
				{virtualizer.getVirtualItems().map((virtualRow) => (
					<div
						key={virtualRow.key}
						data-index={virtualRow.index}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							transform: `translateY(${virtualRow.start}px)`
						}}
					>
						{children[virtualRow.index]}
					</div>
				))}
			</div>
		</div>
	)
}

export function ItemSelect({
	label,
	options,
	selectedValue,
	onChange,
	isLoading,
	placeholder,
	itemType
}: ItemSelectProps) {
	const OptionComponent = !itemType
		? TextOption
		: itemType === 'chain'
			? CustomChainOption
			: itemType === 'protocol'
				? (CustomProtocolOption as any)
				: TextOption
	const filterOption = itemType === 'protocol' ? createFilter({ ignoreAccents: false, ignoreCase: false }) : undefined

	return (
		<div>
			<label className="pro-text2 mb-1.5 block text-sm font-medium md:mb-2">{label}</label>
			{isLoading ? (
				<div className="flex h-10 items-center justify-center">
					<LoadingSpinner size="sm" />
				</div>
			) : (
				<ReactSelect
					options={options}
					value={options.find((option) => option.value === selectedValue)}
					onChange={onChange}
					components={{ Option: OptionComponent, MenuList: VirtualizedMenuList }}
					placeholder={placeholder}
					className="w-full text-sm md:text-base"
					filterOption={filterOption}
					styles={reactSelectStyles}
					menuPosition="fixed"
				/>
			)}
		</div>
	)
}
