import { Select } from '~/components/Select/Select'
import { Tooltip } from '~/components/Tooltip'
import type { ChartControlsModel } from '~/containers/LlamaAI/utils/chartCapabilities'
import { capitalizeFirstLetter } from '~/utils'
import { trackUmamiEvent } from '~/utils/analytics/umami'

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
	controls: ChartControlsModel
	onStackedChange: (stacked: boolean) => void
	onPercentageChange: (percentage: boolean) => void
	onCumulativeChange: (cumulative: boolean) => void
	onGroupingChange: (grouping: 'day' | 'week' | 'month' | 'quarter') => void
	onHallmarksChange: (showHallmarks: boolean) => void
	onLabelsChange: (showLabels: boolean) => void
	children?: React.ReactNode
}

export function ChartControls({
	controls,
	onStackedChange,
	onPercentageChange,
	onCumulativeChange,
	onGroupingChange,
	onHallmarksChange,
	onLabelsChange,
	children
}: ChartControlsProps) {
	const hasControls =
		controls.showGrouping ||
		controls.showCumulative ||
		controls.showStack ||
		controls.showPercentage ||
		controls.showHallmarks ||
		controls.showLabels

	if (!hasControls && !children && !controls.title) return null

	return (
		<div className="flex flex-wrap items-center justify-end gap-1 border-b border-[#e6e6e6] p-2 pt-0 dark:border-[#222324]">
			{controls.title ? <p className="mr-auto text-base font-semibold">{controls.title}</p> : null}
			{controls.showGrouping ? (
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
					{controls.groupingOptions.map((interval) => (
						<Tooltip
							content={capitalizeFirstLetter(interval)}
							render={<button />}
							className="inline-flex min-w-8 items-center justify-center px-3 py-1.5 text-xs whitespace-nowrap hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue data-[active=true]:bg-(--old-blue) data-[active=true]:font-medium data-[active=true]:text-white"
							data-active={controls.state.grouping === interval}
							onClick={() => {
								trackUmamiEvent('llamaai-chart-control', { control: 'grouping', selection: interval })
								onGroupingChange(interval)
							}}
							key={`grouping-${interval}`}
						>
							{interval.slice(0, 1).toUpperCase()}
						</Tooltip>
					))}
				</div>
			) : null}

			{controls.showCumulative ? (
				<Select
					allValues={CUMULATIVE_DISPLAY_OPTIONS}
					selectedValues={controls.state.cumulative ? 'Cumulative' : 'Individual'}
					setSelectedValues={(value: string) => {
						trackUmamiEvent('llamaai-chart-control', { control: 'cumulative', selection: value })
						onCumulativeChange(value === 'Cumulative')
						if (value === 'Cumulative') {
							onStackedChange(false)
						}
					}}
					label={controls.state.cumulative ? 'Cumulative' : 'Individual'}
					labelType="none"
					variant="filter"
				/>
			) : null}

			{controls.showStack ? (
				<Select
					allValues={STACKING_DISPLAY_OPTIONS}
					selectedValues={controls.state.stacked ? 'Stacked' : 'Separate'}
					setSelectedValues={(value: string) => {
						trackUmamiEvent('llamaai-chart-control', { control: 'stacking', selection: value })
						const isStacked = value === 'Stacked'
						onStackedChange(isStacked)
					}}
					label={controls.state.stacked ? 'Stacked' : 'Separate'}
					labelType="none"
					variant="filter"
				/>
			) : null}

			{controls.showPercentage ? (
				<Select
					allValues={VALUE_TYPE_OPTIONS}
					selectedValues={controls.state.percentage ? '% Percentage' : '$ Absolute'}
					setSelectedValues={(value: string) => {
						trackUmamiEvent('llamaai-chart-control', { control: 'value-type', selection: value })
						onPercentageChange(value === '% Percentage')
					}}
					label={controls.state.percentage ? '% Percentage' : '$ Absolute'}
					labelType="none"
					variant="filter"
				/>
			) : null}

			{controls.showHallmarks ? (
				<Select
					allValues={HALLMARK_OPTIONS}
					selectedValues={controls.state.showHallmarks ? 'Show Hallmarks' : 'Hide Hallmarks'}
					setSelectedValues={(value: string) => {
						trackUmamiEvent('llamaai-chart-control', { control: 'hallmarks', selection: value })
						onHallmarksChange(value === 'Show Hallmarks')
					}}
					label={controls.state.showHallmarks ? 'Hallmarks: On' : 'Hallmarks: Off'}
					labelType="none"
					variant="filter"
				/>
			) : null}

			{controls.showLabels ? (
				<Select
					allValues={LABEL_OPTIONS}
					selectedValues={controls.state.showLabels ? 'Show' : 'Hide'}
					setSelectedValues={(value: string) => {
						trackUmamiEvent('llamaai-chart-control', { control: 'labels', selection: value })
						onLabelsChange(value === 'Show')
					}}
					label={controls.state.showLabels ? 'Labels: On' : 'Labels: Off'}
					labelType="none"
					variant="filter"
				/>
			) : null}
			{children}
		</div>
	)
}
