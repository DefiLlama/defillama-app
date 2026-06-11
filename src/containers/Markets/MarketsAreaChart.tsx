import * as React from 'react'
import { LocalLoader } from '~/components/Loaders'
import type { PivotedSeries } from './utils'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart'))

const FALLBACK = (
	<div className="flex h-[300px] items-center justify-center">
		<LocalLoader />
	</div>
)

// A single scrollable legend row keeps many series from wrapping over the plot, while leaving the
// bottom free for the data-zoom slider.
const CHART_OPTIONS = {
	legend: { type: 'scroll', left: 'center', right: 'auto' }
}

/** A 30d stacked-area chart card (volume or OI) built from pre-pivoted series. */
export function MarketsAreaChart({ title, series }: { title: string; series: PivotedSeries }) {
	const hasData = series.chartData.length > 0 && series.stacks.length > 0
	return (
		<div className="flex min-h-[360px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			{hasData ? (
				<React.Suspense fallback={FALLBACK}>
					<AreaChart
						title={title}
						chartData={series.chartData}
						stacks={series.stacks}
						valueSymbol="$"
						isStackedChart
						hideDefaultLegend={false}
						chartOptions={CHART_OPTIONS}
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
