import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { LoadingSpinner } from './LoadingSpinner'
import { createFilter } from 'react-select'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useMemo } from 'react'
import { getItemIconUrl } from '../utils'
import { reactSelectStyles } from '../utils/reactSelectStyles'

interface MultiItemSelectProps {
	label: string
	options: Array<{ value: string; label: string; logo?: string }>
	selectedValues: string[]
	onChange: (options: any[]) => void
	isLoading: boolean
	placeholder: string
	itemType: 'chain' | 'protocol' | 'token'
	onInputChange?: (value: string) => void
	customProps?: any
	noIcon?: boolean
}

const CustomChainOption = ({ innerProps, label, data }) => (
	<div {...innerProps} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }}>
		{data.value !== 'All' && (
			<img
				src={getItemIconUrl('chain', null, label)}
				alt={label}
				style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
			/>
		)}
		{label}
	</div>
)

const CustomProtocolOption = ({ innerProps, label, data }) => {
	const iconUrl = getItemIconUrl('protocol', data, data.value)
	return (
		<div {...innerProps} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }}>
			{data.logo ? (
				<img
					src={data.logo}
					alt={label}
					style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
				/>
			) : (
				<img
					src={iconUrl}
					alt={label}
					style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
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
					width: '20px',
					height: '20px',
					marginRight: '10px',
					borderRadius: '50%',
					backgroundColor: 'var(--bg2)',
					display: data.logo ? 'none' : 'none'
				}}
			/>
			{label}
		</div>
	)
}

const CustomTokenOption = ({ innerProps, label, data }) => (
	<div {...innerProps} className="flex items-center gap-2 p-2 cursor-pointer">
		{data.logo ? (
			<img
				src={data.logo}
				alt=""
				className="w-5 h-5 rounded-full"
				onError={(e) => {
					e.currentTarget.style.display = 'none'
				}}
			/>
		) : (
			<div className="w-5 h-5 rounded-full bg-(--bg3)" />
		)}
		<span>{label}</span>
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

const SimpleOption = ({ innerProps, label }) => (
	<div {...innerProps} className="flex items-center gap-2 p-2 cursor-pointer">
		<span>{label}</span>
	</div>
)

export function MultiItemSelect({
	label,
	options,
	selectedValues = [],
	onChange,
	isLoading,
	placeholder,
	itemType,
	onInputChange,
	customProps,
	noIcon = false
}: MultiItemSelectProps) {
	const OptionComponent = noIcon 
		? SimpleOption 
		: itemType === 'chain' ? CustomChainOption : itemType === 'protocol' ? CustomProtocolOption : CustomTokenOption
	const filterOption = itemType === 'protocol' ? createFilter({ ignoreAccents: false, ignoreCase: false }) : undefined

	const selectedOptions = useMemo(() => {
		if (!selectedValues || selectedValues.length === 0) return []
		return options.filter((option) => selectedValues.includes(option.value))
	}, [options, selectedValues])

	return (
		<div>
			<label className="block mb-2 text-sm font-medium pro-text2">{label}</label>
			{isLoading ? (
				<div className="flex items-center justify-center h-10">
					<LoadingSpinner size="sm" />
				</div>
			) : (
				<ReactSelect
					isMulti
					options={options}
					value={selectedOptions}
					onChange={onChange}
					onInputChange={onInputChange}
					components={{ Option: OptionComponent, MenuList: VirtualizedMenuList }}
					placeholder={placeholder}
					className="w-full"
					filterOption={filterOption}
					styles={reactSelectStyles}
					closeMenuOnSelect={false}
					menuPosition="fixed"
					isClearable
					{...customProps}
				/>
			)}
		</div>
	)
}
