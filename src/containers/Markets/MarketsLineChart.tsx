import * as React from 'react'
import { LocalLoader } from '~/components/Loaders'
import { type PivotedSeries, toLineSeries } from './utils'

const MultiSeriesChart = React.lazy(() => import('~/components/ECharts/MultiSeriesChart'))

const FALLBACK = (
	<div className="flex h-[300px] items-center justify-center">
		<LocalLoader />
	</div>
)

// Scrollable top-centred legend so many lines don't wrap over the plot.
const CHART_OPTIONS = {
	legend: { type: 'scroll', left: 'center', right: 'auto' },
	grid: { top: 28 }
}

/** A 30d non-stacked multi-line chart card (e.g. markets-tracked health). */
export function MarketsLineChart({
	title,
	series,
	valueSymbol = ''
}: {
	title: string
	series: PivotedSeries
	valueSymbol?: string
}) {
	const lineSeries = React.useMemo(() => toLineSeries(series), [series])
	const hasData = lineSeries.length > 0 && series.chartData.length > 0
	return (
		<div className="flex min-h-[360px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<div className="mb-2 flex flex-col">
				<span className="text-[10px] tracking-wider text-(--text-label) uppercase">30 days · tracking health</span>
				<span className="text-sm font-semibold">{title}</span>
			</div>
			{hasData ? (
				<React.Suspense fallback={FALLBACK}>
					<MultiSeriesChart series={lineSeries} valueSymbol={valueSymbol} chartOptions={CHART_OPTIONS} height="280px" />
				</React.Suspense>
			) : (
				<div className="flex flex-1 items-center justify-center text-xs text-(--text-disabled)">no data</div>
			)}
		</div>
	)
}
