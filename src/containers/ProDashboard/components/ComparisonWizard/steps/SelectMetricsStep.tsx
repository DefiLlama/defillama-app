import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useComparisonWizardContext } from '../ComparisonWizardContext'
import { MetricCard } from '../components/MetricCard'

export function SelectMetricsStep() {
	const { state, actions, availableMetrics } = useComparisonWizardContext()
	const [showInvalid, setShowInvalid] = useState(false)

	const validMetrics = useMemo(() => availableMetrics.filter((m) => m.isValid), [availableMetrics])
	const invalidMetrics = useMemo(() => availableMetrics.filter((m) => !m.isValid), [availableMetrics])

	const displayedMetrics = showInvalid ? availableMetrics : validMetrics

	const typeLabel = state.comparisonType === 'chains' ? 'chains' : 'protocols'

	return (
		<div className="flex flex-col gap-4">
			<div className="text-center">
				<h2 className="text-lg font-semibold text-(--text-primary)">Select Metrics to Compare</h2>
				<p className="mt-1 text-sm text-(--text-secondary)">
					Choose the metrics you want to compare across your selected {typeLabel}
				</p>
			</div>

			<div className="flex items-center justify-between rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/30 px-4 py-2.5">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--primary)/10">
						<Icon name="bar-chart-2" height={18} width={18} className="text-(--primary)" />
					</div>
					<div>
						<p className="text-sm font-medium text-(--text-primary)">{validMetrics.length} metrics available</p>
						<p className="text-xs text-(--text-tertiary)">Based on data availability for your selected {typeLabel}</p>
					</div>
				</div>
				{invalidMetrics.length > 0 && (
					<button
						type="button"
						onClick={() => setShowInvalid(!showInvalid)}
						className="text-xs text-(--text-tertiary) hover:text-(--primary)"
					>
						{showInvalid ? 'Hide' : 'Show'} unavailable ({invalidMetrics.length})
					</button>
				)}
			</div>

			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-(--text-secondary)">
					{state.selectedMetrics.length} metric{state.selectedMetrics.length !== 1 ? 's' : ''} selected
				</span>
				<div className="flex items-center gap-3">
					{state.selectedMetrics.length < validMetrics.length && (
						<button
							type="button"
							onClick={() => actions.selectAllMetrics(validMetrics.map((m) => m.metric))}
							className="text-xs text-(--text-tertiary) hover:text-(--primary)"
						>
							Select all
						</button>
					)}
					{state.selectedMetrics.length > 0 && (
						<button
							type="button"
							onClick={() => actions.clearMetrics()}
							className="text-xs text-(--text-tertiary) hover:text-(--primary)"
						>
							Clear
						</button>
					)}
				</div>
			</div>

			<div className="thin-scrollbar max-h-[340px] overflow-y-auto rounded-lg">
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{displayedMetrics.map((metric) => (
						<MetricCard
							key={metric.metric}
							metric={metric}
							isSelected={state.selectedMetrics.includes(metric.metric)}
							onToggle={() => actions.toggleMetric(metric.metric)}
							disabled={!metric.isValid}
							itemLabel={typeLabel}
						/>
					))}
				</div>
			</div>

			{displayedMetrics.length === 0 && (
				<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/30 p-8 text-center">
					<Icon name="alert-triangle" height={32} width={32} className="mx-auto mb-3 text-amber-500" />
					<p className="font-medium text-(--text-primary)">No metrics available</p>
					<p className="mt-1 text-sm text-(--text-tertiary)">
						The selected {typeLabel} don't have enough common metrics to compare. Try selecting different {typeLabel}.
					</p>
				</div>
			)}

			<p
				className={`text-center text-sm text-amber-500 ${
					state.selectedMetrics.length === 0 && validMetrics.length > 0 ? 'visible' : 'invisible'
				}`}
			>
				Select at least 1 metric to continue
			</p>
		</div>
	)
}
