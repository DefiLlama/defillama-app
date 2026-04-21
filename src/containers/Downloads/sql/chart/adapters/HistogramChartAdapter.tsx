import { lazy, Suspense, useMemo } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import type { ClassifiedColumn } from '../../columnKind'
import type { ChartConfig } from '../../chartConfig'
import type { QueryResult } from '../../exportResults'
import { formatterFromConfig } from '../valueFormatters'

interface IMultiSeriesChartShim {
	series: Array<{
		data: Array<[number | string, number | null]>
		type: 'line' | 'bar'
		name: string
		color: string
	}>
	xAxisType?: 'time' | 'category'
	height?: string
	valueSymbol?: string
	chartOptions?: Record<string, unknown>
	hideDataZoom?: boolean
	onReady?: (instance: any) => void
	title?: string
}

const MultiSeriesChart = lazy(
	() => import('~/components/ECharts/MultiSeriesChart')
) as unknown as React.FC<IMultiSeriesChartShim>

interface HistogramChartAdapterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

export function HistogramChartAdapter({ config, result, classified, onReady }: HistogramChartAdapterProps) {
	const formatter = formatterFromConfig(config)
	const valueCol =
		config.histogram?.valueCol ?? config.yCols[0] ?? classified.find((c) => c.coarse === 'number')?.name ?? null
	const binCount = Math.max(5, Math.min(200, config.histogram?.binCount ?? 30))

	const { series, chartOptions } = useMemo(() => {
		if (!valueCol) return { series: [] as any[], chartOptions: {} }
		const values: number[] = []
		for (const row of result.rows) {
			const v = toNumber(row[valueCol])
			if (v != null) values.push(v)
		}
		if (values.length === 0) return { series: [] as any[], chartOptions: {} }
		const min = Math.min(...values)
		const max = Math.max(...values)
		const span = max - min || 1
		const width = span / binCount
		const counts = new Array(binCount).fill(0)
		for (const v of values) {
			const idx = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / width)))
			counts[idx] += 1
		}
		const data: Array<[string, number]> = counts.map((c, i) => {
			const lo = min + i * width
			const hi = lo + width
			return [`${formatter.axis(lo)} – ${formatter.axis(hi)}`, c]
		})
		return {
			series: [
				{
					name: valueCol,
					type: 'bar' as const,
					color: config.seriesColors[valueCol] ?? CHART_COLORS[0],
					data
				}
			],
			chartOptions: {
				yAxis: { axisLabel: { formatter: (v: number) => String(v) } },
				xAxis: { axisLabel: { rotate: binCount > 12 ? 35 : 0, fontSize: 10 } },
				grid: { bottom: 60 },
				tooltip: {
					trigger: 'axis',
					confine: true,
					formatter: (params: Array<{ marker: string; seriesName: string; value: [string, number] }>) => {
						if (!Array.isArray(params) || params.length === 0) return ''
						const p = params[0]
						const bin = escapeHtml(String(p?.value?.[0] ?? ''))
						const count = Number(p?.value?.[1] ?? 0)
						return `<div style="font-weight:600;margin-bottom:4px">${bin}</div><div>${p.marker}${escapeHtml(p.seriesName)}&nbsp;&nbsp;${count.toLocaleString()}</div>`
					}
				}
			}
		}
	}, [result, valueCol, binCount, formatter, config.seriesColors])

	if (!valueCol)
		return (
			<div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-(--divider) text-sm text-(--text-secondary)">
				Histogram needs a numeric column.
			</div>
		)

	return (
		<Suspense
			fallback={
				<div className="flex h-[380px] items-center justify-center">
					<LoadingSpinner size={18} />
				</div>
			}
		>
			<MultiSeriesChart
				series={series}
				xAxisType="category"
				height="380px"
				hideDataZoom
				chartOptions={chartOptions}
				onReady={onReady}
			/>
		</Suspense>
	)
}

function toNumber(v: unknown): number | null {
	if (typeof v === 'number') return Number.isFinite(v) ? v : null
	if (typeof v === 'bigint') return Number(v)
	if (typeof v === 'string') {
		const n = Number(v.trim())
		return Number.isFinite(n) ? n : null
	}
	return null
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
