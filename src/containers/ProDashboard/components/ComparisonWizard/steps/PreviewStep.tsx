import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useProDashboard } from '../../../ProDashboardAPIContext'
import { CHART_TYPES } from '../../../types'
import { useComparisonWizardContext } from '../ComparisonWizardContext'
import type { DisplayMode, GroupingInterval } from '../types'

const GROUPING_OPTIONS: { value: GroupingInterval; label: string }[] = [
	{ value: 'day', label: 'Day' },
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: 'quarter', label: 'Quarter' }
]

const DISPLAY_OPTIONS: { value: DisplayMode; label: string }[] = [
	{ value: 'default', label: 'Default' },
	{ value: 'stacked', label: 'Stacked' },
	{ value: 'cumulative', label: 'Cumulative' },
	{ value: 'percentage', label: 'Percentage' }
]

export function PreviewStep() {
	const { state, actions } = useComparisonWizardContext()
	const { getProtocolInfo } = useProDashboard()
	const [tagInput, setTagInput] = useState('')

	const typeLabel = state.comparisonType === 'chains' ? 'chains' : 'protocols'

	const selectedItemLabels = useMemo(() => {
		return state.selectedItems.map((item) => {
			if (state.comparisonType === 'chains') {
				return item
			}
			return getProtocolInfo(item)?.name || item
		})
	}, [state.selectedItems, state.comparisonType, getProtocolInfo])

	const selectedMetricLabels = useMemo(() => {
		return state.selectedMetrics.map((metric) => {
			const info = CHART_TYPES[metric as keyof typeof CHART_TYPES]
			return info?.title || metric
		})
	}, [state.selectedMetrics])

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

	return (
		<div className="grid grid-cols-2 gap-6">
			<div className="flex flex-col gap-4">
				<div>
					<label className="mb-1.5 block text-sm font-medium text-(--text-primary)">
						Dashboard Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={state.dashboardName}
						onChange={(e) => actions.setDashboardName(e.target.value)}
						placeholder="Enter dashboard name"
						className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-(--text-primary)">Visibility</label>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => actions.setVisibility('public')}
							className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
								state.visibility === 'public'
									? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
									: 'border-(--form-control-border) text-(--text-secondary) hover:border-(--primary)/40'
							}`}
						>
							<Icon name="earth" height={14} width={14} />
							Public
						</button>
						<button
							type="button"
							onClick={() => actions.setVisibility('private')}
							className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
								state.visibility === 'private'
									? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
									: 'border-(--form-control-border) text-(--text-secondary) hover:border-(--primary)/40'
							}`}
						>
							<Icon name="key" height={14} width={14} />
							Private
						</button>
					</div>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-(--text-primary)">Description</label>
					<textarea
						value={state.description}
						onChange={(e) => actions.setDescription(e.target.value)}
						placeholder="Describe your dashboard..."
						rows={2}
						className="w-full resize-none rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-(--text-primary)">Tags</label>
					<div className="flex gap-2">
						<input
							type="text"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={handleTagKeyDown}
							placeholder="Add tags..."
							className="flex-1 rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
						<button
							type="button"
							onClick={handleAddTag}
							disabled={!tagInput.trim()}
							className="rounded-md border border-(--form-control-border) px-3 py-2 text-sm font-medium text-(--text-secondary) transition-colors hover:border-(--primary)/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Add
						</button>
					</div>
					{state.tags.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1.5">
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

				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-(--text-primary)">
							<Icon name="calendar" height={14} width={14} />
							Grouping
						</label>
						<select
							value={state.grouping}
							onChange={(e) => actions.setGrouping(e.target.value as GroupingInterval)}
							className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						>
							{GROUPING_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-(--text-primary)">
							<Icon name="layers" height={14} width={14} />
							Display
						</label>
						<select
							value={state.displayMode}
							onChange={(e) => actions.setDisplayMode(e.target.value as DisplayMode)}
							className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						>
							{DISPLAY_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/30 p-4">
					<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
						<Icon name="file-text" height={16} width={16} />
						Preview
					</h3>
					<div className="space-y-2.5 text-sm">
						<div className="flex items-center justify-between gap-4">
							<span className="text-(--text-tertiary)">
								{state.selectedItems.length === 1 ? 'Dashboard for' : 'Comparing'}
							</span>
							<span className="font-medium text-(--text-primary)">
								{state.selectedItems.length === 1
									? selectedItemLabels[0]
									: `${state.selectedItems.length} ${typeLabel}`}
							</span>
						</div>
						{state.selectedItems.length > 1 && (
							<div className="flex items-start justify-between gap-4">
								<span className="text-(--text-tertiary)">{typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}</span>
								<span
									className="max-w-[180px] truncate text-right text-(--text-secondary)"
									title={selectedItemLabels.join(', ')}
								>
									{selectedItemLabels.join(', ')}
								</span>
							</div>
						)}
						<div className="flex items-start justify-between gap-4">
							<span className="text-(--text-tertiary)">Metrics</span>
							<span
								className="max-w-[180px] truncate text-right text-(--text-secondary)"
								title={selectedMetricLabels.join(', ')}
							>
								{selectedMetricLabels.join(', ')}
							</span>
						</div>
						<div className="flex items-center justify-between gap-4">
							<span className="text-(--text-tertiary)">Charts</span>
							<span className="font-medium text-(--primary)">
								{state.selectedMetrics.length} chart{state.selectedMetrics.length !== 1 ? 's' : ''}
							</span>
						</div>
						<div className="flex items-center justify-between gap-4">
							<span className="text-(--text-tertiary)">Grouping</span>
							<span className="text-(--text-secondary)">{state.grouping}</span>
						</div>
						<div className="flex items-center justify-between gap-4">
							<span className="text-(--text-tertiary)">Display</span>
							<span className="text-(--text-secondary)">{state.displayMode}</span>
						</div>
					</div>
				</div>

				<div className="flex-1 rounded-lg border border-dashed border-(--cards-border) bg-(--cards-bg-alt)/10 p-4">
					<div className="flex h-full flex-col items-center justify-center text-center">
						<Icon name="bar-chart" height={32} width={32} className="mb-2 text-(--text-tertiary)" />
						<p className="text-sm font-medium text-(--text-secondary)">
							{state.selectedMetrics.length} chart{state.selectedMetrics.length !== 1 ? 's' : ''} will be created
						</p>
						<p className="mt-1 text-xs text-(--text-tertiary)">
							Comparing {selectedItemLabels.slice(0, 3).join(', ')}
							{selectedItemLabels.length > 3 && ` +${selectedItemLabels.length - 3} more`}
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
