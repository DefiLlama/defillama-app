import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useProDashboardCatalog } from '../../../ProDashboardAPIContext'
import { CHART_TYPES, MetricAggregator, MetricWindow } from '../../../types'
import { AriakitCheckbox } from '../../AriakitCheckbox'
import { AriakitSelect, SelectOption } from '../../AriakitSelect'
import { useComparisonWizardContext } from '../ComparisonWizardContext'
import type { DisplayMode, GroupingInterval } from '../types'

const GROUPING_OPTIONS: SelectOption[] = [
	{ value: 'day', label: 'Day' },
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: 'quarter', label: 'Quarter' }
]

const DISPLAY_OPTIONS: SelectOption[] = [
	{ value: 'default', label: 'Default' },
	{ value: 'stacked', label: 'Stacked' },
	{ value: 'cumulative', label: 'Cumulative' },
	{ value: 'percentage', label: 'Percentage' }
]

const AGGREGATOR_OPTIONS: SelectOption[] = [
	{ value: 'latest', label: 'Latest' },
	{ value: 'avg', label: 'Average' },
	{ value: 'sum', label: 'Total' },
	{ value: 'max', label: 'Max' },
	{ value: 'min', label: 'Min' },
	{ value: 'growth', label: 'Growth' }
]

const WINDOW_OPTIONS: SelectOption[] = [
	{ value: '7d', label: '7d' },
	{ value: '30d', label: '30d' },
	{ value: '90d', label: '90d' },
	{ value: '365d', label: '1y' },
	{ value: 'all', label: 'All' }
]

export function PreviewStep() {
	const { state, actions } = useComparisonWizardContext()
	const { getProtocolInfo } = useProDashboardCatalog()
	const [tagInput, setTagInput] = useState('')

	const selectedItemLabels = useMemo(() => {
		return state.selectedItems.map((item) => {
			if (state.comparisonType === 'chains') {
				return item
			}
			return getProtocolInfo(item)?.name || item
		})
	}, [state.selectedItems, state.comparisonType, getProtocolInfo])

	const handleAddTag = () => {
		const tag = tagInput.trim()
		if (tag && !state.tags.includes(tag)) {
			actions.setTags([...state.tags, tag])
		}
		setTagInput('')
	}

	const handleRemoveTag = (tag: string) => {
		actions.setTags(state.tags.filter((t) => t !== tag))
	}

	const handleTagKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleAddTag()
		}
	}

	const metricCardsCount = state.metricsForCards.length * state.selectedItems.length

	return (
		<div className="grid grid-cols-2 items-start gap-5">
			<div className="flex flex-col gap-3">
				<div>
					<label className="mb-1 block text-sm font-medium text-(--text-primary)">
						Dashboard Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={state.dashboardName}
						onChange={(e) => actions.setDashboardName(e.target.value)}
						placeholder="Enter dashboard name"
						className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-1.5 text-sm placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
				</div>

				<div className="flex items-center gap-3">
					<div className="flex-1">
						<label className="mb-1 block text-sm font-medium text-(--text-primary)">Visibility</label>
						<div className="flex gap-1.5">
							<button
								type="button"
								onClick={() => actions.setVisibility('public')}
								className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
									state.visibility === 'public'
										? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
										: 'border-(--form-control-border) text-(--text-secondary) hover:border-(--primary)/40'
								}`}
							>
								<Icon name="earth" height={12} width={12} />
								Public
							</button>
							<button
								type="button"
								onClick={() => actions.setVisibility('private')}
								className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
									state.visibility === 'private'
										? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
										: 'border-(--form-control-border) text-(--text-secondary) hover:border-(--primary)/40'
								}`}
							>
								<Icon name="key" height={12} width={12} />
								Private
							</button>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<AriakitSelect
						label="Grouping"
						options={GROUPING_OPTIONS}
						selectedValue={state.grouping}
						onChange={(opt) => actions.setGrouping(opt.value as GroupingInterval)}
					/>
					<AriakitSelect
						label="Display"
						options={DISPLAY_OPTIONS}
						selectedValue={state.displayMode}
						onChange={(opt) => actions.setDisplayMode(opt.value as DisplayMode)}
					/>
				</div>

				<div>
					<label className="mb-1 block text-sm font-medium text-(--text-primary)">Tags</label>
					<div className="flex gap-1.5">
						<input
							type="text"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={handleTagKeyDown}
							placeholder="Add tags..."
							className="flex-1 rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-sm placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
						<button
							type="button"
							onClick={handleAddTag}
							disabled={!tagInput.trim()}
							className="rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--primary)/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Add
						</button>
					</div>
					{state.tags.length > 0 && (
						<div className="mt-1.5 flex flex-wrap gap-1">
							{state.tags.map((tag) => (
								<span
									key={tag}
									className="flex items-center gap-1 rounded-full border border-(--cards-border) bg-(--cards-bg-alt)/50 px-2 py-0.5 text-xs"
								>
									{tag}
									<button
										type="button"
										onClick={() => handleRemoveTag(tag)}
										className="text-(--text-tertiary) hover:text-red-500"
									>
										<Icon name="x" height={10} width={10} />
									</button>
								</span>
							))}
						</div>
					)}
				</div>

				<div>
					<label className="mb-1 block text-sm font-medium text-(--text-primary)">
						Description <span className="text-xs font-normal text-(--text-tertiary)">(optional)</span>
					</label>
					<input
						type="text"
						value={state.description}
						onChange={(e) => actions.setDescription(e.target.value)}
						placeholder="Brief description..."
						className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-1.5 text-sm placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/30 p-3">
					<div className="mb-2 flex items-center justify-between">
						<h3 className="flex items-center gap-1.5 text-sm font-semibold text-(--text-primary)">
							<Icon name="activity" height={14} width={14} />
							Add Metric Cards
						</h3>
						<span className="text-xs text-(--text-tertiary)">Optional</span>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{state.selectedMetrics.map((metric) => {
							const info = CHART_TYPES[metric as keyof typeof CHART_TYPES]
							const label = info?.title || metric
							const isSelected = state.metricsForCards.includes(metric)
							return (
								<label
									key={metric}
									className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
										isSelected
											? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
											: 'border-(--form-control-border) text-(--text-secondary) hover:border-(--primary)/40'
									}`}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => actions.toggleMetricForCard(metric)}
										className="sr-only"
									/>
									{isSelected && <Icon name="check" height={10} width={10} />}
									{label}
								</label>
							)
						})}
					</div>
					{state.metricsForCards.length > 0 && (
						<div className="mt-2 flex items-center gap-2 border-t border-(--cards-border) pt-2">
							<AriakitSelect
								options={AGGREGATOR_OPTIONS}
								selectedValue={state.metricSettings.aggregator}
								onChange={(opt) => actions.setMetricSettings({ aggregator: opt.value as MetricAggregator })}
								className="min-w-[80px]"
							/>
							<AriakitSelect
								options={WINDOW_OPTIONS}
								selectedValue={state.metricSettings.window}
								onChange={(opt) => actions.setMetricSettings({ window: opt.value as MetricWindow })}
								className="min-w-[60px]"
							/>
						</div>
					)}
				</div>

				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/30 p-3">
					<AriakitCheckbox
						checked={state.includeTable}
						onChange={(checked) => actions.setIncludeTable(checked)}
						label={
							<span className="flex items-center gap-1.5 text-sm font-medium text-(--text-primary)">
								<Icon name="layout-grid" height={14} width={14} />
								Include Comparison Table
							</span>
						}
						description="Adds a data table showing detailed metrics for all compared items"
					/>
				</div>

				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/30 p-3">
					<h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-(--text-primary)">
						<Icon name="file-text" height={14} width={14} />
						Summary
					</h3>
					<div className="space-y-1.5 text-xs">
						<div className="flex items-center justify-between">
							<span className="text-(--text-tertiary)">Comparing</span>
							<span className="font-medium text-(--text-primary)">{selectedItemLabels.join(', ')}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-(--text-tertiary)">Output</span>
							<span className="font-medium text-(--primary)">
								{metricCardsCount > 0 && `${metricCardsCount} cards + `}
								{state.selectedMetrics.length} charts
								{state.includeTable && ' + 1 table'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
