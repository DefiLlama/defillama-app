import { lazy, Suspense, useMemo } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import type { ChartConfig } from '../../chartConfig'
import type { ClassifiedColumn } from '../../columnKind'
import type { QueryResult } from '../../exportResults'
import { formatterFromConfig } from '../valueFormatters'

interface IHBarChartShim {
	categories: string[]
	values: number[]
	title?: string
	valueSymbol?: string
	height?: string
	color?: string
	colors?: string[]
	onReady?: (instance: any) => void
}

const HBarChart = lazy(() => import('~/components/ECharts/HBarChart')) as unknown as React.FC<IHBarChartShim>

interface HBarChartAdapterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

export function HBarChartAdapter({ config, result, classified, onReady }: HBarChartAdapterProps) {
	const formatter = formatterFromConfig(config)

	const { categories, values } = useMemo(() => {
		if (!config.xCol || config.yCols.length === 0) return { categories: [], values: [] }
		const yCol = config.yCols[0]
		const labelCol = classified.find((c) => c.name === config.xCol && c.coarse !== 'number')
		const pairs: Array<{ name: string; value: number }> = []
		for (const row of result.rows) {
			const nameRaw = row[config.xCol] as unknown
			const name = nameRaw == null ? '' : String(nameRaw)
			const n = toNumber(row[yCol])
			if (!labelCol || name === '' || n == null) continue
			pairs.push({ name, value: n })
		}
		pairs.sort((a, b) => b.value - a.value)
		const cap = 40
		const top = pairs.slice(0, cap)
		return {
			categories: top.map((p) => p.name).reverse(),
			values: top.map((p) => p.value).reverse()
		}
	}, [result, config, classified])

	const colors = useMemo(
		() => categories.map((_, i) => CHART_COLORS[(categories.length - 1 - i) % CHART_COLORS.length]),
		[categories]
	)

	return (
		<Suspense
			fallback={
				<div className="flex h-[380px] items-center justify-center">
					<LoadingSpinner size={18} />
				</div>
			}
		>
			<HBarChart
				categories={categories}
				values={values}
				height="380px"
				valueSymbol={formatter.valueSymbol}
				colors={colors}
				onReady={onReady}
			/>
		</Suspense>
	)
}

function toNumber(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null
	if (typeof value === 'bigint') return Number(value)
	if (typeof value === 'string') {
		const n = Number(value.trim())
		return Number.isFinite(n) ? n : null
	}
	return null
}
