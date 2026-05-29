import { useQueries } from '@tanstack/react-query'
import { lazy, Suspense, useContext, useMemo, type ReactNode } from 'react'
import type { TimePeriod } from '~/containers/ProDashboard/dashboardReducer'
import { getChartQueryFn, getChartQueryKey, ProxyAuthTokenContext } from '~/containers/ProDashboard/queries'
import { CHART_TYPES } from '~/containers/ProDashboard/types'
import { chainIconUrl, tokenIconUrl } from '~/utils/icons'
import { getArticleEntityRoute } from '../entityLinks'
import type { ArticleChartConfig, ArticleChartEntityType, ArticleChartRange, ArticleChartSeries } from '../types'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

const SERIES_COLORS = ['#3e6dcc', '#e07b39', '#16a34a', '#a855f7']

function entityLogo(entity: { entityType: ArticleChartEntityType; slug: string }) {
	return entity.entityType === 'chain' ? chainIconUrl(entity.slug) : tokenIconUrl(entity.slug)
}

function rangeToTimePeriod(range: ArticleChartRange | undefined): TimePeriod {
	return (range ?? 'all') as TimePeriod
}

const RANGE_LABEL: Record<ArticleChartRange, string> = {
	'30d': 'Past 30 days',
	'90d': 'Past 90 days',
	'365d': 'Past year',
	all: 'All time'
}

function compactUsd(value: number | null | undefined) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null
	const abs = Math.abs(value)
	if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
	if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
	if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
	if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
	return `$${value.toFixed(2)}`
}

function lastValue(data: Array<[number, number | null]> | undefined): number | null {
	if (!data || data.length === 0) return null
	const last = data[data.length - 1]
	return Array.isArray(last) ? (last[1] as number | null) : null
}

function seriesDisplayName(s: ArticleChartSeries) {
	const meta = CHART_TYPES[s.chartType as keyof typeof CHART_TYPES]
	return meta?.title ? `${s.name} ${meta.title}` : s.name
}

function uniqueChartTypeTitles(series: ArticleChartSeries[]) {
	const seen = new Set<string>()
	const out: string[] = []
	for (const s of series) {
		if (seen.has(s.chartType)) continue
		seen.add(s.chartType)
		const meta = CHART_TYPES[s.chartType as keyof typeof CHART_TYPES]
		out.push(meta?.title || s.chartType)
	}
	return out
}

export function ArticleChartBlock({
	config,
	index,
	captionSlot
}: {
	config: ArticleChartConfig
	index?: number
	captionSlot?: ReactNode
}) {
	const series = config.series
	const timePeriod = rangeToTimePeriod(config.range)
	const chartLabel = uniqueChartTypeTitles(series).join(' / ')

	const authToken = useContext(ProxyAuthTokenContext)

	const queries = useQueries({
		queries: series.map((s) => ({
			queryKey: [
				'pro-dashboard',
				...getChartQueryKey(s.chartType, s.entityType, s.slug, s.geckoId ?? null, timePeriod)
			],
			queryFn: getChartQueryFn(
				s.chartType,
				s.entityType,
				s.slug,
				s.geckoId ?? null,
				timePeriod,
				undefined,
				undefined,
				undefined,
				authToken
			),
			staleTime: 1000 * 60 * 5,
			gcTime: 1000 * 60 * 30,
			refetchOnWindowFocus: false
		}))
	})

	const isLoading = queries.some((q) => q.isLoading)
	const isError = queries.length > 0 && queries.every((q) => q.isError)

	const chartSeries = useMemo(() => {
		return series
			.map((s, i) => {
				const data = queries[i]?.data as Array<[number, number | null]> | undefined
				if (!data || data.length === 0) return null
				const meta = CHART_TYPES[s.chartType as keyof typeof CHART_TYPES]
				const seriesType = (meta?.chartType === 'bar' ? 'bar' : 'line') as 'line' | 'bar'
				return {
					name: seriesDisplayName(s),
					type: seriesType,
					color: SERIES_COLORS[i % SERIES_COLORS.length],
					data,
					...(meta?.chartType === 'area' && series.length === 1 ? { areaStyle: {} } : {})
				}
			})
			.filter(<T,>(v: T | null): v is T => v !== null)
	}, [queries, series])

	const primaryLatest = useMemo(() => {
		const data = queries[0]?.data as Array<[number, number | null]> | undefined
		return lastValue(data)
	}, [queries])

	const figureLabel = typeof index === 'number' ? `Fig. ${String(index).padStart(2, '0')}` : null
	const primarySeries = series[0]
	const route = primarySeries ? getArticleEntityRoute(primarySeries.entityType, primarySeries.slug) : '/'
	const latestLabel = series.length === 1 ? compactUsd(primaryLatest) : null
	const rangeLabel = RANGE_LABEL[config.range ?? 'all']
	const isMulti = series.length > 1

	const uniqueEntities = useMemo(() => {
		const seen = new Set<string>()
		const out: ArticleChartSeries[] = []
		for (const s of series) {
			const key = `${s.entityType}:${s.slug}`
			if (seen.has(key)) continue
			seen.add(key)
			out.push(s)
		}
		return out
	}, [series])

	const annotationMarkLine = useMemo(() => {
		if (!config.annotations || config.annotations.length === 0) return null
		return {
			silent: false,
			symbol: ['none', 'none'] as const,
			lineStyle: { color: '#9ca3af', type: 'dashed' as const, width: 1 },
			label: {
				color: '#6b7280',
				fontSize: 10,
				formatter: (params: { dataIndex?: number }) => {
					const idx = typeof params.dataIndex === 'number' ? params.dataIndex : 0
					return String.fromCharCode(65 + idx)
				}
			},
			data: config.annotations.map((a) => ({ xAxis: new Date(a.date).getTime() }))
		}
	}, [config.annotations])

	const seriesWithMarkers = useMemo(() => {
		if (!annotationMarkLine || chartSeries.length === 0) return chartSeries
		const [first, ...rest] = chartSeries
		return [{ ...first, markLine: annotationMarkLine }, ...rest]
	}, [chartSeries, annotationMarkLine])

	const chartOptions = useMemo(
		() => ({
			xAxis: { show: true },
			yAxis: { show: true, type: config.logScale ? ('log' as const) : ('value' as const) }
		}),
		[config.logScale]
	)

	const titleText = useMemo(() => {
		const allSameEntity = uniqueEntities.length === 1
		if (allSameEntity) return uniqueEntities[0].name
		return uniqueEntities.map((s) => s.name).join(' vs ')
	}, [uniqueEntities])

	return (
		<figure className="article-chart-figure not-prose my-10 grid gap-3">
			<header className="flex items-end justify-between gap-4 border-t border-(--text-primary)/80 pt-3">
				<div className="flex min-w-0 items-center gap-3">
					{uniqueEntities.length > 1 ? (
						<span className="flex shrink-0 -space-x-2">
							{uniqueEntities.slice(0, 4).map((e) => (
								<span
									key={`${e.entityType}:${e.slug}`}
									className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--cards-bg)"
								>
									<img src={entityLogo(e)} alt="" className="h-full w-full object-cover" />
								</span>
							))}
						</span>
					) : primarySeries ? (
						<span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--cards-bg)">
							<img src={entityLogo(primarySeries)} alt="" className="h-full w-full object-cover" />
						</span>
					) : null}
					<div className="flex min-w-0 flex-col leading-tight">
						<span className="truncate text-[15px] font-semibold tracking-tight text-(--text-primary)">{titleText}</span>
						<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
							{chartLabel} · {rangeLabel}
						</span>
					</div>
				</div>
				<div className="flex shrink-0 items-end gap-4 text-right">
					{latestLabel ? (
						<div className="flex flex-col leading-tight">
							<span className="font-jetbrains text-[9px] tracking-[0.2em] text-(--text-tertiary) uppercase">
								Latest
							</span>
							<span className="font-jetbrains text-base font-semibold text-(--text-primary) tabular-nums">
								{latestLabel}
							</span>
						</div>
					) : null}
					{figureLabel ? (
						<span className="hidden font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase sm:inline">
							{figureLabel}
						</span>
					) : null}
				</div>
			</header>

			{isMulti ? (
				<div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-(--text-secondary)">
					{series.map((s, i) => (
						<span key={`${s.entityType}:${s.slug}:${s.chartType}`} className="inline-flex items-center gap-1.5">
							<span
								aria-hidden
								className="h-2 w-2 rounded-full"
								style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
							/>
							<span className="text-(--text-primary)">{seriesDisplayName(s)}</span>
						</span>
					))}
				</div>
			) : null}

			<div className="article-chart-body relative">
				<div className="h-[380px] w-full">
					{isLoading ? (
						<div className="flex h-full items-center justify-center text-xs text-(--text-tertiary)">Loading chart…</div>
					) : isError || seriesWithMarkers.length === 0 ? (
						<div className="flex h-full items-center justify-center text-xs text-(--text-tertiary)">
							No data available
						</div>
					) : (
						<Suspense
							fallback={<div className="flex h-full items-center justify-center text-xs text-(--text-tertiary)">…</div>}
						>
							<MultiSeriesChart
								series={seriesWithMarkers}
								valueSymbol="$"
								groupBy="daily"
								hideDataZoom
								height="380px"
								chartOptions={chartOptions}
							/>
						</Suspense>
					)}
				</div>
			</div>

			<figcaption className="flex flex-wrap items-baseline justify-between gap-3 border-t border-(--cards-border) pt-2 text-[13px] leading-snug text-(--text-secondary)">
				<div className="min-w-0 flex-1">
					{figureLabel ? <span className="mr-1.5 font-semibold text-(--text-primary)">{figureLabel}.</span> : null}
					{captionSlot !== undefined ? (
						captionSlot
					) : (
						<span>
							{config.caption ||
								`${uniqueEntities.map((e) => e.name).join(' vs ')} ${chartLabel.toLowerCase()}, USD-denominated.`}
						</span>
					)}
					{config.logScale ? (
						<span className="ml-2 rounded border border-(--cards-border) px-1.5 py-px font-jetbrains text-[10px] tracking-wider text-(--text-tertiary) uppercase">
							log scale
						</span>
					) : null}
				</div>
				<div className="shrink-0 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					Source ·{' '}
					<a
						href={route}
						target="_blank"
						rel="noreferrer noopener"
						className="text-(--text-tertiary) hover:text-(--link-text)"
					>
						DefiLlama
					</a>
				</div>
			</figcaption>

			{config.annotations && config.annotations.length > 0 ? (
				<ol className="grid gap-1 border-t border-dashed border-(--cards-border) pt-2 text-[12px] text-(--text-secondary)">
					{config.annotations.map((a, i) => (
						<li key={`${a.date}-${i}`} className="flex gap-2">
							<span className="font-jetbrains text-[10px] font-semibold text-(--text-tertiary)">
								{String.fromCharCode(65 + i)}
							</span>
							<span className="font-jetbrains text-[10px] text-(--text-tertiary)">
								{new Date(a.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
							</span>
							<span className="text-(--text-secondary)">{a.label}</span>
						</li>
					))}
				</ol>
			) : null}
		</figure>
	)
}
