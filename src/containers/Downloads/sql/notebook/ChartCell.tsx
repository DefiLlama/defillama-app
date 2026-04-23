import { Icon } from '~/components/Icon'
import type { ChartConfig } from '../chartConfig'
import { ResultsChart } from '../ResultsChart'
import type { NotebookCell } from '../useSqlTabs'

export interface ChartSourceOption {
	name: string
	cellId: string
	hasRun: boolean
	result: NotebookCell['result']
}

interface ChartCellProps {
	cell: NotebookCell
	availableSources: ChartSourceOption[]
	onSourceChange: (sourceName: string) => void
	onChartConfigChange: (next: ChartConfig | null) => void
}

function describeShape(opt: ChartSourceOption): string {
	if (!opt.hasRun || !opt.result) return 'not run'
	const rows = opt.result.rows.length
	const cols = opt.result.columns.length
	return `${rows.toLocaleString()}×${cols}`
}

export function ChartCell({ cell, availableSources, onSourceChange, onChartConfigChange }: ChartCellProps) {
	const selected = availableSources.find((s) => s.name === cell.source) ?? null
	const result = selected?.result ?? null
	const selectedCols = selected?.result?.columns ?? []

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-(--divider) bg-(--cards-bg)/60 px-2.5 py-1.5 text-xs">
				<span className="text-(--text-tertiary)">Source</span>
				{availableSources.length === 0 ? (
					<span className="text-(--text-tertiary) italic">
						Add a SQL cell and run it first — chart cells visualize prior cell output.
					</span>
				) : (
					<select
						value={cell.source}
						onChange={(e) => onSourceChange(e.target.value)}
						className="rounded-sm border border-(--divider) bg-(--app-bg) px-1.5 py-0.5 font-mono text-xs text-(--text-primary) outline-none focus:border-(--primary)"
					>
						<option value="">— pick cell —</option>
						{availableSources.map((s) => (
							<option key={s.cellId} value={s.name}>
								{s.name} · {describeShape(s)}
							</option>
						))}
					</select>
				)}
				{selected && !selected.hasRun ? (
					<span className="inline-flex items-center gap-1 text-pro-gold-300">
						<Icon name="alert-triangle" className="h-3 w-3" />
						source not yet run
					</span>
				) : selected?.result ? (
					<span className="inline-flex min-w-0 items-center gap-1.5 text-(--text-tertiary)">
						<span className="text-(--text-secondary) tabular-nums">{selected.result.rows.length.toLocaleString()}</span>
						rows
						<span aria-hidden>·</span>
						<span className="flex min-w-0 flex-wrap items-center gap-1">
							{selectedCols.slice(0, 4).map((c) => (
								<span key={c.name} className="truncate font-mono text-[10.5px] text-(--text-secondary)">
									{c.name}
								</span>
							))}
							{selectedCols.length > 4 ? (
								<span className="text-[10.5px] text-(--text-tertiary)">+{selectedCols.length - 4}</span>
							) : null}
						</span>
					</span>
				) : null}
			</div>

			{result ? (
				<ResultsChart result={result} chartConfig={cell.chartConfig} onChartConfigChange={onChartConfigChange} />
			) : (
				<div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-(--divider) bg-(--cards-bg)/40 px-6 py-10 text-center">
					<Icon name="bar-chart-2" className="h-5 w-5 text-(--text-tertiary)" />
					<p className="text-sm text-(--text-secondary)">
						{cell.source
							? `${cell.source} has no results yet — run it first.`
							: 'Pick a source cell above to visualize its output.'}
					</p>
				</div>
			)}
		</div>
	)
}
