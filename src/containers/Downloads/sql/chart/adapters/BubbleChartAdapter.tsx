import { lazy, Suspense, useMemo } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import type { ClassifiedColumn } from '../../columnKind'
import type { ChartConfig } from '../../chartConfig'
import type { QueryResult } from '../../exportResults'
import { formatterFromConfig } from '../valueFormatters'

interface IScatterChartShim {
	chartData: Array<Record<string, any>>
	xAxisLabel?: string
	yAxisLabel?: string
	valueSymbol?: string
	height?: string
	tooltipFormatter?: (params: any) => string
	onReady?: (instance: any) => void
	title?: string
}

const ScatterChart = lazy(() => import('~/components/ECharts/ScatterChart')) as unknown as React.FC<IScatterChartShim>

const MIN_SYMBOL = 6
const MAX_SYMBOL = 40

interface BubbleChartAdapterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

export function BubbleChartAdapter({ config, result, classified, onReady }: BubbleChartAdapterProps) {
	const formatter = formatterFromConfig(config)
	const numericCols = classified.filter((c) => c.coarse === 'number').map((c) => c.name)
	const isNumeric = (name: string | null | undefined) => !!name && numericCols.includes(name)
	const xCol = isNumeric(config.xCol) ? (config.xCol as string) : numericCols[0] ?? null
	const yCol = isNumeric(config.yCols[0]) && config.yCols[0] !== xCol
		? config.yCols[0]
		: numericCols.find((n) => n !== xCol) ?? null
	const fallbackSize = numericCols.find((n) => n !== xCol && n !== yCol) ?? null
	const sizeCol = isNumeric(config.bubble?.sizeCol ?? null) && config.bubble?.sizeCol !== xCol && config.bubble?.sizeCol !== yCol
		? config.bubble!.sizeCol!
		: fallbackSize
	const labelCol = classified.find((c) => c.coarse === 'category')?.name ?? null

	const { chartData, sizeRange } = useMemo(() => {
		if (!xCol || !yCol || !sizeCol) return { chartData: [], sizeRange: [0, 0] as [number, number] }
		const raw: Array<{ x: number; y: number; size: number; label?: string }> = []
		for (const row of result.rows) {
			const x = toNumber(row[xCol])
			const y = toNumber(row[yCol])
			const s = toNumber(row[sizeCol])
			if (x == null || y == null || s == null) continue
			const label = labelCol ? (row[labelCol] == null ? undefined : String(row[labelCol])) : undefined
			raw.push({ x, y, size: s, label })
		}
		if (raw.length === 0) return { chartData: [], sizeRange: [0, 0] as [number, number] }
		const sMin = Math.min(...raw.map((r) => r.size))
		const sMax = Math.max(...raw.map((r) => r.size))
		const span = sMax - sMin || 1
		const data = raw.map((r) => ({
			value: r.label ? [r.x, r.y, r.label, r.size] : [r.x, r.y, '', r.size],
			symbolSize: MIN_SYMBOL + ((r.size - sMin) / span) * (MAX_SYMBOL - MIN_SYMBOL)
		}))
		return { chartData: data, sizeRange: [sMin, sMax] as [number, number] }
	}, [result, xCol, yCol, sizeCol, labelCol])

	const tooltipFormatter = (params: any) => {
		const [x, y, label, size] = params?.value ?? []
		const lines: string[] = []
		if (label) lines.push(`<strong>${escape(String(label))}</strong>`)
		lines.push(`${escape(xCol ?? 'x')}: ${formatter.tooltip(x)}`)
		lines.push(`${escape(yCol ?? 'y')}: ${formatter.tooltip(y)}`)
		if (sizeCol) lines.push(`${escape(sizeCol)}: ${formatter.tooltip(size)}`)
		return lines.join('<br/>')
	}

	if (!xCol || !yCol || !sizeCol)
		return (
			<div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-(--divider) text-sm text-(--text-secondary)">
				Bubble needs at least three numeric columns (x, y, size).
			</div>
		)
	void sizeRange

	return (
		<Suspense
			fallback={
				<div className="flex h-[420px] items-center justify-center">
					<LoadingSpinner size={18} />
				</div>
			}
		>
			<ScatterChart
				chartData={chartData as any}
				xAxisLabel={xCol}
				yAxisLabel={yCol}
				valueSymbol={formatter.valueSymbol}
				height="420px"
				tooltipFormatter={tooltipFormatter}
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

function escape(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
