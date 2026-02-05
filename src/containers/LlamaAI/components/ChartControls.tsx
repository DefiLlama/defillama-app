import { Select } from '~/components/Select'
import { Tooltip } from '~/components/Tooltip'
import { capitalizeFirstLetter } from '~/utils'
import type { ChartConfiguration } from '../types'

const CUMULATIVE_DISPLAY_OPTIONS = [
	{ name: 'Show individual values', key: 'Individual' },
	{ name: 'Show cumulative values', key: 'Cumulative' }
]

const STACKING_DISPLAY_OPTIONS = [
	{ name: 'Show separate', key: 'Separate' },
	{ name: 'Show stacked', key: 'Stacked' }
]

const VALUE_TYPE_OPTIONS = [
	{ name: 'Show absolute ($)', key: '$ Absolute' },
	{ name: 'Show percentage (%)', key: '% Percentage' }
]

const HALLMARK_OPTIONS = [
	{ name: 'Show hallmarks', key: 'Show Hallmarks' },
	{ name: 'Hide hallmarks', key: 'Hide Hallmarks' }
]

const LABEL_OPTIONS = [
	{ name: 'Show labels', key: 'Show' },
	{ name: 'Hide labels', key: 'Hide' }
]

interface ChartControlsProps {
	displayOptions: ChartConfiguration['displayOptions']
	stacked: boolean
	percentage: boolean
	cumulative: boolean
	grouping: 'day' | 'week' | 'month' | 'quarter'
	dataLength: number
	showHallmarks: boolean
	hasHallmarks: boolean
	showLabels: boolean
	isScatter: boolean
	onStackedChange: (stacked: boolean) => void
	onPercentageChange: (percentage: boolean) => void
	onCumulativeChange: (cumulative: boolean) => void
	onGroupingChange: (grouping: 'day' | 'week' | 'month' | 'quarter') => void
	onHallmarksChange: (showHallmarks: boolean) => void
	onLabelsChange: (showLabels: boolean) => void
}

export function ChartControls({
	displayOptions,
	stacked,
	percentage,
	cumulative,
	grouping,
	dataLength,
	showHallmarks,
	hasHallmarks,
	showLabels,
	isScatter,
	onStackedChange,
	onPercentageChange,
	onCumulativeChange,
	onGroupingChange,
	onHallmarksChange,
	onLabelsChange
}: ChartControlsProps) {
	if (!displayOptions) return null

	const { canStack, canShowPercentage, canShowCumulative, supportsGrouping } = displayOptions

	const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = [
		'day',
		...(dataLength >= 28 ? ['week' as const] : []),
		...(dataLength >= 90 ? ['month' as const] : []),
		...(dataLength >= 360 ? ['quarter' as const] : [])
	]

	const showGrouping = supportsGrouping && groupingOptions.length > 1

	if (
		!showGrouping &&
		!canShowCumulative &&
		!(canStack && !cumulative) &&
		!canShowPercentage &&
		!hasHallmarks &&
		!isScatter
	)
		return null

	return (
		<div className="mb-2 flex flex-wrap items-center justify-end gap-2 border-b border-gray-200 p-2 pt-0 dark:border-gray-700">
			{showGrouping && (
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
					{groupingOptions.map((interval) => (
						<Tooltip
							content={capitalizeFirstLetter(interval)}
							render={<button />}
							className="shrink-0 px-2 py-1 text-xs whitespace-nowrap hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue data-[active=true]:bg-(--old-blue) data-[active=true]:font-medium data-[active=true]:text-white"
							data-active={grouping === interval}
							onClick={() => onGroupingChange(interval)}
							key={`grouping-${interval}`}
						>
							{interval.slice(0, 1).toUpperCase()}
						</Tooltip>
					))}
				</div>
			)}

			{canShowCumulative && (
				<Select
					allValues={CUMULATIVE_DISPLAY_OPTIONS}
					selectedValues={cumulative ? 'Cumulative' : 'Individual'}
					setSelectedValues={(value) => {
						onCumulativeChange(value === 'Cumulative')
						if (value === 'Cumulative') {
							onStackedChange(false)
						}
					}}
					label={cumulative ? 'Cumulative' : 'Individual'}
					labelType="none"
					variant="pro"
				/>
			)}

			{canStack && !cumulative && (
				<Select
					allValues={STACKING_DISPLAY_OPTIONS}
					selectedValues={stacked ? 'Stacked' : 'Separate'}
					setSelectedValues={(value) => {
						const isStacked = value === 'Stacked'
						onStackedChange(isStacked)
					}}
					label={stacked ? 'Stacked' : 'Separate'}
					labelType="none"
					variant="pro"
				/>
			)}

			{canShowPercentage && (
				<Select
					allValues={VALUE_TYPE_OPTIONS}
					selectedValues={percentage ? '% Percentage' : '$ Absolute'}
					setSelectedValues={(value) => {
						onPercentageChange(value === '% Percentage')
					}}
					label={percentage ? '% Percentage' : '$ Absolute'}
					labelType="none"
					variant="pro"
				/>
			)}

			{hasHallmarks && (
				<Select
					allValues={HALLMARK_OPTIONS}
					selectedValues={showHallmarks ? 'Show Hallmarks' : 'Hide Hallmarks'}
					setSelectedValues={(value) => {
						onHallmarksChange(value === 'Show Hallmarks')
					}}
					label={showHallmarks ? 'Hallmarks: On' : 'Hallmarks: Off'}
					labelType="none"
					variant="pro"
				/>
			)}

			{isScatter && (
				<Select
					allValues={LABEL_OPTIONS}
					selectedValues={showLabels ? 'Show' : 'Hide'}
					setSelectedValues={(value) => {
						onLabelsChange(value === 'Show')
					}}
					label={showLabels ? 'Labels: On' : 'Labels: Off'}
					labelType="none"
					variant="pro"
				/>
			)}
		</div>
	)
}
