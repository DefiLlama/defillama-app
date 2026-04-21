import { lazy, Suspense, useMemo } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import type { ClassifiedColumn } from '../../columnKind'
import type { ChartConfig } from '../../chartConfig'
import type { QueryResult } from '../../exportResults'
import { formatterFromConfig } from '../valueFormatters'

interface IPieChartShim {
	chartData: Array<{ name: string; value: number }>
	stackColors?: Record<string, string>
	valueSymbol?: string
	radius?: [string, string]
	showLegend?: boolean
	height?: string
	title?: string
	onReady?: (instance: any) => void
	formatTooltip?: (params: any) => string
}

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as unknown as React.FC<IPieChartShim>

interface PieChartAdapterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

const TOP_N_SLICES = 12

export function PieChartAdapter({ config, result, classified, onReady }: PieChartAdapterProps) {
	const formatter = formatterFromConfig(config)
	const nameCol = config.xCol ?? classified.find((c) => c.coarse === 'category')?.name ?? null
	const valueCol = config.yCols[0] ?? classified.find((c) => c.coarse === 'number')?.name ?? null

	const { chartData, stackColors, truncated } = useMemo(() => {
		if (!nameCol || !valueCol) return { chartData: [], stackColors: {}, truncated: 0 }
		const acc = new Map<string, number>()
		for (const row of result.rows) {
			const rawName = row[nameCol]
			const name = rawName == null ? '∅' : String(rawName)
			const v = toNumber(row[valueCol])
			if (v == null) continue
			acc.set(name, (acc.get(name) ?? 0) + v)
		}
		const entries = [...acc.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
		const top = entries.slice(0, TOP_N_SLICES)
		const rest = entries.slice(TOP_N_SLICES)
		const chart = top.map(([name, value]) => ({ name, value }))
		if (rest.length > 0) {
			const otherValue = rest.reduce((s, [, v]) => s + v, 0)
			chart.push({ name: 'Other', value: otherValue })
		}
		const colors: Record<string, string> = {}
		chart.forEach((item, i) => {
			colors[item.name] = config.seriesColors[item.name] ?? CHART_COLORS[i % CHART_COLORS.length]
		})
		return { chartData: chart, stackColors: colors, truncated: rest.length }
	}, [result, nameCol, valueCol, config.seriesColors])

	const isDonut = config.chartType === 'donut'

	const formatTooltip = (params: any) => {
		const value = params?.value
		const pct = params?.percent
		return `<strong>${escape(String(params?.name ?? ''))}</strong><br/>${formatter.tooltip(value)} (${pct}%)`
	}

	if (!nameCol || !valueCol)
		return (
			<div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-(--divider) text-sm text-(--text-secondary)">
				Pie needs a category column and a numeric column.
			</div>
		)

	return (
		<div className="flex flex-col gap-1.5">
			<Suspense
				fallback={
					<div className="flex h-[420px] items-center justify-center">
						<LoadingSpinner size={18} />
					</div>
				}
			>
				<PieChart
					chartData={chartData}
					stackColors={stackColors}
					valueSymbol={formatter.valueSymbol}
					radius={isDonut ? ['42%', '70%'] : undefined}
					showLegend
					height="420px"
					formatTooltip={formatTooltip}
					onReady={onReady}
				/>
			</Suspense>
			{truncated > 0 ? (
				<p className="text-[11px] text-(--text-tertiary)">Top {TOP_N_SLICES} slices. {truncated} folded into Other.</p>
			) : null}
		</div>
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

function escape(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
