import { useMemo } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from './LoadingSpinner'

export interface SelectOption {
	value: string
	label: string
	icon?: string
	disabled?: boolean
}

interface AriakitSelectProps {
	label?: string
	options: SelectOption[]
	selectedValue: string | null
	onChange: (option: SelectOption) => void
	placeholder?: string
	isLoading?: boolean
	className?: string
}

export function AriakitSelect({
	label,
	options,
	selectedValue,
	onChange,
	placeholder = 'Select...',
	isLoading = false,
	className = ''
}: AriakitSelectProps) {
	const popover = usePopoverStore({ placement: 'bottom-start' })

	const selectedLabel = useMemo(() => {
		if (!selectedValue) return placeholder
		const selected = options.find((opt) => opt.value === selectedValue)
		return selected?.label || selectedValue
	}, [selectedValue, options, placeholder])

	return (
		<div className={className}>
			{label && <label className="pro-text2 mb-1 block text-[11px] font-medium">{label}</label>}
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
						<span className={`truncate ${selectedValue ? 'pro-text1' : 'pro-text3'}`}>{selectedLabel}</span>
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
						<div className="thin-scrollbar max-h-[280px] overflow-y-auto p-1">
							{options.length === 0 && (
								<div className="pro-text3 px-3 py-2 text-center text-xs">No options available.</div>
							)}
							{options.map((option) => {
								const isActive = option.value === selectedValue
								return (
									<button
										key={option.value}
										type="button"
										onClick={() => {
											if (!option.disabled) {
												onChange(option)
												popover.setOpen(false)
											}
										}}
										disabled={option.disabled}
										className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
											option.disabled
												? 'pro-text3 cursor-not-allowed opacity-50'
												: isActive
													? 'bg-(--primary)/10 font-semibold text-(--primary)'
													: 'pro-text2 hover:bg-(--cards-bg-alt)'
										}`}
									>
										<div className="flex items-center gap-2">
											{option.icon && <Icon name={option.icon as any} width={14} height={14} />}
											<span className="truncate">{option.label}</span>
										</div>
										{isActive && (
											<Icon name="check" width={12} height={12} className="ml-2 flex-shrink-0 text-(--primary)" />
										)}
									</button>
								)
							})}
						</div>
					</Popover>
				</>
			)}
		</div>
	)
}
