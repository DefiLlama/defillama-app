import * as React from 'react'
import { MarketsAreaChart } from './MarketsAreaChart'
import { MarketsLineChart } from './MarketsLineChart'
import { type Segment, segmentHasOi } from './segments'
import type { CategorySeriesRow, ExchangeSeriesRow } from './types'
import { EMPTY_PIVOTED_SERIES, filterRowsBySegment, pivotCategorySeries, pivotExchangeSeries } from './utils'

export function MarketsCharts({
	exchangeSeries,
	categorySeries,
	segment
}: {
	exchangeSeries: ExchangeSeriesRow[]
	categorySeries: CategorySeriesRow[]
	segment: Segment
}) {
	const hasOi = segmentHasOi(segment)

	const exchangeRows = React.useMemo(() => filterRowsBySegment(exchangeSeries, segment), [exchangeSeries, segment])
	const categoryRows = React.useMemo(() => filterRowsBySegment(categorySeries, segment), [categorySeries, segment])

	const volByExchange = React.useMemo(() => pivotExchangeSeries(exchangeRows, 'volume'), [exchangeRows])
	const oiByExchange = React.useMemo(
		() => (hasOi ? pivotExchangeSeries(exchangeRows, 'oi') : EMPTY_PIVOTED_SERIES),
		[exchangeRows, hasOi]
	)
	const volByCategory = React.useMemo(() => pivotCategorySeries(categoryRows, 'volume'), [categoryRows])
	const oiByCategory = React.useMemo(
		() => (hasOi ? pivotCategorySeries(categoryRows, 'oi') : EMPTY_PIVOTED_SERIES),
		[categoryRows, hasOi]
	)
	const marketsByExchange = React.useMemo(() => pivotExchangeSeries(exchangeRows, 'markets'), [exchangeRows])
	const marketsByCategory = React.useMemo(() => pivotCategorySeries(categoryRows, 'markets'), [categoryRows])

	return (
		<div className="flex flex-col gap-2">
			<h2 className="text-base font-semibold">Trends · 30d</h2>
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
				<MarketsAreaChart title="Volume by exchange" series={volByExchange} />
				{hasOi ? <MarketsAreaChart title="Open interest by exchange" series={oiByExchange} /> : null}
				<MarketsAreaChart title="Volume by category" series={volByCategory} />
				{hasOi ? <MarketsAreaChart title="Open interest by category" series={oiByCategory} /> : null}
				<MarketsLineChart title="Markets tracked by exchange" series={marketsByExchange} />
				<MarketsLineChart title="Markets tracked by category" series={marketsByCategory} />
			</div>
		</div>
	)
}
