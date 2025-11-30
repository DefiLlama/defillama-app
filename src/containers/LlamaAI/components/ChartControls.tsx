import { memo } from 'react'
import { Select } from '~/components/Select'
import { Tooltip } from '~/components/Tooltip'
import { capitalizeFirstLetter } from '~/utils'
import type { ChartConfiguration } from '../types'

interface ChartControlsProps {
	displayOptions: ChartConfiguration['displayOptions']
	stacked: boolean
	percentage: boolean
	cumulative: boolean
	grouping: 'day' | 'week' | 'month' | 'quarter'
	dataLength: number
	showHallmarks: boolean
	hasHallmarks: boolean
	onStackedChange: (stacked: boolean) => void
	onPercentageChange: (percentage: boolean) => void
	onCumulativeChange: (cumulative: boolean) => void
	onGroupingChange: (grouping: 'day' | 'week' | 'month' | 'quarter') => void
	onHallmarksChange: (showHallmarks: boolean) => void
}

export const ChartControls = memo(function ChartControls({
	displayOptions,
	stacked,
	percentage,
	cumulative,
	grouping,
	dataLength,
	showHallmarks,
	hasHallmarks,
	onStackedChange,
	onPercentageChange,
	onCumulativeChange,
	onGroupingChange,
	onHallmarksChange
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

	if (!showGrouping && !canShowCumulative && !(canStack && !cumulative) && !canShowPercentage && !hasHallmarks) return null

	return (
		<div className="mb-2 flex flex-wrap items-center justify-end gap-2 border-b border-gray-200 p-2 pt-0 dark:border-gray-700">
			{showGrouping && (
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
					{groupingOptions.map((interval) => (
						<Tooltip
							content={capitalizeFirstLetter(interval)}
							render={<button />}
							className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue shrink-0 px-2 py-1 text-xs whitespace-nowrap data-[active=true]:bg-(--old-blue) data-[active=true]:font-medium data-[active=true]:text-white"
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
					allValues={[
						{ name: 'Show individual values', key: 'Individual' },
						{ name: 'Show cumulative values', key: 'Cumulative' }
					]}
					selectedValues={cumulative ? 'Cumulative' : 'Individual'}
					setSelectedValues={(value) => {
						onCumulativeChange(value === 'Cumulative')
						if (value === 'Cumulative') {
							onStackedChange(false)
						}
					}}
					label={cumulative ? 'Cumulative' : 'Individual'}
					labelType="none"
					triggerProps={{
						className:
							'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
					}}
				/>
			)}

			{canStack && !cumulative && (
				<Select
					allValues={[
						{ name: 'Show separate', key: 'Separate' },
						{ name: 'Show stacked', key: 'Stacked' }
					]}
					selectedValues={stacked ? 'Stacked' : 'Separate'}
					setSelectedValues={(value) => {
						const isStacked = value === 'Stacked'
						onStackedChange(isStacked)
					}}
					label={stacked ? 'Stacked' : 'Separate'}
					labelType="none"
					triggerProps={{
						className:
							'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
					}}
				/>
			)}

			{canShowPercentage && (
				<Select
					allValues={[
						{ name: 'Show absolute ($)', key: '$ Absolute' },
						{ name: 'Show percentage (%)', key: '% Percentage' }
					]}
					selectedValues={percentage ? '% Percentage' : '$ Absolute'}
					setSelectedValues={(value) => {
						onPercentageChange(value === '% Percentage')
					}}
					label={percentage ? '% Percentage' : '$ Absolute'}
					labelType="none"
					triggerProps={{
						className:
							'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
					}}
				/>
			)}

			{hasHallmarks && (
				<Select
					allValues={[
						{ name: 'Show hallmarks', key: 'Show Hallmarks' },
						{ name: 'Hide hallmarks', key: 'Hide Hallmarks' }
					]}
					selectedValues={showHallmarks ? 'Show Hallmarks' : 'Hide Hallmarks'}
					setSelectedValues={(value) => {
						onHallmarksChange(value === 'Show Hallmarks')
					}}
					label={showHallmarks ? 'Hallmarks: On' : 'Hallmarks: Off'}
					labelType="none"
					triggerProps={{
						className:
							'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
					}}
				/>
			)}
		</div>
	)
})
