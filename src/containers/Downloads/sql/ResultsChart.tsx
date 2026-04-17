// Visualizes a DuckDB query result as a chart.
//
// Auto-detects axis candidates from Arrow types (exposed on each column as a
// stringified type like "Int64", "Float64", "Utf8", "Date32<DAY>",
// "Timestamp<MILLISECOND, null>"...). A date column — either a real Date/
// Timestamp type or a Utf8 column that parses as ISO dates — makes the X
// axis a time axis and flips the chart to a line; otherwise the first string
// column becomes a categorical X and the chart becomes a bar.
//
// Y series are every numeric column except the chosen X. We clamp to 8 to
// keep the legend readable — the user can still re-pick via the checkbox
// popover.

import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { formatTooltipValue } from '~/components/ECharts/formatters'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import type { QueryResult } from './exportResults'

type ChartSeriesEntry = {
	data: Array<[number | string, number | null]>
	type: 'line' | 'bar'
	name: string
	color: string
}

type ChartType = 'line' | 'bar'

interface IMultiSeriesChartShim {
	series: ChartSeriesEntry[]
	xAxisType?: 'time' | 'category'
	height?: string
	hideDataZoom?: boolean
	valueSymbol?: string
	chartOptions?: Record<string, unknown>
}

const MultiSeriesChart = lazy(
	() => import('~/components/ECharts/MultiSeriesChart')
) as unknown as React.FC<IMultiSeriesChartShim>

const MAX_AUTO_SERIES = 8

export type ColumnKind = 'date' | 'number' | 'category' | 'other'

interface ClassifiedColumn {
	name: string
	kind: ColumnKind
}

interface ResultsChartProps {
	result: QueryResult
}

export function ResultsChart({ result }: ResultsChartProps) {
	const classified = useMemo(() => classifyColumns(result), [result])

	const defaults = useMemo(() => pickDefaults(classified), [classified])
	const [xCol, setXCol] = useState<string | null>(defaults.x)
	const [yCols, setYCols] = useState<string[]>(defaults.y)

	// Reset selections when the result's column shape changes (new query).
	const resultKey = useMemo(() => classified.map((c) => `${c.name}:${c.kind}`).join('|'), [classified])
	const [prevKey, setPrevKey] = useState(resultKey)
	if (prevKey !== resultKey) {
		setPrevKey(resultKey)
		setXCol(defaults.x)
		setYCols(defaults.y)
	}

	const xColumn = classified.find((c) => c.name === xCol) ?? null
	const numericColumns = useMemo(() => classified.filter((c) => c.kind === 'number'), [classified])
	const categoricalColumns = useMemo(
		() => classified.filter((c) => c.kind === 'date' || c.kind === 'category'),
		[classified]
	)

	const chartType: ChartType = xColumn?.kind === 'date' ? 'line' : 'bar'
	const xAxisType: 'time' | 'category' = xColumn?.kind === 'date' ? 'time' : 'category'

	// For category X, MultiSeriesChart's default tooltip tries to format
	// `value[0]` as a date (see useDefaults.tsx formatTooltipChartDate) — which
	// renders as "Invalid Date" for our string X values. Override the tooltip to
	// use the raw category label as the header.
	const chartOptions = useMemo<Record<string, unknown> | undefined>(() => {
		if (xAxisType === 'time') return undefined
		return {
			tooltip: {
				trigger: 'axis',
				confine: true,
				formatter: (params: Array<{ marker: string; seriesName: string; value: [string, number | null] }>) => {
					if (!Array.isArray(params) || params.length === 0) return ''
					const header = String(params[0]?.value?.[0] ?? '')
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
					const rows = [...params]
						.filter((p) => p.value?.[1] != null && p.value?.[1] !== 0)
						.sort((a, b) => Math.abs((b.value?.[1] as number) ?? 0) - Math.abs((a.value?.[1] as number) ?? 0))
						.slice(0, 10)
						.map(
							(p) =>
								`<li style="list-style:none">${p.marker}${p.seriesName}&nbsp;&nbsp;${formatTooltipValue(
									(p.value?.[1] as number) ?? 0,
									''
								)}</li>`
						)
						.join('')
					return `<div style="font-weight:600;margin-bottom:4px">${header}</div>${rows || '<div style="color:#999">No data</div>'}`
				}
			}
		}
	}, [xAxisType])

	const series = useMemo<ChartSeriesEntry[]>(() => {
		if (!xColumn || yCols.length === 0) return []
		const seriesList: ChartSeriesEntry[] = []
		for (let i = 0; i < yCols.length; i++) {
			const yName = yCols[i]
			const data: Array<[number | string, number | null]> = []
			for (const row of result.rows) {
				const xVal = toXValue(row[xColumn.name], xColumn.kind)
				if (xVal == null) continue
				const yVal = toYValue(row[yName])
				data.push([xVal, yVal])
			}
			seriesList.push({
				name: yName,
				type: chartType,
				color: CHART_COLORS[i % CHART_COLORS.length],
				data
			})
		}
		return seriesList
	}, [xColumn, yCols, result.rows, chartType])

	if (numericColumns.length === 0) {
		return (
			<EmptyState
				message="No numeric columns detected in this result — nothing to chart."
				hint="Tip: wrap non-numeric aggregates in CAST(... AS DOUBLE) or SUM(...) to make them chartable."
			/>
		)
	}

	if (!xColumn) {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)">
					<span>Pick an X axis to render the chart:</span>
					<AxisPicker label="X axis" options={classified.map((c) => c.name)} value={null} onChange={setXCol} />
				</div>
				<EmptyState message="All-numeric results need an X axis. Pick any column above to plot against it." />
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-(--text-secondary)">
				<div className="flex items-center gap-2">
					<span className="text-(--text-tertiary)">X:</span>
					<AxisPicker
						label="X axis"
						options={[...categoricalColumns, ...numericColumns].map((c) => c.name)}
						value={xCol}
						onChange={(next) => {
							setXCol(next)
							setYCols((prev) => prev.filter((y) => y !== next))
						}}
					/>
					<span className="text-[10px] text-(--text-tertiary)">
						{xColumn.kind === 'date' ? 'time' : xColumn.kind === 'number' ? 'numeric' : 'category'}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-(--text-tertiary)">Y:</span>
					<YSeriesPicker
						options={numericColumns.filter((c) => c.name !== xCol).map((c) => c.name)}
						selected={yCols}
						onChange={setYCols}
					/>
				</div>
				<span className="ml-auto text-[11px] text-(--text-tertiary)">
					{series.length === 0 ? '' : `${chartType === 'line' ? 'Line' : 'Bar'} · ${series.length} series`}
				</span>
			</div>

			{series.length === 0 ? (
				<EmptyState message="Pick at least one Y series to render the chart." />
			) : (
				<div className="rounded-md border border-(--divider) bg-(--cards-bg) p-2">
					<Suspense
						fallback={
							<div className="flex h-[360px] items-center justify-center">
								<LoadingSpinner size={18} />
							</div>
						}
					>
						<MultiSeriesChart
							series={series}
							xAxisType={xAxisType}
							height="360px"
							hideDataZoom={result.rows.length < 2}
							chartOptions={chartOptions}
						/>
					</Suspense>
				</div>
			)}
		</div>
	)
}

function AxisPicker({
	label,
	options,
	value,
	onChange
}: {
	label: string
	options: string[]
	value: string | null
	onChange: (next: string) => void
}) {
	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuButton
				aria-label={label}
				className="inline-flex max-w-[180px] items-center gap-1 rounded-md border border-(--divider) bg-(--bg-primary) px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg)"
			>
				<span className="truncate">{value ?? 'Select…'}</span>
				<Icon name="chevron-down" className="h-3 w-3 shrink-0" />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				gutter={4}
				className="z-50 max-h-64 overflow-auto rounded-md border border-(--divider) bg-(--cards-bg) p-1 shadow-lg"
			>
				{options.map((opt) => (
					<Ariakit.MenuItem
						key={opt}
						onClick={() => onChange(opt)}
						className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg) ${
							opt === value ? 'bg-(--link-hover-bg)' : ''
						}`}
					>
						<span className="truncate">{opt}</span>
					</Ariakit.MenuItem>
				))}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}

function YSeriesPicker({
	options,
	selected,
	onChange
}: {
	options: string[]
	selected: string[]
	onChange: (next: string[]) => void
}) {
	const label =
		selected.length === 0
			? 'None'
			: selected.length === 1
				? selected[0]
				: `${selected.length} series`
	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuButton
				aria-label="Y series"
				className="inline-flex max-w-[240px] items-center gap-1 rounded-md border border-(--divider) bg-(--bg-primary) px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg)"
			>
				<span className="truncate">{label}</span>
				<Icon name="chevron-down" className="h-3 w-3 shrink-0" />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				gutter={4}
				className="z-50 max-h-64 overflow-auto rounded-md border border-(--divider) bg-(--cards-bg) p-1 shadow-lg"
			>
				{options.length === 0 ? (
					<div className="px-2 py-1 text-[11px] text-(--text-tertiary)">No numeric columns available</div>
				) : (
					options.map((opt) => {
						const isSelected = selected.includes(opt)
						return (
							<Ariakit.MenuItem
								key={opt}
								hideOnClick={false}
								onClick={() => {
									if (isSelected) onChange(selected.filter((s) => s !== opt))
									else onChange([...selected, opt])
								}}
								className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 font-mono text-[11px] text-(--text-primary) hover:bg-(--link-hover-bg)"
							>
								<span
									className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border ${
										isSelected
											? 'border-(--primary) bg-(--primary) text-white'
											: 'border-(--divider) bg-(--bg-primary)'
									}`}
								>
									{isSelected ? (
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-2.5 w-2.5" aria-hidden>
											<polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									) : null}
								</span>
								<span className="truncate">{opt}</span>
							</Ariakit.MenuItem>
						)
					})
				)}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
	return (
		<div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-(--divider) bg-(--bg-primary)/40 px-6 py-10 text-center">
			<Icon name="bar-chart-2" className="h-5 w-5 text-(--text-tertiary)" />
			<p className="text-sm text-(--text-secondary)">{message}</p>
			{hint ? <p className="text-xs text-(--text-tertiary)">{hint}</p> : null}
		</div>
	)
}

// --- classification + value helpers ---

function classifyColumns(result: QueryResult): ClassifiedColumn[] {
	return result.columns.map((c) => ({ name: c.name, kind: classifyColumn(c.type, c.name, result.rows) }))
}

function classifyColumn(type: string, name: string, rows: Record<string, unknown>[]): ColumnKind {
	if (/Date|Timestamp/i.test(type)) return 'date'
	if (/Int|Float|Decimal/i.test(type)) return 'number'
	if (/Utf8|String|LargeUtf8/i.test(type)) {
		// A Utf8 column that parses cleanly as ISO dates is common — our CSV
		// endpoints emit YYYY-MM-DD. Peek at the first few non-null rows.
		const sample: unknown[] = []
		for (const row of rows) {
			const v = row[name]
			if (v != null && v !== '') {
				sample.push(v)
				if (sample.length >= 20) break
			}
		}
		if (sample.length > 0 && sample.every(looksLikeISODate)) return 'date'
		return 'category'
	}
	return 'other'
}

function pickDefaults(columns: ClassifiedColumn[]): { x: string | null; y: string[] } {
	const firstDate = columns.find((c) => c.kind === 'date')
	const firstCategory = columns.find((c) => c.kind === 'category')
	const xCol = firstDate ?? firstCategory ?? null
	const numeric = columns.filter((c) => c.kind === 'number' && c.name !== xCol?.name)
	return {
		x: xCol?.name ?? null,
		y: numeric.slice(0, MAX_AUTO_SERIES).map((c) => c.name)
	}
}

function looksLikeISODate(value: unknown): boolean {
	if (typeof value !== 'string') return false
	// YYYY-MM-DD, optionally with time part — covers our CSV format.
	return /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)
}

function toXValue(value: unknown, kind: ColumnKind): number | string | null {
	if (value == null) return null
	if (kind === 'date') {
		const seconds = toSeconds(value)
		return seconds == null ? null : seconds
	}
	if (kind === 'number') {
		const n = toNumber(value)
		return Number.isFinite(n as number) ? (n as number) : null
	}
	const s = typeof value === 'string' ? value : String(value)
	return s === '' ? null : s
}

function toYValue(value: unknown): number | null {
	if (value == null) return null
	const n = toNumber(value)
	return Number.isFinite(n as number) ? (n as number) : null
}

function toNumber(value: unknown): number | null {
	if (typeof value === 'number') return value
	if (typeof value === 'bigint') return Number(value)
	if (typeof value === 'boolean') return value ? 1 : 0
	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (trimmed === '') return null
		const n = Number(trimmed)
		return Number.isFinite(n) ? n : null
	}
	return null
}

// Normalize date-ish values to unix seconds. MultiSeriesChart expects seconds
// for xAxisType === 'time' (it multiplies by 1e3 before setting the axis).
function toSeconds(value: unknown): number | null {
	if (value instanceof Date) {
		const t = value.getTime()
		return Number.isFinite(t) ? t / 1000 : null
	}
	if (typeof value === 'bigint') {
		// Arrow may return Timestamps as bigint (ms) or Int64 epoch seconds. Ambiguous,
		// so use magnitude: anything above ~10^12 is treated as milliseconds.
		const n = Number(value)
		if (!Number.isFinite(n)) return null
		return Math.abs(n) > 1e12 ? n / 1000 : n
	}
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return null
		return Math.abs(value) > 1e12 ? value / 1000 : value
	}
	if (typeof value === 'string') {
		const t = Date.parse(value)
		return Number.isFinite(t) ? t / 1000 : null
	}
	return null
}
