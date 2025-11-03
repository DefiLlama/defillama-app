import { useEffect, useMemo, useRef, useState } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from './LoadingSpinner'

export interface VirtualizedSelectOption {
	value: string
	label: string
	logo?: string
	disabled?: boolean
	isChild?: boolean
	icon?: string
	description?: string
}

interface AriakitVirtualizedSelectProps {
	label: string
	options: VirtualizedSelectOption[]
	selectedValue: string | null
	onChange: (option: VirtualizedSelectOption) => void
	placeholder?: string
	isLoading?: boolean
	className?: string
	renderIcon?: (option: VirtualizedSelectOption) => string | null
	placement?: 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'
}

export function AriakitVirtualizedSelect({
	label,
	options,
	selectedValue,
	onChange,
	placeholder = 'Select...',
	isLoading = false,
	className = '',
	renderIcon,
	placement = 'bottom-start'
}: AriakitVirtualizedSelectProps) {
	const [search, setSearch] = useState('')
	const listRef = useRef<HTMLDivElement | null>(null)
	const popover = usePopoverStore({ placement })
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

	const selectedOption = useMemo(() => options.find((opt) => opt.value === selectedValue), [options, selectedValue])

	const selectedLabel = selectedOption?.label || placeholder

	const handleSelect = (option: VirtualizedSelectOption) => {
		if (!option.disabled) {
			onChange(option)
			popover.setOpen(false)
			setSearch('')
		}
	}

	return (
		<div className={className}>
			<label className="pro-text2 mb-1 block text-[11px] font-medium">{label}</label>
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
						<span className={`flex min-w-0 items-center gap-2 truncate ${selectedOption ? 'pro-text1' : 'pro-text3'}`}>
							{selectedOption?.icon && (
								<span className="text-sm" aria-hidden>
									{selectedOption.icon}
								</span>
							)}
							<span className="truncate">{selectedLabel}</span>
						</span>
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
									onChange={(e) => setSearch(e.target.value)}
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
											const isActive = option.value === selectedValue
											const iconUrl = renderIcon ? renderIcon(option) : option.logo
											return (
												<button
													key={option.value}
													onClick={() => handleSelect(option)}
													disabled={option.disabled}
													className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-all ${
														option.disabled
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
														{option.icon && (
															<span className="text-sm" aria-hidden>
																{option.icon}
															</span>
														)}
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
															{option.description && (
																<span className="truncate text-[10px] text-(--text-tertiary)">
																	{option.description}
																</span>
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
						</div>
					</Popover>
				</>
			)}
		</div>
	)
}
