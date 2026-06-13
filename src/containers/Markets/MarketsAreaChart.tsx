import * as React from 'react'
import { LocalLoader } from '~/components/Loaders'
import { type PivotedSeries, toStackedAreaSeries } from './utils'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart'))

const FALLBACK = (
	<div className="flex h-[300px] items-center justify-center">
		<LocalLoader />
	</div>
)

/** A 30d stacked-area chart card (volume or OI) built from pre-pivoted series. */
export function MarketsAreaChart({ title, series }: { title: string; series: PivotedSeries }) {
	const ordered = React.useMemo(() => toStackedAreaSeries(series), [series])
	// Stack smallest-first (`ordered`) so the largest series sits on top and the tooltip surfaces it,
	// but list the legend largest-first (`series.stacks` keeps the pivot's descending rank). A single
	// scrollable legend row keeps many series from wrapping over the plot, leaving room for the zoom slider.
	const chartOptions = React.useMemo(
		() => ({ legend: { type: 'scroll', left: 'center', right: 'auto', data: series.stacks } }),
		[series.stacks]
	)
	const hasData = ordered.chartData.length > 0 && ordered.stacks.length > 0
	return (
		<div className="flex min-h-[360px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			{hasData ? (
				<React.Suspense fallback={FALLBACK}>
					<AreaChart
						title={title}
						chartData={ordered.chartData}
						stacks={ordered.stacks}
						valueSymbol="$"
						isStackedChart
						hideDefaultLegend={false}
						chartOptions={chartOptions}
						height="300px"
					/>
				</React.Suspense>
			) : (
				<>
					<span className="text-base font-semibold">{title}</span>
					<div className="flex flex-1 items-center justify-center text-xs text-(--text-disabled)">no data</div>
				</>
			)}
		</div>
	)
}
