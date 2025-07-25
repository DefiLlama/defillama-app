import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { createFilter } from 'react-select'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { reactSelectStyles } from '../utils/reactSelectStyles'
import { LoadingSpinner } from './LoadingSpinner'

interface SingleSelectWithTagsProps {
	label: string
	options: Array<{ value: string; label: string; logo?: string }>
	selectedValues: string[]
	onAddValue: (value: string) => void
	onRemoveValue: (value: string) => void
	isLoading: boolean
	placeholder: string
	itemType: 'token'
	onInputChange?: (value: string) => void
	customProps?: any
	maxSelections?: number
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

const TokenTag = ({ value, label, logo, onRemove }) => (
	<div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-(--pro-bg3) rounded-md">
		{logo ? (
			<img
				src={logo}
				alt=""
				className="w-4 h-4 rounded-full"
				onError={(e) => {
					e.currentTarget.style.display = 'none'
				}}
			/>
		) : (
			<div className="w-4 h-4 rounded-full bg-(--bg3)" />
		)}
		<span className="text-sm pro-text1">{label}</span>
		<button
			onClick={() => onRemove(value)}
			className="ml-1 text-xs pro-text3 hover:pro-text1 transition-colors"
			aria-label={`Remove ${label}`}
		>
			✕
		</button>
	</div>
)

export function SingleSelectWithTags({
	label,
	options,
	selectedValues = [],
	onAddValue,
	onRemoveValue,
	isLoading,
	placeholder,
	itemType,
	onInputChange,
	customProps,
	maxSelections = 4
}: SingleSelectWithTagsProps) {
	const filterOption = createFilter({ ignoreAccents: false, ignoreCase: false })

	const handleChange = (option: any) => {
		if (option && selectedValues.length < maxSelections && !selectedValues.includes(option.value)) {
			onAddValue(option.value)
		}
	}

	const selectedOptions = options.filter((option) => selectedValues.includes(option.value))

	return (
		<div>
			<label className="block mb-2 text-sm font-medium pro-text2">{label}</label>
			{isLoading ? (
				<div className="flex items-center justify-center h-10">
					<LoadingSpinner size="sm" />
				</div>
			) : (
				<>
					<ReactSelect
						options={options.filter((opt) => !selectedValues.includes(opt.value))}
						value={null}
						onChange={handleChange}
						onInputChange={onInputChange}
						components={{ Option: CustomTokenOption, MenuList: VirtualizedMenuList }}
						placeholder={
							selectedValues.length >= maxSelections ? `Maximum ${maxSelections} tokens selected` : placeholder
						}
						className="w-full"
						filterOption={filterOption}
						styles={reactSelectStyles}
						menuPosition="fixed"
						isDisabled={selectedValues.length >= maxSelections}
						{...customProps}
					/>
					
					{selectedValues.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-2">
							{selectedOptions.map((option) => (
								<TokenTag
									key={option.value}
									value={option.value}
									label={option.label}
									logo={option.logo}
									onRemove={onRemoveValue}
								/>
							))}
						</div>
					)}
				</>
			)}
		</div>
	)
}