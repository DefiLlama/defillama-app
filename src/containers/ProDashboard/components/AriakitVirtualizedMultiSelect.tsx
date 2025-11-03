import { useEffect, useMemo, useRef, useState } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from './LoadingSpinner'

export interface VirtualizedMultiSelectOption {
	value: string
	label: string
	logo?: string
	disabled?: boolean
	isChild?: boolean
}

interface AriakitVirtualizedMultiSelectProps {
	label: string
	options: VirtualizedMultiSelectOption[]
	selectedValues: string[]
	onChange: (values: string[]) => void
	placeholder?: string
	isLoading?: boolean
	className?: string
	maxSelections?: number
	renderIcon?: (option: VirtualizedMultiSelectOption) => string | null
	onSearchChange?: (value: string) => void
}

export function AriakitVirtualizedMultiSelect({
	label,
	options,
	selectedValues,
	onChange,
	placeholder = 'Select...',
	isLoading = false,
	className = '',
	maxSelections = 100,
	renderIcon,
	onSearchChange
}: AriakitVirtualizedMultiSelectProps) {
	const [search, setSearch] = useState('')
	const listRef = useRef<HTMLDivElement | null>(null)
	const popover = usePopoverStore({ placement: 'bottom-start' })
	const isPopoverOpen = popover.useState('open')

	const filteredOptions = useMemo(() => {
		if (!search) return options
		return matchSorter(options, search, { keys: ['label', 'value'] })
	}, [options, search])

	const virtualizer = useVirtualizer({
		count: filteredOptions.length,
		getScrollElement: () => listRef.current,
		estimateSize: () => 44,
		overscan: 8
	})

	useEffect(() => {
		if (!isPopoverOpen) return

		virtualizer.measure()
		if (filteredOptions.length > 0) {
			virtualizer.scrollToIndex(0, { align: 'start' })
		}
	}, [isPopoverOpen, filteredOptions.length])

	const buttonLabel = useMemo(() => {
		if (selectedValues.length === 0) return placeholder
		if (selectedValues.length === 1) {
			const selected = options.find((opt) => opt.value === selectedValues[0])
			return selected?.label || selectedValues[0]
		}
		return `${selectedValues.length} selected`
	}, [selectedValues, options, placeholder])

	const toggleValue = (value: string) => {
		if (selectedValues.includes(value)) {
			onChange(selectedValues.filter((v) => v !== value))
		} else {
			if (selectedValues.length < maxSelections) {
				onChange([...selectedValues, value])
			}
		}
	}

	const handleSearchChange = (value: string) => {
		setSearch(value)
		onSearchChange?.(value)
	}

	const clearAll = () => {
		onChange([])
		handleSearchChange('')
	}

	const isMaxReached = selectedValues.length >= maxSelections

	return (
		<div className={className}>
			<label className="pro-text2 mb-1 block text-[11px] font-medium">
				{label}
				{selectedValues.length > 0 && (
					<span className="pro-text3 ml-1 text-xs">
						({selectedValues.length}
						{maxSelections < 100 && `/${maxSelections}`})
					</span>
				)}
			</label>
			{isLoading ? (
				<div className="flex h-9 items-center justify-center rounded-md border border-(--form-control-border) bg-(--bg-input)">
					<LoadingSpinner size="sm" />
				</div>
			) : (
				<>
					<PopoverDisclosure
						store={popover}
						className="flex w-full items-center justify-between rounded-md border border-(--form-control-border) bg-(--bg-input) px-2.5 py-1.5 text-xs transition-colors hover:border-(--primary)/40 focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					>
						<span className={`truncate ${selectedValues.length > 0 ? 'pro-text1' : 'pro-text3'}`}>{buttonLabel}</span>
						<Icon name="chevron-down" width={12} height={12} className="ml-2 flex-shrink-0 opacity-70" />
					</PopoverDisclosure>
					<Popover
						store={popover}
						modal={false}
						portal={true}
						flip={false}
						gutter={4}
						className="z-50 rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-xl"
						style={{ width: 'var(--popover-anchor-width)' }}
					>
						<div className="p-2">
							<div className="relative mb-2">
								<Icon
									name="search"
									width={12}
									height={12}
									className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
								/>
								<input
									autoFocus
									value={search}
									onChange={(e) => handleSearchChange(e.target.value)}
									placeholder="Search..."
									className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) py-1.5 pr-2.5 pl-7 text-xs transition-colors focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
								/>
							</div>
							<div
								ref={listRef}
								className="thin-scrollbar max-h-[280px] overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/30"
							>
								{filteredOptions.length === 0 ? (
									<div className="pro-text3 px-3 py-2 text-center text-xs">No results found.</div>
								) : (
									<div
										className="p-1"
										style={{
											height: virtualizer.getTotalSize(),
											position: 'relative'
										}}
									>
										{virtualizer.getVirtualItems().map((row) => {
											const option = filteredOptions[row.index]
											if (!option) return null
											const isActive = selectedValues.includes(option.value)
											const isDisabled = option.disabled || (!isActive && isMaxReached)
											const iconUrl = renderIcon ? renderIcon(option) : option.logo
											return (
												<button
													key={option.value}
													onClick={() => {
														if (!isDisabled) {
															toggleValue(option.value)
														}
													}}
													disabled={isDisabled}
													className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-all ${
														isDisabled
															? 'pro-text3 cursor-not-allowed opacity-50'
															: isActive
																? 'bg-(--primary)/10 font-semibold text-(--primary) shadow-sm'
																: 'pro-text2 hover:pro-text1 hover:bg-(--cards-bg-alt)'
													}`}
													style={{
														position: 'absolute',
														top: 0,
														left: 0,
														width: '100%',
														transform: `translateY(${row.start}px)`
													}}
												>
													<div className={`flex min-w-0 items-center gap-2.5 ${option.isChild ? 'pl-4' : ''}`}>
														{iconUrl && (
															<img
																src={iconUrl}
																alt={option.label}
																className={`h-5 w-5 rounded-full object-cover ring-1 ring-(--cards-border) ${
																	option.isChild ? 'opacity-70' : ''
																}`}
																onError={(e) => {
																	e.currentTarget.style.display = 'none'
																}}
															/>
														)}
														<div className="flex min-w-0 flex-col">
															<span className={`truncate ${option.isChild ? 'text-(--text-secondary)' : ''}`}>
																{option.label}
															</span>
															{option.isChild && (
																<span className="text-[10px] text-(--text-tertiary)">Child protocol</span>
															)}
														</div>
													</div>
													{isActive && (
														<Icon name="check" width={14} height={14} className="ml-2 flex-shrink-0 text-(--primary)" />
													)}
												</button>
											)
										})}
									</div>
								)}
							</div>
							{selectedValues.length > 0 && (
								<div className="mt-2 flex items-center justify-between rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 px-2.5 py-2">
									<div className="flex items-center gap-2">
										<div className="flex h-5 w-5 items-center justify-center rounded-full bg-(--primary)/15">
											<Icon name="check" width={10} height={10} className="text-(--primary)" />
										</div>
										<span className="text-[11px] font-medium text-(--text-secondary)">
											{selectedValues.length} selected
										</span>
									</div>
									<button
										type="button"
										onClick={clearAll}
										className="text-[11px] font-medium text-(--text-tertiary) transition-colors hover:text-(--primary)"
									>
										Clear All
									</button>
								</div>
							)}
						</div>
					</Popover>
				</>
			)}
		</div>
	)
}
