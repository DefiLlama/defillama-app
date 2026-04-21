import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { FormatSplitButton } from '../FormatSplitButton'
import type { ChartConfig } from './chartConfig'
import { exportQueryResult, type QueryResult } from './exportResults'
import { ResultsChart } from './ResultsChart'
import { ResultsGrid } from './ResultsGrid'

type ResultsView = 'table' | 'chart'

interface ResultsPanelProps {
	result: QueryResult | null
	running: boolean
	busyLabel?: string | null
	chartConfig: ChartConfig | undefined
	onChartConfigChange: (next: ChartConfig | null) => void
	preferredView?: ResultsView
	onConsumePreferredView?: () => void
}

export function ResultsPanel({
	result,
	running,
	busyLabel,
	chartConfig,
	onChartConfigChange,
	preferredView,
	onConsumePreferredView
}: ResultsPanelProps) {
	const [view, setView] = useState<ResultsView>(preferredView ?? 'table')

	const resultId = result ? `${result.columns.map((c) => c.name).join('|')}:${result.rows.length}` : ''
	const [prevResultId, setPrevResultId] = useState(resultId)
	if (prevResultId !== resultId) {
		setPrevResultId(resultId)
		if (preferredView) {
			setView(preferredView)
			onConsumePreferredView?.()
		} else {
			setView('table')
		}
	}

	const busy = running || !!busyLabel
	const busyMessage = busyLabel ?? (running ? 'Running query…' : null)

	if (!result && !busy) {
		return (
			<div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-(--divider) bg-(--cards-bg)/40 px-6 py-10 text-center">
				<Icon name="bar-chart-2" className="h-5 w-5 text-(--text-tertiary)" />
				<p className="text-sm text-(--text-secondary)">
					Run a query to see results here. Press{' '}
					<kbd className="inline-flex h-[17px] items-center rounded-[3px] border border-(--divider) bg-(--app-bg) px-1 font-mono text-[10px] text-(--text-secondary)">
						⌘
					</kbd>{' '}
					<kbd className="inline-flex h-[17px] items-center rounded-[3px] border border-(--divider) bg-(--app-bg) px-1 font-mono text-[10px] text-(--text-secondary)">
						↵
					</kbd>{' '}
					or click <span className="font-medium text-(--text-primary)">Run query</span>.
				</p>
			</div>
		)
	}

	if (!result && busy) {
		return (
			<div className="flex h-24 items-center justify-center gap-2.5 rounded-md border border-(--divider) bg-(--cards-bg) px-4 text-sm text-(--text-secondary)">
				<LoadingSpinner size={14} />
				<span>{busyMessage}</span>
			</div>
		)
	}

	if (!result) return null

	const isEmpty = result.rows.length === 0

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-baseline gap-2">
					<h3 className="text-sm font-semibold tracking-tight text-(--text-primary)">Results</h3>
					<span className="text-xs text-(--text-tertiary) tabular-nums">
						{result.rows.length.toLocaleString()} row{result.rows.length === 1 ? '' : 's'} · {result.columns.length} col
						{result.columns.length === 1 ? '' : 's'}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<ViewToggle view={view} onChange={setView} disabled={isEmpty} />
					<FormatSplitButton
						disabled={isEmpty}
						label="Export"
						onDownload={(format) => exportQueryResult(result, format)}
					/>
				</div>
			</div>
			{view === 'chart' ? (
				<ResultsChart result={result} chartConfig={chartConfig} onChartConfigChange={onChartConfigChange} />
			) : (
				<ResultsGrid result={result} />
			)}
		</div>
	)
}

function ViewToggle({
	view,
	onChange,
	disabled
}: {
	view: ResultsView
	onChange: (next: ResultsView) => void
	disabled?: boolean
}) {
	return (
		<div
			role="tablist"
			aria-label="Results view"
			className={`inline-flex items-center gap-0.5 rounded-md border border-(--divider) bg-(--cards-bg) p-0.5 ${
				disabled ? 'pointer-events-none opacity-50' : ''
			}`}
		>
			<ToggleButton active={view === 'table'} onClick={() => onChange('table')} label="Table" icon="layout-grid" />
			<ToggleButton active={view === 'chart'} onClick={() => onChange('chart')} label="Chart" icon="bar-chart-2" />
		</div>
	)
}

function ToggleButton({
	active,
	onClick,
	label,
	icon
}: {
	active: boolean
	onClick: () => void
	label: string
	icon: 'layout-grid' | 'bar-chart-2'
}) {
	return (
		<button
			role="tab"
			type="button"
			aria-selected={active}
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-medium transition-colors ${
				active
					? 'bg-(--primary) text-white shadow-sm'
					: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
			}`}
		>
			<Icon name={icon} className="h-3 w-3" />
			{label}
		</button>
	)
}
