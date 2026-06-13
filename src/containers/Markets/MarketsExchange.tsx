import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { LocalLoader } from '~/components/Loaders'
import { formattedNum } from '~/utils'
import { fetchMarketsExchange, fetchMarketsExchangeSeries } from './api'
import type { ExchangeMarketCategoryData } from './api.types'
import { ExchangePairsTable } from './ExchangePairsTable'
import { MarketsAreaChart } from './MarketsAreaChart'
import { MarketsLineChart } from './MarketsLineChart'
import { MarketsPageHeader } from './MarketsPageHeader'
import { MarketsSegmentTabs } from './MarketsSegmentTabs'
import { resolveSegment, type Segment, SEGMENT_IDS, segmentHasOi } from './segments'
import { ChangeCell, renderUsd, VenueBadge } from './shared'
import { EMPTY_PIVOTED_SERIES, filterExchangeSeriesBySegment, pctChange, pivotExchangeSeries } from './utils'

const STALE_TIME = 60 * 60 * 1000

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
	return (
		<div className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<span className="text-xs text-(--text-label)">{label}</span>
			<span className="font-jetbrains text-lg font-semibold">{value}</span>
			{sub != null ? <span className="text-xs text-(--text-label)">{sub}</span> : null}
		</div>
	)
}

function ExchangeStatStrip({ totals, segment }: { totals: ExchangeMarketCategoryData | undefined; segment: Segment }) {
	const hasOi = segmentHasOi(segment)
	return (
		<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
			<Stat
				label="24h Volume"
				value={renderUsd(totals?.total_volume_24h)}
				sub={<ChangeCell fraction={pctChange(totals?.total_volume_24h, totals?.total_volume_prev_24h)} />}
			/>
			{hasOi ? (
				<Stat
					label="Open Interest"
					value={renderUsd(totals?.total_oi_usd)}
					sub={<ChangeCell fraction={pctChange(totals?.total_oi_usd, totals?.total_oi_prev_usd)} />}
				/>
			) : null}
			<Stat label="Markets" value={formattedNum(totals?.market_count ?? 0)} />
		</div>
	)
}

export function MarketsExchange({
	exchange,
	segment,
	onSegmentChange
}: {
	exchange: string
	segment: Segment
	onSegmentChange: (segment: Segment) => void
}) {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['markets-exchange', exchange],
		queryFn: () => fetchMarketsExchange(exchange),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		enabled: Boolean(exchange)
	})
	const seriesQuery = useQuery({
		queryKey: ['markets-exchange-series'],
		queryFn: fetchMarketsExchangeSeries,
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	// Only show segments this venue actually trades; fall back off an empty requested segment.
	const availableSegments = React.useMemo(
		() => (data ? SEGMENT_IDS.filter((s) => (data.categories?.[s]?.pairs?.length ?? 0) > 0) : []),
		[data]
	)
	const activeSegment = data ? resolveSegment(segment, availableSegments) : segment
	const hasOi = segmentHasOi(activeSegment)
	const segmentData = data?.categories?.[activeSegment]
	const pairs = segmentData?.pairs ?? []

	const exchangeName = data?.exchange ?? exchange
	const seriesRows = React.useMemo(() => {
		const rows = seriesQuery.data ?? []
		return filterExchangeSeriesBySegment(rows, activeSegment, exchangeName)
	}, [seriesQuery.data, exchangeName, activeSegment])
	const volSeries = React.useMemo(() => pivotExchangeSeries(seriesRows, 'volume'), [seriesRows])
	const oiSeries = React.useMemo(
		() => (hasOi ? pivotExchangeSeries(seriesRows, 'oi') : EMPTY_PIVOTED_SERIES),
		[seriesRows, hasOi]
	)
	const marketsSeries = React.useMemo(() => pivotExchangeSeries(seriesRows, 'markets'), [seriesRows])

	const subtitleFor = React.useCallback(
		(seg: Segment) => {
			const cat = data?.categories?.[seg]
			if (!cat) return null
			return `${cat.market_count} pairs · ${formattedNum(cat.total_volume_24h ?? 0, true)}`
		},
		[data]
	)

	return (
		<div className="flex flex-col gap-5">
			<MarketsPageHeader
				title={data?.exchange ?? exchange}
				meta={data?.exchange_type ? <VenueBadge type={data.exchange_type} /> : null}
				description="Venue-level spot and perpetual metrics."
			/>

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
					Failed to load exchange.
				</div>
			) : pairs.length === 0 ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-center text-sm text-(--text-label)">
					No markets recorded for this venue.
				</div>
			) : (
				<div className="flex flex-col gap-5">
					<ExchangeStatStrip totals={segmentData} segment={activeSegment} />
					<div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
						<MarketsAreaChart title="Volume (30d)" series={volSeries} />
						{hasOi ? <MarketsAreaChart title="Open interest (30d)" series={oiSeries} /> : null}
						<MarketsLineChart title="Markets tracked" series={marketsSeries} />
					</div>
					<ExchangePairsTable pairs={pairs} segment={activeSegment} />
				</div>
			)}
		</div>
	)
}
