import { useQuery } from '@tanstack/react-query'
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useCallback, useMemo, useReducer } from 'react'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { fetchMarketsExchangeSeries } from '~/containers/Markets/api'
import { ChangeCell, FundingCell, MetricStat } from '~/containers/Markets/marketMetrics'
import { MarketsAreaChart } from '~/containers/Markets/MarketsAreaChart'
import { MarketsSegmentTabs } from '~/containers/Markets/MarketsSegmentTabs'
import type { Segment } from '~/containers/Markets/types'
import { resolveSegment, segmentHasOi } from '~/containers/Markets/types'
import { pctChange, pivotExchangeSeries } from '~/containers/Markets/utils'
import { formattedNum } from '~/utils'
import { fetchExchangeMarkets } from './api'
import type { ExchangeMarketCategory, ExchangeMarketPair, ExchangeMarketsResponse } from './markets.types'

const STALE_TIME = 60 * 60 * 1000
const CEX_MARKETS_SECTION_ID = 'markets'

const columnHelper = createColumnHelper<ExchangeMarketPair>()

function renderNullableNum(value: number | null | undefined, isUsd = false): string {
	if (value == null) return '–'
	return formattedNum(value, isUsd)
}

function renderFeeRate(value: number | null | undefined): string {
	if (value == null) return '–'
	return `${(value * 100).toFixed(3)}%`
}

function renderLeverage(value: number | null | undefined): string {
	if (value == null) return '–'
	return `${value}x`
}

const pairColumn = columnHelper.accessor('symbol', {
	id: 'symbol',
	header: 'Pair',
	enableSorting: false,
	cell: ({ getValue, row }) => {
		const pair = <span className="text-sm uppercase">{getValue()}</span>
		return row.original.pair_url ? (
			<a
				href={row.original.pair_url}
				target="_blank"
				rel="noopener noreferrer"
				className="text-(--link-text) hover:underline"
			>
				{pair}
			</a>
		) : (
			pair
		)
	},
	meta: {
		headerClassName: 'w-[140px]'
	}
})

const priceColumn = columnHelper.accessor((row) => row.price ?? undefined, {
	id: 'price',
	header: 'Price',
	cell: ({ getValue }) => renderNullableNum(getValue() ?? null, true),
	meta: {
		headerClassName: 'w-[110px]',
		align: 'end'
	}
})

const priceChangeColumn = columnHelper.accessor((row) => row.price_change_24h ?? undefined, {
	id: 'price_change_24h',
	header: '24h',
	cell: ({ row }) => <ChangeCell fraction={row.original.price_change_24h} />,
	meta: {
		headerClassName: 'w-[100px]',
		align: 'end'
	}
})

const volumeColumn = columnHelper.accessor((row) => row.volume_24h ?? undefined, {
	id: 'volume_24h',
	header: '24h Volume',
	cell: ({ getValue }) => renderNullableNum(getValue() ?? null, true),
	meta: {
		headerClassName: 'w-[120px]',
		align: 'end'
	}
})

const volumeChangeColumn = columnHelper.accessor((row) => pctChange(row.volume_24h, row.volume_prev_24h) ?? undefined, {
	id: 'volume_change_24h',
	header: 'Vol Δ',
	cell: ({ row }) => <ChangeCell fraction={pctChange(row.original.volume_24h, row.original.volume_prev_24h)} />,
	meta: {
		headerClassName: 'w-[100px]',
		align: 'end'
	}
})

const oiColumn = columnHelper.accessor((row) => row.oi_usd ?? undefined, {
	id: 'oi_usd',
	header: 'Open Interest',
	cell: ({ getValue }) => renderNullableNum(getValue() ?? null, true),
	meta: {
		headerClassName: 'w-[140px]',
		align: 'end'
	}
})

const oiChangeColumn = columnHelper.accessor((row) => pctChange(row.oi_usd, row.oi_prev_usd) ?? undefined, {
	id: 'oi_change_24h',
	header: 'OI Δ',
	cell: ({ row }) => <ChangeCell fraction={pctChange(row.original.oi_usd, row.original.oi_prev_usd)} />,
	meta: {
		headerClassName: 'w-[100px]',
		align: 'end'
	}
})

const fundingColumn = columnHelper.accessor((row) => row.funding_rate_8h ?? undefined, {
	id: 'funding_rate_8h',
	header: 'Funding (8h)',
	cell: ({ row }) => <FundingCell rate={row.original.funding_rate_8h} />,
	meta: {
		headerClassName: 'w-[130px]',
		align: 'end'
	}
})

const maxLeverageColumn = columnHelper.accessor((row) => row.max_leverage ?? undefined, {
	id: 'max_leverage',
	header: 'Max Leverage',
	cell: ({ row }) => renderLeverage(row.original.max_leverage),
	meta: {
		headerClassName: 'w-[130px]',
		align: 'end'
	}
})

const makerFeeColumn = columnHelper.accessor((row) => row.maker_fee ?? undefined, {
	id: 'maker_fee',
	header: 'Maker Fee',
	cell: ({ row }) => renderFeeRate(row.original.maker_fee),
	meta: {
		headerClassName: 'w-[110px]',
		align: 'end'
	}
})

const takerFeeColumn = columnHelper.accessor((row) => row.taker_fee ?? undefined, {
	id: 'taker_fee',
	header: 'Taker Fee',
	cell: ({ row }) => renderFeeRate(row.original.taker_fee),
	meta: {
		headerClassName: 'w-[110px]',
		align: 'end'
	}
})

const SPOT_COLUMNS: ColumnDef<ExchangeMarketPair, any>[] = [
	pairColumn,
	priceColumn,
	priceChangeColumn,
	volumeColumn,
	volumeChangeColumn,
	makerFeeColumn,
	takerFeeColumn
]
const PERP_COLUMNS: ColumnDef<ExchangeMarketPair, any>[] = [
	pairColumn,
	priceColumn,
	priceChangeColumn,
	volumeColumn,
	volumeChangeColumn,
	oiColumn,
	oiChangeColumn,
	fundingColumn,
	maxLeverageColumn,
	makerFeeColumn,
	takerFeeColumn
]

function getCategoryRows(data: ExchangeMarketsResponse, category: ExchangeMarketCategory): ExchangeMarketPair[] {
	return data.categories[category]?.pairs ?? []
}

function getAvailableCategories(data: ExchangeMarketsResponse): ExchangeMarketCategory[] {
	const categories: ExchangeMarketCategory[] = []
	for (const segment of ['spot', 'linear_perp', 'inverse_perp'] as const) {
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
	category: ExchangeMarketCategory
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
	const [categoryTab, setCategoryTab] = useReducer(
		(_: ExchangeMarketCategory, next: ExchangeMarketCategory) => next,
		'spot'
	)

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

	const exchangeKey = (data?.exchange ?? exchange).toLowerCase()
	const seriesRows = useMemo(
		() =>
			(seriesQuery.data ?? []).filter(
				(row) => row.exchange.toLowerCase() === exchangeKey && row.segment === selectedCategoryTab
			),
		[seriesQuery.data, exchangeKey, selectedCategoryTab]
	)
	const volSeries = useMemo(() => pivotExchangeSeries(seriesRows, 'volume'), [seriesRows])
	const oiSeries = useMemo(() => pivotExchangeSeries(seriesRows, 'oi'), [seriesRows])

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
