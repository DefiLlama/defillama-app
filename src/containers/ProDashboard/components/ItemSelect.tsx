import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { createFilter } from 'react-select'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { getItemIconUrl } from '../utils'
import { reactSelectStyles } from '../utils/reactSelectStyles'
import { LoadingSpinner } from './LoadingSpinner'

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

const CustomProtocolOption = ({ innerProps, label, data, isFocused, isSelected }) => {
	const isChild = !!data.isChild
	const iconSize = isChild ? 18 : 20
	const iconUrl = getItemIconUrl('protocol', data, data.value)
	return (
		<div
			{...innerProps}
			style={{
				display: 'flex',
				alignItems: 'center',
				padding: '8px',
				cursor: 'pointer',
				paddingLeft: isChild ? 40 : 10,
				marginLeft: isChild ? 0 : 0,
				marginRight: 4,
				backgroundColor: isSelected ? 'var(--primary)' : isFocused ? 'var(--bg-tertiary)' : 'transparent',
				transition: 'background-color 0.15s ease',
				position: 'relative'
			}}
		>
			{isChild && (
				<>
					<div
						style={{
							position: 'absolute',
							left: 28,
							top: '50%',
							transform: 'translateY(-50%)',
							width: 4,
							height: 4,
							borderRadius: '50%',
							backgroundColor: 'var(--pro-text3)',
							opacity: 0.6
						}}
					/>
				</>
			)}
			{data.logo ? (
				<img
					src={data.logo}
					alt={label}
					style={{
						width: iconSize,
						height: iconSize,
						marginRight: 10,
						borderRadius: '50%',
						opacity: 1
					}}
				/>
			) : (
				<img
					src={iconUrl}
					alt={label}
					style={{
						width: iconSize,
						height: iconSize,
						marginRight: 10,
						borderRadius: '50%',
						opacity: isChild ? 0.85 : 1
					}}
					onError={(e) => {
						const target = e.target as HTMLImageElement
						target.style.display = 'none'
						const placeholder = target.nextElementSibling as HTMLElement
						if (placeholder) {
							placeholder.style.display = 'flex'
						}
					}}
				/>
			)}
			<div
				style={{
					width: iconSize,
					height: iconSize,
					marginRight: 10,
					borderRadius: '50%',
					backgroundColor: 'var(--bg2)',
					display: data.logo ? 'none' : 'none'
				}}
			/>
			<span
				style={{
					fontWeight: isChild ? 400 : 500,
					color: isSelected ? 'white' : isChild ? 'var(--pro-text2)' : 'var(--pro-text1)',
					fontSize: isChild ? '0.95em' : '1em'
				}}
			>
				{label}
			</span>
		</div>
	)
}

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
				? CustomProtocolOption
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
