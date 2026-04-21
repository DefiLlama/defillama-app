import { lazy, Suspense, useMemo } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import type { ClassifiedColumn } from '../../columnKind'
import type { ChartConfig } from '../../chartConfig'
import type { QueryResult } from '../../exportResults'
import { formatterFromConfig } from '../valueFormatters'

interface ITreemapChartShim {
	treeData: any[]
	variant?: 'yields' | 'narrative' | 'rwa'
	height?: string
	valueLabel?: string
	valueSymbol?: string
	onReady?: (instance: any) => void
}

const TreemapChart = lazy(() => import('~/components/ECharts/TreemapChart')) as unknown as React.FC<ITreemapChartShim>

interface TreemapChartAdapterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

export function TreemapChartAdapter({ config, result, classified, onReady }: TreemapChartAdapterProps) {
	const formatter = formatterFromConfig(config)
	const nameCol = config.xCol ?? classified.find((c) => c.coarse === 'category')?.name ?? null
	const valueCol = config.yCols[0] ?? classified.find((c) => c.coarse === 'number')?.name ?? null
	const groupCol = classified.find((c) => c.coarse === 'category' && c.name !== nameCol)?.name ?? null

	const treeData = useMemo(() => {
		if (!nameCol || !valueCol) return []
		if (groupCol) {
			const grouped = new Map<string, Array<{ name: string; value: number }>>()
			for (const row of result.rows) {
				const g = row[groupCol] == null ? '∅' : String(row[groupCol])
				const v = toNumber(row[valueCol])
				if (v == null) continue
				const n = row[nameCol] == null ? '∅' : String(row[nameCol])
				if (!grouped.has(g)) grouped.set(g, [])
				grouped.get(g)!.push({ name: n, value: v })
			}
			return [...grouped.entries()].map(([g, items]) => ({
				name: g,
				value: [items.reduce((s, x) => s + x.value, 0), 0, 0],
				children: items
					.sort((a, b) => b.value - a.value)
					.map((item) => ({ name: item.name, value: [item.value, 0, 0] }))
			}))
		}
		const leaves = new Map<string, number>()
		for (const row of result.rows) {
			const n = row[nameCol] == null ? '∅' : String(row[nameCol])
			const v = toNumber(row[valueCol])
			if (v == null) continue
			leaves.set(n, (leaves.get(n) ?? 0) + v)
		}
		return [...leaves.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([name, value]) => ({ name, value: [value, 0, 0] }))
	}, [result, nameCol, valueCol, groupCol])

	if (!nameCol || !valueCol)
		return (
			<div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-(--divider) text-sm text-(--text-secondary)">
				Treemap needs a category column and a numeric column.
			</div>
		)

	return (
		<Suspense
			fallback={
				<div className="flex h-[420px] items-center justify-center">
					<LoadingSpinner size={18} />
				</div>
			}
		>
			<TreemapChart
				treeData={treeData}
				variant="narrative"
				height="460px"
				valueLabel={valueCol}
				valueSymbol={formatter.valueSymbol}
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
