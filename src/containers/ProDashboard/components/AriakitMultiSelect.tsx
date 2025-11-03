import { useMemo } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from './LoadingSpinner'

export interface MultiSelectOption {
	value: string
	label: string
	disabled?: boolean
}

interface AriakitMultiSelectProps {
	label: string
	options: MultiSelectOption[]
	selectedValues: string[]
	onChange: (values: string[]) => void
	placeholder?: string
	isLoading?: boolean
	className?: string
	maxSelections?: number
}

export function AriakitMultiSelect({
	label,
	options,
	selectedValues,
	onChange,
	placeholder = 'Select...',
	isLoading = false,
	className = '',
	maxSelections = 100
}: AriakitMultiSelectProps) {
	const popover = usePopoverStore({ placement: 'bottom-start' })

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

	const clearAll = () => {
		onChange([])
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
						className="z-50 rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-lg"
						style={{ width: 'var(--popover-anchor-width)' }}
					>
						<div className="p-1">
							<div className="thin-scrollbar max-h-[280px] overflow-y-auto">
								{options.length === 0 && (
									<div className="pro-text3 px-3 py-2 text-center text-xs">No options available.</div>
								)}
								{options.map((option) => {
									const isActive = selectedValues.includes(option.value)
									const isDisabled = option.disabled || (!isActive && isMaxReached)
									return (
										<button
											key={option.value}
											type="button"
											onClick={() => {
												if (!isDisabled) {
													toggleValue(option.value)
												}
											}}
											disabled={isDisabled}
											className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
												isDisabled
													? 'pro-text3 cursor-not-allowed opacity-50'
													: isActive
														? 'bg-(--primary)/10 text-(--primary)'
														: 'pro-text2 hover:bg-(--cards-bg-alt)'
											}`}
										>
											<div
												className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm border transition-colors ${
													isActive ? 'border-(--primary) bg-(--primary)' : 'pro-border border'
												}`}
											>
												{isActive && <Icon name="check" width={10} height={10} className="text-white" />}
											</div>
											<span className="truncate">{option.label}</span>
										</button>
									)
								})}
							</div>
							{selectedValues.length > 0 && (
								<div className="pro-border mt-1 border-t pt-1">
									<button
										type="button"
										onClick={clearAll}
										className="pro-text3 hover:pro-text1 w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-(--cards-bg-alt)"
									>
										Clear all
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
