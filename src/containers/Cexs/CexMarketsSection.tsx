import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useMemo, useReducer } from 'react'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { fetchMarketsExchangeSeries } from '~/containers/Markets/api'
import type { ExchangeMarketsResponse, MarketPair } from '~/containers/Markets/api.types'
import { ChangeCell, MetricStat } from '~/containers/Markets/marketMetrics'
import { buildCexMarketPairColumns } from '~/containers/Markets/marketPairColumns'
import { MarketsAreaChart } from '~/containers/Markets/MarketsAreaChart'
import { MarketsSegmentTabs } from '~/containers/Markets/MarketsSegmentTabs'
import { resolveSegment, type Segment, SEGMENT_IDS, segmentHasOi } from '~/containers/Markets/segments'
import {
	EMPTY_PIVOTED_SERIES,
	filterExchangeSeriesBySegment,
	pctChange,
	pivotExchangeSeries
} from '~/containers/Markets/utils'
import { formattedNum } from '~/utils'
import { fetchExchangeMarkets } from './api'

const STALE_TIME = 60 * 60 * 1000
const CEX_MARKETS_SECTION_ID = 'markets'

function renderNullableNum(value: number | null | undefined, isUsd = false): string {
	if (value == null) return '–'
	return formattedNum(value, isUsd)
}

const SPOT_COLUMNS = buildCexMarketPairColumns('spot')
const PERP_COLUMNS = buildCexMarketPairColumns('linear_perp')

function getCategoryRows(data: ExchangeMarketsResponse, category: Segment): MarketPair[] {
	return data.categories[category]?.pairs ?? []
}

function getAvailableCategories(data: ExchangeMarketsResponse): Segment[] {
	const categories: Segment[] = []
	for (const segment of SEGMENT_IDS) {
		if (getCategoryRows(data, segment).length > 0) categories.push(segment)
	}
	return categories
}

function HeaderStrip({
	data,
	category,
	showOi
}: {
	data: ExchangeMarketsResponse
	category: Segment
	showOi: boolean
}) {
	const totals = data.categories[category]

	return (
		<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
			<MetricStat label="Pairs" value={formattedNum(totals?.market_count ?? 0)} />
			<MetricStat
				label="24h Volume"
				value={renderNullableNum(totals?.total_volume_24h, true)}
				sub={<ChangeCell fraction={pctChange(totals?.total_volume_24h, totals?.total_volume_prev_24h)} />}
			/>
			{showOi ? (
				<MetricStat
					label="Open Interest"
					value={renderNullableNum(totals?.total_oi_usd, true)}
					sub={<ChangeCell fraction={pctChange(totals?.total_oi_usd, totals?.total_oi_prev_usd)} />}
				/>
			) : null}
		</div>
	)
}

function MarketsSummary({ data }: { data: ExchangeMarketsResponse }) {
	return (
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
			<MetricStat
				label="Volume 24h"
				value={renderNullableNum(data.total_volume_24h, true)}
				sub={<ChangeCell fraction={pctChange(data.total_volume_24h, data.total_volume_prev_24h)} />}
			/>
			<MetricStat
				label="Open Interest"
				value={renderNullableNum(data.total_oi_usd, true)}
				sub={<ChangeCell fraction={pctChange(data.total_oi_usd, data.total_oi_prev_usd)} />}
			/>
			<MetricStat label="Spot Markets" value={formattedNum(data.categories.spot?.market_count ?? 0)} />
			<MetricStat label="Linear Perp Markets" value={formattedNum(data.categories.linear_perp?.market_count ?? 0)} />
			<MetricStat label="Inverse Perp Markets" value={formattedNum(data.categories.inverse_perp?.market_count ?? 0)} />
		</div>
	)
}

interface CexMarketsSectionProps {
	exchange: string
	name: string
}

export function CexMarketsSection({ exchange, name }: CexMarketsSectionProps) {
	const [categoryTab, setCategoryTab] = useReducer((_: Segment, next: Segment) => next, 'spot')

	const { data, error, isLoading } = useQuery({
		queryKey: ['exchange-markets', exchange],
		queryFn: () => fetchExchangeMarkets(exchange),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(exchange)
	})
	const seriesQuery = useQuery({
		queryKey: ['markets-exchange-series'],
		queryFn: fetchMarketsExchangeSeries,
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const visibleCategoryTabs = useMemo(() => (data ? getAvailableCategories(data) : []), [data])
	const selectedCategoryTab = data ? resolveSegment(categoryTab, visibleCategoryTabs) : categoryTab
	const hasOi = segmentHasOi(selectedCategoryTab)
	const rows = useMemo(() => (data ? getCategoryRows(data, selectedCategoryTab) : []), [data, selectedCategoryTab])
	const columns = selectedCategoryTab === 'spot' ? SPOT_COLUMNS : PERP_COLUMNS

	const exchangeName = data?.exchange ?? exchange
	const seriesRows = useMemo(() => {
		const allSeriesRows = seriesQuery.data ?? []
		return filterExchangeSeriesBySegment(allSeriesRows, selectedCategoryTab, exchangeName)
	}, [seriesQuery.data, exchangeName, selectedCategoryTab])
	const volSeries = useMemo(() => pivotExchangeSeries(seriesRows, 'volume'), [seriesRows])
	const oiSeries = useMemo(
		() => (hasOi ? pivotExchangeSeries(seriesRows, 'oi') : EMPTY_PIVOTED_SERIES),
		[seriesRows, hasOi]
	)

	const subtitleFor = useCallback(
		(segment: Segment) => {
			const cat = data?.categories?.[segment]
			if (!cat) return null
			return `${cat.market_count} pairs · ${formattedNum(cat.total_volume_24h ?? 0, true)}`
		},
		[data]
	)

	const lastUpdated = useMemo(() => {
		if (!data?.last_updated) return null
		const parsed = dayjs(data.last_updated)
		if (!parsed.isValid()) return null
		return { absolute: parsed.format('MMM D, YYYY HH:mm UTC'), relative: parsed.fromNow() }
	}, [data])

	const sectionHeader = (
		<div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--cards-border) p-3">
			<h2 className="group relative flex scroll-mt-24 items-center gap-1 text-xl font-bold" id={CEX_MARKETS_SECTION_ID}>
				Markets
				<a
					aria-hidden="true"
					tabIndex={-1}
					href={`#${CEX_MARKETS_SECTION_ID}`}
					className="absolute top-0 right-0 z-10 flex size-full items-center"
				/>
				<Icon name="link" className="invisible size-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			{lastUpdated ? (
				<span className="text-xs text-(--text-label)" title={lastUpdated.absolute}>
					Updated {lastUpdated.relative}
				</span>
			) : null}
		</div>
	)

	if (isLoading) {
		return (
			<section className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{sectionHeader}
				<div className="flex min-h-[360px] items-center justify-center p-3">
					<LocalLoader />
				</div>
			</section>
		)
	}

	if (error || !data || visibleCategoryTabs.length === 0) {
		return null
	}

	return (
		<section className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg)">
			{sectionHeader}
			<div className="flex flex-col gap-5 p-3">
				<MarketsSummary data={data} />

				<MarketsSegmentTabs
					activeSegment={selectedCategoryTab}
					onChange={setCategoryTab}
					subtitleFor={subtitleFor}
					availableSegments={visibleCategoryTabs}
				/>

				<div className="flex flex-col gap-5">
					<HeaderStrip data={data} category={selectedCategoryTab} showOi={hasOi} />

					<div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
						<MarketsAreaChart title="Volume (30d)" series={volSeries} />
						{hasOi ? <MarketsAreaChart title="Open interest (30d)" series={oiSeries} /> : null}
					</div>

					<TableWithSearch
						key={`${exchange}-${selectedCategoryTab}`}
						data={rows}
						columns={columns}
						columnToSearch="symbol"
						placeholder="Search pairs..."
						csvFileName={`cex-markets-${name}-${selectedCategoryTab}`}
						embedded
						sortingState={[{ id: 'volume_24h', desc: true }]}
					/>
				</div>
			</div>
		</section>
	)
}
