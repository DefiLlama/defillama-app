import { useMemo } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { CHART_TYPES } from '../../types'
import { LoadingSpinner } from '../LoadingSpinner'

interface ChartTypeSingleSelectorProps {
	selectedChartType: string | null
	availableChartTypes: string[]
	chartTypes: string[]
	isLoading: boolean
	onChange: (chartType: string) => void
}

export function ChartTypeSingleSelector({
	selectedChartType,
	availableChartTypes,
	chartTypes,
	isLoading,
	onChange
}: ChartTypeSingleSelectorProps) {
	const popover = usePopoverStore({ placement: 'bottom-start' })

	const options = useMemo(
		() =>
			chartTypes
				.filter((key) => availableChartTypes.includes(key))
				.map((key) => ({ value: key, label: CHART_TYPES[key as keyof typeof CHART_TYPES]?.title || key })),
		[chartTypes, availableChartTypes]
	)

	const selectedLabel = useMemo(() => {
		if (!selectedChartType) return 'Select chart type...'
		return CHART_TYPES[selectedChartType as keyof typeof CHART_TYPES]?.title || selectedChartType
	}, [selectedChartType])

	return (
		<div className="flex flex-col">
			<label className="pro-text2 mb-2 text-xs font-medium">Select Chart Type</label>
			{isLoading ? (
				<div className="flex h-10 items-center justify-center rounded-md border border-(--form-control-border) bg-(--bg-input)">
					<LoadingSpinner size="sm" />
				</div>
			) : (
				<>
					<PopoverDisclosure
						store={popover}
						className="flex w-full items-center justify-between rounded-md border border-(--form-control-border) bg-(--bg-input) px-2.5 py-1.5 text-xs transition-colors hover:border-(--primary)/40 focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					>
						<span className={`truncate ${selectedChartType ? 'text-(--text-primary)' : 'text-(--text-tertiary)'}`}>
							{selectedLabel}
						</span>
						<Icon name="chevron-down" width={12} height={12} className="ml-2 flex-shrink-0 opacity-70" />
					</PopoverDisclosure>
					<Popover
						store={popover}
						modal={false}
						className="z-50 rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-lg"
						style={{ width: 'var(--popover-anchor-width)' }}
					>
						<div className="thin-scrollbar max-h-[280px] overflow-y-auto p-1">
							{options.length === 0 && (
								<div className="pro-text3 px-3 py-2 text-center text-xs">No chart types available.</div>
							)}
							{options.map((option) => {
								const isActive = option.value === selectedChartType
								return (
									<button
										key={option.value}
										type="button"
										onClick={() => {
											onChange(option.value)
											popover.setOpen(false)
										}}
										className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-(--cards-bg-alt) ${
											isActive ? 'bg-(--primary)/10 font-semibold text-(--primary)' : 'text-(--text-secondary)'
										}`}
									>
										<span className="truncate">{option.label}</span>
										{isActive && <Icon name="check" width={12} height={12} className="ml-2 flex-shrink-0 text-(--primary)" />}
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
