import { useQueries } from '@tanstack/react-query'
import { lazy, Suspense, useContext, useMemo } from 'react'
import type { TimePeriod } from '~/containers/ProDashboard/dashboardReducer'
import { getChartQueryFn, getChartQueryKey, ProxyAuthTokenContext } from '~/containers/ProDashboard/queries'
import { CHART_TYPES } from '~/containers/ProDashboard/types'
import { chainIconUrl, tokenIconUrl } from '~/utils/icons'
import { getArticleEntityRoute } from '../entityLinks'
import type { ArticleChartConfig, ArticleChartEntity, ArticleChartRange } from '../types'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

const SERIES_COLORS = ['#3e6dcc', '#e07b39', '#16a34a', '#a855f7']

function entityLogo(entity: ArticleChartEntity) {
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

export function ArticleChartBlock({ config, index }: { config: ArticleChartConfig; index?: number }) {
	const meta = CHART_TYPES[config.chartType as keyof typeof CHART_TYPES]
	const chartLabel = meta?.title || config.chartType
	const timePeriod = rangeToTimePeriod(config.range)

	const authToken = useContext(ProxyAuthTokenContext)

	const queries = useQueries({
		queries: config.entities.map((entity) => ({
			queryKey: [
				'pro-dashboard',
				...getChartQueryKey(config.chartType, entity.entityType, entity.slug, entity.geckoId ?? null, timePeriod)
			],
			queryFn: getChartQueryFn(
				config.chartType,
				entity.entityType,
				entity.slug,
				entity.geckoId ?? null,
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

	const series = useMemo(() => {
		return config.entities
			.map((entity, i) => {
				const data = queries[i]?.data as Array<[number, number | null]> | undefined
				if (!data || data.length === 0) return null
				const baseColor = SERIES_COLORS[i % SERIES_COLORS.length]
				const seriesType = (meta?.chartType === 'bar' ? 'bar' : 'line') as 'line' | 'bar'
				return {
					name: entity.name,
					type: seriesType,
					color: baseColor,
					data,
					...(meta?.chartType === 'area' && config.entities.length === 1 ? { areaStyle: {} } : {})
				}
			})
			.filter(<T,>(v: T | null): v is T => v !== null)
	}, [queries, meta, config.entities])

	const primaryLatest = useMemo(() => {
		const data = queries[0]?.data as Array<[number, number | null]> | undefined
		return lastValue(data)
	}, [queries])

	const figureLabel = typeof index === 'number' ? `Fig. ${String(index).padStart(2, '0')}` : null
	const primaryEntity = config.entities[0]
	const route = primaryEntity ? getArticleEntityRoute(primaryEntity.entityType, primaryEntity.slug) : '/'
	const latestLabel = config.entities.length === 1 ? compactUsd(primaryLatest) : null
	const rangeLabel = RANGE_LABEL[config.range ?? 'all']
	const isMulti = config.entities.length > 1

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
		if (!annotationMarkLine || series.length === 0) return series
		const [first, ...rest] = series
		return [{ ...first, markLine: annotationMarkLine }, ...rest]
	}, [series, annotationMarkLine])

	const chartOptions = useMemo(
		() => ({
			xAxis: { show: true },
			yAxis: { show: true, type: config.logScale ? ('log' as const) : ('value' as const) }
		}),
		[config.logScale]
	)

	return (
		<figure className="article-chart-figure not-prose my-10 grid gap-3">
			<header className="flex items-end justify-between gap-4 border-t border-(--text-primary)/80 pt-3">
				<div className="flex min-w-0 items-center gap-3">
					{isMulti ? (
						<span className="flex shrink-0 -space-x-2">
							{config.entities.slice(0, 4).map((e) => (
								<span
									key={`${e.entityType}:${e.slug}`}
									className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--cards-bg)"
								>
									<img src={entityLogo(e)} alt="" className="h-full w-full object-cover" />
								</span>
							))}
						</span>
					) : primaryEntity ? (
						<span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--cards-bg)">
							<img src={entityLogo(primaryEntity)} alt="" className="h-full w-full object-cover" />
						</span>
					) : null}
					<div className="flex min-w-0 flex-col leading-tight">
						<span className="truncate text-[15px] font-semibold tracking-tight text-(--text-primary)">
							{config.entities.map((e) => e.name).join(' vs ')}
						</span>
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
					{config.entities.map((entity, i) => (
						<span key={`${entity.entityType}:${entity.slug}`} className="inline-flex items-center gap-1.5">
							<span
								aria-hidden
								className="h-2 w-2 rounded-full"
								style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
							/>
							<span className="text-(--text-primary)">{entity.name}</span>
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
					<span>
						{config.caption ||
							`${config.entities.map((e) => e.name).join(' vs ')} ${chartLabel.toLowerCase()}, USD-denominated.`}
					</span>
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
