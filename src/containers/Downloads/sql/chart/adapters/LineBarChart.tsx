import { lazy, Suspense, useMemo } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import { SPLIT_TOP_N, type ChartConfig } from '../../chartConfig'
import type { ClassifiedColumn } from '../../columnKind'
import type { QueryResult } from '../../exportResults'
import { pivotRowsForSplit } from '../pivot'
import { formatterFromConfig } from '../valueFormatters'

type ChartSeriesEntry = {
	data: Array<[number | string, number | null]>
	type: 'line' | 'bar'
	name: string
	color: string
	stack?: string
	yAxisIndex?: number
	areaStyle?: unknown
}

interface IMultiSeriesChartShim {
	series: ChartSeriesEntry[]
	xAxisType?: 'time' | 'category'
	height?: string
	hideDataZoom?: boolean
	valueSymbol?: string
	yAxisSymbols?: string[]
	chartOptions?: Record<string, unknown>
	title?: string
	onReady?: (instance: any) => void
}

const MultiSeriesChart = lazy(
	() => import('~/components/ECharts/MultiSeriesChart')
) as unknown as React.FC<IMultiSeriesChartShim>

interface LineBarChartProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
	forceType?: 'line' | 'bar'
	forceArea?: boolean
	forceStack?: string
}

export function LineBarChart({
	config,
	result,
	classified,
	onReady,
	forceType,
	forceArea,
	forceStack
}: LineBarChartProps) {
	const xColumn = classified.find((c) => c.name === config.xCol) ?? null
	const xAxisType: 'time' | 'category' = xColumn?.coarse === 'date' ? 'time' : 'category'
	const formatter = formatterFromConfig(config)

	const { series, truncatedCount } = useMemo<{ series: ChartSeriesEntry[]; truncatedCount: number }>(() => {
		if (!xColumn) return { series: [], truncatedCount: 0 }

		const areaOpacity = forceStack ? 0.55 : 0.35

		if (config.splitByCol && config.yCols.length === 1) {
			const yCol = config.yCols[0]
			const pivot = pivotRowsForSplit(result.rows, xColumn.name, yCol, config.splitByCol, { topN: SPLIT_TOP_N })
			let rows = pivot.rows
			if (config.stackMode === 'expand') rows = normalizeRowsToPercent(rows, pivot.keys)
			const base = pivot.keys.map<ChartSeriesEntry>((key, i) => ({
				name: key,
				type: forceType ?? seriesKind(config, key, 'line'),
				color: config.seriesColors[key] ?? CHART_COLORS[i % CHART_COLORS.length],
				stack: resolveStack(config, forceStack, key),
				yAxisIndex: config.rightAxisCols.includes(key) ? 1 : undefined,
				areaStyle: forceArea ? { opacity: areaOpacity } : undefined,
				data: rows.map((row) => {
					const xVal = toXValue(row[xColumn.name], xAxisType)
					const yVal = toYValue(row[key])
					return [xVal ?? '', yVal] as [number | string, number | null]
				})
			}))
			return { series: base, truncatedCount: pivot.truncatedCount }
		}

		const rawRows =
			config.stackMode === 'expand' ? normalizeWideRowsToPercent(result.rows, xColumn.name, config.yCols) : result.rows

		const base = config.yCols.map<ChartSeriesEntry>((yName, i) => {
			const data: Array<[number | string, number | null]> = []
			for (const row of rawRows) {
				const xVal = toXValue(row[xColumn.name], xAxisType)
				if (xVal == null) continue
				const yVal = toYValue(row[yName])
				data.push([xVal, yVal])
			}
			return {
				name: yName,
				type: forceType ?? seriesKind(config, yName, 'line'),
				color: config.seriesColors[yName] ?? CHART_COLORS[i % CHART_COLORS.length],
				stack: resolveStack(config, forceStack, yName),
				yAxisIndex: config.rightAxisCols.includes(yName) ? 1 : undefined,
				areaStyle: forceArea ? { opacity: areaOpacity } : undefined,
				data
			}
		})
		return { series: base, truncatedCount: 0 }
	}, [result, config, xColumn, xAxisType, forceType, forceArea, forceStack])

	const chartOptions = useMemo(
		() => buildChartOptions(config, series, xAxisType, formatter),
		[config, series, xAxisType, formatter]
	)

	const yAxisSymbols = useMemo(() => {
		if (config.rightAxisCols.length === 0) return undefined
		return [formatter.valueSymbol, formatter.valueSymbol]
	}, [config.rightAxisCols.length, formatter.valueSymbol])

	if (!xColumn) return null

	return (
		<div className="relative">
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
					height="380px"
					valueSymbol={formatter.valueSymbol}
					yAxisSymbols={yAxisSymbols}
					hideDataZoom={series.every((s) => s.data.length < 2)}
					chartOptions={chartOptions}
					onReady={onReady}
				/>
			</Suspense>
			{truncatedCount > 0 ? (
				<p className="mt-1.5 text-[11px] text-(--text-tertiary)">
					Showing top {SPLIT_TOP_N} series by magnitude. {truncatedCount} folded into <em>Other</em>.
				</p>
			) : null}
		</div>
	)
}

function seriesKind(config: ChartConfig, name: string, fallback: 'line' | 'bar'): 'line' | 'bar' {
	if (config.seriesKinds[name]) return config.seriesKinds[name]
	if (config.chartType === 'bar') return 'bar'
	if (config.chartType === 'line') return 'line'
	return fallback
}

function normalizeRowsToPercent(
	rows: Array<Record<string, number | string | null>>,
	keys: string[]
): Array<Record<string, number | string | null>> {
	return rows.map((row) => {
		let total = 0
		for (const k of keys) {
			const v = row[k]
			if (typeof v === 'number' && Number.isFinite(v)) total += v
		}
		if (total <= 0) return row
		const out: Record<string, number | string | null> = { ...row }
		for (const k of keys) {
			const v = row[k]
			out[k] = typeof v === 'number' && Number.isFinite(v) ? v / total : null
		}
		return out
	})
}

function normalizeWideRowsToPercent(
	rows: Record<string, unknown>[],
	xCol: string,
	yCols: string[]
): Record<string, unknown>[] {
	return rows.map((row) => {
		let total = 0
		for (const k of yCols) {
			const n = toYValue(row[k])
			if (n != null) total += n
		}
		if (total <= 0) return row
		const out: Record<string, unknown> = { ...row }
		for (const k of yCols) {
			const n = toYValue(row[k])
			out[k] = n == null ? null : n / total
		}
		out[xCol] = row[xCol]
		return out
	})
}

function resolveStack(config: ChartConfig, forceStack: string | undefined, name: string): string | undefined {
	if (forceStack) return forceStack
	if (config.stackMode === 'stacked' || config.stackMode === 'expand') {
		return config.rightAxisCols.includes(name) ? 'right' : 'left'
	}
	return undefined
}

function buildChartOptions(
	config: ChartConfig,
	_series: ChartSeriesEntry[],
	xAxisType: 'time' | 'category',
	formatter: ReturnType<typeof formatterFromConfig>
): Record<string, unknown> {
	const opts: Record<string, any> = {}

	const yAxisBase: Record<string, any> = { axisLabel: { formatter: (v: number) => formatter.axis(v) } }
	if (config.stackMode === 'expand') {
		opts.yAxis = { ...yAxisBase, max: 1, axisLabel: { formatter: (v: number) => `${Math.round(v * 100)}%` } }
	} else {
		opts.yAxis = yAxisBase
	}

	if (xAxisType === 'category') {
		opts.tooltip = {
			trigger: 'axis',
			confine: true,
			formatter: (params: Array<{ marker: string; seriesName: string; value: [string, number | null] }>) => {
				if (!Array.isArray(params) || params.length === 0) return ''
				const header = escapeHtml(String(params[0]?.value?.[0] ?? ''))
				const rows = [...params]
					.filter((p) => p.value?.[1] != null && p.value?.[1] !== 0)
					.sort((a, b) => Math.abs((b.value?.[1] as number) ?? 0) - Math.abs((a.value?.[1] as number) ?? 0))
					.slice(0, 10)
					.map(
						(p) =>
							`<li style="list-style:none">${p.marker}${escapeHtml(p.seriesName)}&nbsp;&nbsp;${formatter.tooltip(
								(p.value?.[1] as number) ?? 0
							)}</li>`
					)
					.join('')
				return `<div style="font-weight:600;margin-bottom:4px">${header}</div>${rows || '<div style="color:#999">No data</div>'}`
			}
		}
	}

	return opts
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toXValue(value: unknown, axisType: 'time' | 'category'): number | string | null {
	if (value == null) return null
	if (axisType === 'time') return toSeconds(value)
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

function toSeconds(value: unknown): number | null {
	if (value instanceof Date) {
		const t = value.getTime()
		return Number.isFinite(t) ? t / 1000 : null
	}
	if (typeof value === 'bigint') {
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
