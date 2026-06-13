import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { LocalLoader } from '~/components/Loaders'
import {
	fetchMarketsCategories,
	fetchMarketsCategorySeries,
	fetchMarketsExchangeSeries,
	fetchMarketsExchangesList,
	fetchMarketsTokens
} from './api'
import { CategoriesTable } from './CategoriesTable'
import { ExchangesTable } from './ExchangesTable'
import { MarketsCharts } from './MarketsCharts'
import { MarketsSegmentTabs } from './MarketsSegmentTabs'
import { MarketsStatStrip } from './MarketsStatStrip'
import { MomentumCards } from './MomentumCards'
import { recordBySegment, resolveSegment, type Segment } from './segments'
import type { KnownTokenSlugs } from './shared'
import { TokensTable } from './TokensTable'
import type { CategoryStatsBySegment, ExchangeListRow, SymbolStatsBySegment } from './types'
import { aggregateCategories, availableSegmentsFromRows, segmentSubtitles as buildSegmentSubtitles } from './utils'

const STALE_TIME = 60 * 60 * 1000

// Stable empty fallbacks so query-less renders don't churn memo/callback deps.
const EMPTY_TOKENS: SymbolStatsBySegment = recordBySegment(() => [])
const EMPTY_CATEGORIES: CategoryStatsBySegment = recordBySegment(() => [])
const EMPTY_EXCHANGES: ExchangeListRow[] = []

export function MarketsHome({
	segment,
	onSegmentChange,
	knownTokenSlugs
}: {
	segment: Segment
	onSegmentChange: (segment: Segment) => void
	knownTokenSlugs: KnownTokenSlugs
}) {
	const tokensQuery = useQuery({
		queryKey: ['markets-tokens'],
		queryFn: fetchMarketsTokens,
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})
	const categoriesQuery = useQuery({
		queryKey: ['markets-categories'],
		queryFn: fetchMarketsCategories,
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})
	const exchangeSeriesQuery = useQuery({
		queryKey: ['markets-exchange-series'],
		queryFn: fetchMarketsExchangeSeries,
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})
	const categorySeriesQuery = useQuery({
		queryKey: ['markets-category-series'],
		queryFn: fetchMarketsCategorySeries,
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})
	const exchangesQuery = useQuery({
		queryKey: ['markets-exchanges-list'],
		queryFn: fetchMarketsExchangesList,
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false
	})

	const tokens = tokensQuery.data ?? EMPTY_TOKENS
	const availableSegments = React.useMemo(
		() => (tokensQuery.data ? availableSegmentsFromRows(tokens) : []),
		[tokensQuery.data, tokens]
	)
	const activeSegment = tokensQuery.data ? resolveSegment(segment, availableSegments) : segment
	const segmentTokens = tokens[activeSegment]
	const categoriesData = categoriesQuery.data ?? EMPTY_CATEGORIES
	const segmentCategories = React.useMemo(() => {
		const fromServer = categoriesData[activeSegment]
		if (fromServer && fromServer.length > 0) return fromServer
		return aggregateCategories(segmentTokens)
	}, [categoriesData, activeSegment, segmentTokens])

	const segmentSubtitles = React.useMemo(() => {
		if (!tokensQuery.data) return null
		return buildSegmentSubtitles(tokens)
	}, [tokensQuery.data, tokens])

	const subtitleFor = React.useCallback((seg: Segment) => segmentSubtitles?.[seg] ?? null, [segmentSubtitles])

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-1.5">
				<h1 className="text-2xl font-semibold">Markets</h1>
				<p className="text-sm text-(--text-label)">Per-asset spot and perpetual metrics merged across venues.</p>
			</header>
			<MarketsSegmentTabs
				activeSegment={activeSegment}
				onChange={onSegmentChange}
				subtitleFor={subtitleFor}
				availableSegments={tokensQuery.data ? availableSegments : undefined}
			/>

			{tokensQuery.isLoading ? (
				<div className="flex min-h-[360px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : tokensQuery.isError || segmentTokens.length === 0 ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-center text-sm text-(--text-label)">
					{tokensQuery.isError ? 'Failed to load market data.' : 'No data for this segment.'}
				</div>
			) : (
				<div className="flex flex-col gap-5">
					<MarketsStatStrip rows={segmentTokens} segment={activeSegment} />
					<div className="flex flex-col gap-2">
						<h2 className="text-base font-semibold">Movers · 24h</h2>
						<MomentumCards
							categories={segmentCategories}
							tokens={segmentTokens}
							segment={activeSegment}
							knownTokenSlugs={knownTokenSlugs}
						/>
					</div>
					<MarketsCharts
						exchangeSeries={exchangeSeriesQuery.data ?? []}
						categorySeries={categorySeriesQuery.data ?? []}
						segment={activeSegment}
					/>
					<CategoriesTable categories={segmentCategories} segment={activeSegment} />
					<ExchangesTable exchanges={exchangesQuery.data?.[activeSegment] ?? EMPTY_EXCHANGES} segment={activeSegment} />
					<TokensTable rows={segmentTokens} segment={activeSegment} knownTokenSlugs={knownTokenSlugs} />
				</div>
			)}
		</div>
	)
}
