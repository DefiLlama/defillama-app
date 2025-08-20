import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { LoadingSpinner } from './LoadingSpinner'
import { createFilter } from 'react-select'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { getItemIconUrl } from '../utils'
import { reactSelectStyles } from '../utils/reactSelectStyles'

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
	<div {...innerProps} className="flex cursor-pointer items-center gap-2 p-2">
		{data.logo ? (
			<img
				src={data.logo}
				alt=""
				className="h-5 w-5 rounded-full"
				onError={(e) => {
					e.currentTarget.style.display = 'none'
				}}
			/>
		) : (
			<div className="h-5 w-5 rounded-full bg-(--bg-tertiary)" />
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
	<div className="inline-flex items-center gap-1.5 rounded-md bg-(--pro-bg3) px-2.5 py-1">
		{logo ? (
			<img
				src={logo}
				alt=""
				className="h-4 w-4 rounded-full"
				onError={(e) => {
					e.currentTarget.style.display = 'none'
				}}
			/>
		) : (
			<div className="h-4 w-4 rounded-full bg-(--bg-tertiary)" />
		)}
		<span className="pro-text1 text-sm">{label}</span>
		<button
			onClick={() => onRemove(value)}
			className="pro-text3 hover:pro-text1 ml-1 text-xs transition-colors"
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
			<label className="pro-text2 mb-2 block text-sm font-medium">{label}</label>
			{isLoading ? (
				<div className="flex h-10 items-center justify-center">
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
