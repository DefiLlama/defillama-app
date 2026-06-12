import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { LocalLoader } from '~/components/Loaders'
import { fetchMarketsCategoryPage } from './api'
import { MarketsAreaChart } from './MarketsAreaChart'
import { MarketsLineChart } from './MarketsLineChart'
import { MarketsPageHeader } from './MarketsPageHeader'
import { MarketsSegmentTabs } from './MarketsSegmentTabs'
import { MarketsStatStrip } from './MarketsStatStrip'
import { resolveSegment, type Segment, segmentHasOi } from './segments'
import type { KnownTokenSlugs } from './shared'
import { TokensTable } from './TokensTable'
import {
	availableSegmentsFromRows,
	EMPTY_PIVOTED_SERIES,
	filterRowsBySegment,
	pivotExchangeSeries,
	pivotPairSeries,
	segmentSubtitles as buildSegmentSubtitles
} from './utils'

const STALE_TIME = 60 * 60 * 1000

export function MarketsCategory({
	tag,
	segment,
	onSegmentChange,
	knownTokenSlugs
}: {
	tag: string
	segment: Segment
	onSegmentChange: (segment: Segment) => void
	knownTokenSlugs: KnownTokenSlugs
}) {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['markets-category', tag],
		queryFn: () => fetchMarketsCategoryPage(tag),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		enabled: Boolean(tag)
	})

	// Only show segments this category actually trades; fall back off an empty requested segment.
	const availableSegments = React.useMemo(() => (data ? availableSegmentsFromRows(data.tokens) : []), [data])
	const activeSegment = data ? resolveSegment(segment, availableSegments) : segment
	const segmentTokens = data?.tokens[activeSegment] ?? []
	const hasOi = segmentHasOi(activeSegment)

	const exchangeRows = React.useMemo(() => {
		const rows = data?.seriesByExchange ?? []
		return filterRowsBySegment(rows, activeSegment)
	}, [data, activeSegment])
	const pairRows = React.useMemo(() => {
		const rows = data?.seriesByPair ?? []
		return filterRowsBySegment(rows, activeSegment)
	}, [data, activeSegment])
	const volByExchange = React.useMemo(() => pivotExchangeSeries(exchangeRows, 'volume'), [exchangeRows])
	const oiByExchange = React.useMemo(
		() => (hasOi ? pivotExchangeSeries(exchangeRows, 'oi') : EMPTY_PIVOTED_SERIES),
		[exchangeRows, hasOi]
	)
	const volByPair = React.useMemo(() => pivotPairSeries(pairRows, 'volume'), [pairRows])
	const oiByPair = React.useMemo(
		() => (hasOi ? pivotPairSeries(pairRows, 'oi') : EMPTY_PIVOTED_SERIES),
		[pairRows, hasOi]
	)
	const marketsByExchange = React.useMemo(() => pivotExchangeSeries(exchangeRows, 'markets'), [exchangeRows])

	const segmentSubtitles = React.useMemo(() => {
		if (!data) return null
		return buildSegmentSubtitles(data.tokens)
	}, [data])

	const subtitleFor = React.useCallback((seg: Segment) => segmentSubtitles?.[seg] ?? null, [segmentSubtitles])

	return (
		<div className="flex flex-col gap-5">
			<MarketsPageHeader title={data?.tag ?? tag} description="Token category metrics merged across venues." />

			<MarketsSegmentTabs
				activeSegment={activeSegment}
				onChange={onSegmentChange}
				subtitleFor={subtitleFor}
				availableSegments={data ? availableSegments : undefined}
			/>

			{isLoading ? (
				<div className="flex min-h-[360px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : isError || !data ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-center text-sm text-(--text-label)">
					Failed to load category.
				</div>
			) : segmentTokens.length === 0 ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-center text-sm text-(--text-label)">
					No data for this segment.
				</div>
			) : (
				<div className="flex flex-col gap-5">
					<MarketsStatStrip rows={segmentTokens} segment={activeSegment} />
					<div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
						<MarketsAreaChart title="Volume by exchange" series={volByExchange} />
						{hasOi ? <MarketsAreaChart title="Open interest by exchange" series={oiByExchange} /> : null}
						<MarketsAreaChart title="Volume by token" series={volByPair} />
						{hasOi ? <MarketsAreaChart title="Open interest by token" series={oiByPair} /> : null}
						<MarketsLineChart title="Markets tracked by exchange" series={marketsByExchange} />
					</div>
					<TokensTable rows={segmentTokens} segment={activeSegment} knownTokenSlugs={knownTokenSlugs} />
				</div>
			)}
		</div>
	)
}
