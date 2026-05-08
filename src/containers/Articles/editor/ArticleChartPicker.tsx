import * as Ariakit from '@ariakit/react'
import { useQueries } from '@tanstack/react-query'
import { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAppMetadata } from '~/containers/ProDashboard/AppMetadataContext'
import { ChartTypePills } from '~/containers/ProDashboard/components/AddChartModal/ChartTypePills'
import type { TimePeriod } from '~/containers/ProDashboard/dashboardReducer'
import {
	getChartQueryFn,
	getChartQueryKey,
	ProxyAuthTokenContext,
	useProtocolsAndChains
} from '~/containers/ProDashboard/queries'
import { CHART_TYPES, getChainChartTypes, getProtocolChartTypes } from '~/containers/ProDashboard/types'
import { tokenIconUrl, chainIconUrl } from '~/utils/icons'
import { validateArticleChartConfig } from '../chartAdapters'
import type {
	ArticleChartAnnotation,
	ArticleChartConfig,
	ArticleChartEntityType,
	ArticleChartRange,
	ArticleChartSeries
} from '../types'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

const PROTOCOL_CHART_TYPES = getProtocolChartTypes()
const CHAIN_CHART_TYPES = getChainChartTypes()

const SERIES_COLORS = ['#3e6dcc', '#e07b39', '#16a34a', '#a855f7']
const MAX_SERIES = 4
const MAX_ANNOTATIONS = 5

const RANGES: Array<{ value: ArticleChartRange; label: string }> = [
	{ value: '30d', label: '30D' },
	{ value: '90d', label: '90D' },
	{ value: '365d', label: '1Y' },
	{ value: 'all', label: 'All' }
]

type Entity = {
	entityType: ArticleChartEntityType
	slug: string
	name: string
	logo?: string
	tvl?: number
	geckoId?: string | null
}

type Props = {
	store: Ariakit.DialogStore
	onInsert: (config: ArticleChartConfig) => void
	initialConfig?: ArticleChartConfig | null
}

function entityLogo(entity: { entityType: ArticleChartEntityType; slug: string; logo?: string }) {
	if (entity.logo) return entity.logo
	if (entity.entityType === 'chain') return chainIconUrl(entity.slug)
	return tokenIconUrl(entity.slug)
}

function compactUsd(value: number | undefined) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
	if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
	if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
	if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
	if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
	return `$${value.toFixed(0)}`
}

function MultiPreview({
	series,
	range,
	logScale,
	annotations,
	height
}: {
	series: ArticleChartSeries[]
	range: ArticleChartRange
	logScale: boolean
	annotations: ArticleChartAnnotation[]
	height: number
}) {
	const authToken = useContext(ProxyAuthTokenContext)
	const queries = useQueries({
		queries: series.map((s) => ({
			queryKey: [
				'pro-dashboard',
				...getChartQueryKey(s.chartType, s.entityType, s.slug, s.geckoId ?? null, range as TimePeriod)
			],
			queryFn: getChartQueryFn(
				s.chartType,
				s.entityType,
				s.slug,
				s.geckoId ?? null,
				range as TimePeriod,
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
				return {
					name: `${s.name} · ${meta?.title || s.chartType}`,
					type: (meta?.chartType === 'bar' ? 'bar' : 'line') as 'line' | 'bar',
					color: SERIES_COLORS[i % SERIES_COLORS.length],
					data,
					...(meta?.chartType === 'area' && series.length === 1 ? { areaStyle: {} } : {})
				}
			})
			.filter(<T,>(v: T | null): v is T => v !== null)
	}, [queries, series])

	const seriesWithMarkers = useMemo(() => {
		if (annotations.length === 0 || chartSeries.length === 0) return chartSeries
		const [first, ...rest] = chartSeries
		return [
			{
				...first,
				markLine: {
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
					data: annotations.map((a) => ({ xAxis: new Date(a.date).getTime() }))
				}
			},
			...rest
		]
	}, [chartSeries, annotations])

	const chartOptions = useMemo(
		() => ({
			xAxis: { show: true },
			yAxis: { show: true, type: logScale ? ('log' as const) : ('value' as const) }
		}),
		[logScale]
	)

	const heightPx = `${height}px`

	if (isLoading) {
		return (
			<div className="flex items-center justify-center text-xs text-(--text-tertiary)" style={{ height: heightPx }}>
				Loading chart…
			</div>
		)
	}
	if (isError || seriesWithMarkers.length === 0) {
		return (
			<div className="flex items-center justify-center text-xs text-(--text-tertiary)" style={{ height: heightPx }}>
				No data available
			</div>
		)
	}
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center text-xs text-(--text-tertiary)" style={{ height: heightPx }}>
					…
				</div>
			}
		>
			<MultiSeriesChart
				series={seriesWithMarkers}
				valueSymbol="$"
				groupBy="daily"
				hideDataZoom
				height={heightPx}
				chartOptions={chartOptions}
			/>
		</Suspense>
	)
}

function seriesId(s: ArticleChartSeries) {
	return `${s.entityType}:${s.slug}:${s.chartType}`
}

const DEFAULT_METRIC = 'tvl'

export function ArticleChartPickerDialog({ store, onInsert, initialConfig }: Props) {
	const open = Ariakit.useStoreState(store, 'open')
	const [tab, setTab] = useState<ArticleChartEntityType>('protocol')
	const [query, setQuery] = useState('')
	const [series, setSeries] = useState<ArticleChartSeries[]>([])
	const [caption, setCaption] = useState('')
	const [range, setRange] = useState<ArticleChartRange>('all')
	const [logScale, setLogScale] = useState(false)
	const [annotations, setAnnotations] = useState<ArticleChartAnnotation[]>([])
	const [protocolMetric, setProtocolMetric] = useState<string>(DEFAULT_METRIC)
	const [chainMetric, setChainMetric] = useState<string>(DEFAULT_METRIC)
	const inputRef = useRef<HTMLInputElement>(null)

	const { data: catalog, isLoading: catalogLoading } = useProtocolsAndChains()
	const { availableProtocolChartTypes, availableChainChartTypes, loading: metaLoading } = useAppMetadata()

	useEffect(() => {
		if (!open) {
			setQuery('')
			setSeries([])
			setCaption('')
			setRange('all')
			setLogScale(false)
			setAnnotations([])
			setTab('protocol')
			setProtocolMetric(DEFAULT_METRIC)
			setChainMetric(DEFAULT_METRIC)
		} else if (initialConfig) {
			const normalized = validateArticleChartConfig(initialConfig)
			const normalizedSeries = normalized?.series ?? []
			const firstSeries = normalizedSeries[0]
			if (firstSeries) setTab(firstSeries.entityType)
			setCaption(normalized?.caption ?? '')
			setRange(normalized?.range ?? 'all')
			setLogScale(normalized?.logScale ?? false)
			setAnnotations(normalized?.annotations ?? [])
			setSeries(normalizedSeries.map((s) => ({ ...s })))
			const lastProtocol = [...normalizedSeries].reverse().find((s) => s.entityType === 'protocol')
			const lastChain = [...normalizedSeries].reverse().find((s) => s.entityType === 'chain')
			if (lastProtocol) setProtocolMetric(lastProtocol.chartType)
			if (lastChain) setChainMetric(lastChain.chartType)
			requestAnimationFrame(() => inputRef.current?.focus())
		} else {
			requestAnimationFrame(() => inputRef.current?.focus())
		}
	}, [open, initialConfig])

	const currentMetric = tab === 'protocol' ? protocolMetric : chainMetric
	const setCurrentMetric = (next: string) => {
		if (tab === 'protocol') setProtocolMetric(next)
		else setChainMetric(next)
	}

	const entities = useMemo<Entity[]>(() => {
		if (!catalog) return []
		if (tab === 'protocol') {
			return (catalog.protocols || [])
				.filter((p: any) => p.slug)
				.map((p: any) => ({
					entityType: 'protocol' as const,
					slug: p.slug,
					name: p.name,
					logo: p.logo,
					tvl: p.tvl,
					geckoId: p.geckoId ?? null
				}))
		}
		return (catalog.chains || []).map((c: any) => ({
			entityType: 'chain' as const,
			slug: c.name,
			name: c.name,
			tvl: c.tvl,
			geckoId: c.gecko_id ?? null
		}))
	}, [catalog, tab])

	const availableTypesForEntity = (entityType: ArticleChartEntityType, slug: string, geckoId?: string | null) => {
		const order = entityType === 'protocol' ? PROTOCOL_CHART_TYPES : CHAIN_CHART_TYPES
		const fn = entityType === 'protocol' ? availableProtocolChartTypes : availableChainChartTypes
		const allowed = new Set(fn(slug, { hasGeckoId: !!geckoId }))
		return order.filter((t) => allowed.has(t))
	}

	const filteredEntities = useMemo(() => {
		const q = query.trim().toLowerCase()
		const fn = tab === 'protocol' ? availableProtocolChartTypes : availableChainChartTypes
		const supportsCurrent = (e: Entity) => {
			const allowed = new Set(fn(e.slug, { hasGeckoId: !!e.geckoId }))
			return allowed.has(currentMetric)
		}
		const list = entities.filter(supportsCurrent)
		const searched = q
			? list.filter((e) => e.name.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q))
			: list
		return searched.slice(0, 200)
	}, [entities, query, tab, currentMetric, availableProtocolChartTypes, availableChainChartTypes])

	const chartTypeOptions = useMemo(() => {
		const order = tab === 'protocol' ? PROTOCOL_CHART_TYPES : CHAIN_CHART_TYPES
		return order.map((value) => ({
			value,
			label: CHART_TYPES[value as keyof typeof CHART_TYPES]?.title || value,
			available: true
		}))
	}, [tab])

	const toggleEntity = (entity: Entity) => {
		const candidate: ArticleChartSeries = {
			entityType: entity.entityType,
			slug: entity.slug,
			name: entity.name,
			...(entity.geckoId ? { geckoId: entity.geckoId } : {}),
			chartType: currentMetric
		}
		const id = seriesId(candidate)
		setSeries((prev) => {
			if (prev.some((s) => seriesId(s) === id)) {
				return prev.filter((s) => seriesId(s) !== id)
			}
			if (prev.length >= MAX_SERIES) return prev
			return [...prev, candidate]
		})
	}

	const removeSeries = (id: string) => {
		setSeries((prev) => prev.filter((s) => seriesId(s) !== id))
	}

	const updateSeriesChartType = (id: string, chartType: string) => {
		setSeries((prev) => {
			const next = prev.map((s) => (seriesId(s) === id ? { ...s, chartType } : s))
			const seenIds = new Set<string>()
			return next.filter((s) => {
				const sid = seriesId(s)
				if (seenIds.has(sid)) return false
				seenIds.add(sid)
				return true
			})
		})
	}

	const canInsert = series.length > 0
	const handleInsert = () => {
		if (!canInsert) return
		const seenIds = new Set<string>()
		const dedupedSeries = series.filter((s) => {
			const id = seriesId(s)
			if (seenIds.has(id)) return false
			seenIds.add(id)
			return true
		})
		const seenEntities = new Set<string>()
		const entitiesLegacy = dedupedSeries
			.map((s) => ({
				entityType: s.entityType,
				slug: s.slug,
				name: s.name,
				...(s.geckoId ? { geckoId: s.geckoId } : {})
			}))
			.filter((e) => {
				const key = `${e.entityType}:${e.slug}`
				if (seenEntities.has(key)) return false
				seenEntities.add(key)
				return true
			})
		const counts = new Map<string, number>()
		for (const s of dedupedSeries) counts.set(s.chartType, (counts.get(s.chartType) ?? 0) + 1)
		let chartTypeLegacy = dedupedSeries[0].chartType
		let bestCount = 0
		for (const [type, count] of counts) {
			if (count > bestCount) {
				chartTypeLegacy = type
				bestCount = count
			}
		}
		onInsert({
			series: dedupedSeries,
			entities: entitiesLegacy,
			chartType: chartTypeLegacy,
			...(range !== 'all' ? { range } : {}),
			...(logScale ? { logScale: true } : {}),
			...(annotations.length > 0 ? { annotations } : {}),
			...(caption.trim() ? { caption: caption.trim() } : {})
		})
		store.hide()
	}

	const updateAnnotation = (index: number, patch: Partial<ArticleChartAnnotation>) => {
		setAnnotations((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)))
	}
	const addAnnotation = () => {
		if (annotations.length >= MAX_ANNOTATIONS) return
		setAnnotations((prev) => [...prev, { date: new Date().toISOString().slice(0, 10), label: '' }])
	}
	const removeAnnotation = (index: number) => {
		setAnnotations((prev) => prev.filter((_, i) => i !== index))
	}

	const selectedIds = useMemo(() => new Set(series.map(seriesId)), [series])

	return (
		<Ariakit.Dialog
			store={store}
			modal
			backdrop={<div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />}
			className="fixed top-1/2 left-1/2 z-[81] flex max-h-[92vh] w-[min(1180px,96vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-(--cards-border) bg-(--cards-bg) shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] outline-none"
		>
			<div className="flex flex-wrap items-center gap-3 border-b border-(--cards-border) px-5 py-3">
				<Ariakit.DialogHeading className="mr-2 text-sm font-semibold tracking-tight text-(--text-primary)">
					Embed a DefiLlama chart
				</Ariakit.DialogHeading>
				<div
					role="tablist"
					className="flex items-center rounded-md border border-(--cards-border) bg-(--app-bg) p-0.5 text-xs"
				>
					{(['protocol', 'chain'] as const).map((value) => {
						const active = tab === value
						return (
							<button
								key={value}
								role="tab"
								aria-selected={active}
								type="button"
								onClick={() => {
									setTab(value)
									setQuery('')
								}}
								className={`rounded px-3 py-1 font-medium transition-colors ${
									active
										? 'bg-(--cards-bg) text-(--text-primary) shadow-sm'
										: 'text-(--text-tertiary) hover:text-(--text-primary)'
								}`}
							>
								{value === 'protocol' ? 'Protocols' : 'Chains'}
							</button>
						)
					})}
				</div>
				{series.length > 0 ? (
					<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
						{series.length} / {MAX_SERIES} series
					</span>
				) : null}
				<div className="ml-auto">
					<Ariakit.DialogDismiss className="rounded-md border border-transparent px-2 py-1 text-xs text-(--text-tertiary) hover:border-(--cards-border) hover:text-(--text-primary)">
						Close
					</Ariakit.DialogDismiss>
				</div>
			</div>

			<div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[300px_1fr]">
				<aside className="flex min-h-0 flex-col border-(--cards-border) bg-(--app-bg)/40 md:border-r">
					<div className="grid gap-2 px-3 pt-3 pb-2">
						<div>
							<span className="mb-1 block text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">
								Metric to add
							</span>
							<ChartTypePills
								chartTypes={chartTypeOptions}
								selectedType={currentMetric}
								onSelect={setCurrentMetric}
								isLoading={metaLoading}
								mode={tab}
							/>
						</div>
						<div className="relative">
							<svg
								aria-hidden
								viewBox="0 0 24 24"
								className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--text-tertiary)"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="11" cy="11" r="7" />
								<path d="m20 20-3.5-3.5" strokeLinecap="round" />
							</svg>
							<input
								ref={inputRef}
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder={tab === 'protocol' ? 'Search protocols' : 'Search chains'}
								className="w-full rounded-md border border-(--cards-border) bg-(--cards-bg) py-1.5 pr-2 pl-8 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
							/>
						</div>
					</div>
					<ul className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
						{catalogLoading ? (
							<li className="px-3 py-8 text-center text-xs text-(--text-tertiary)">Loading…</li>
						) : filteredEntities.length === 0 ? (
							<li className="px-3 py-8 text-center text-xs text-(--text-tertiary)">No results</li>
						) : (
							filteredEntities.map((entity) => {
								const candidateId = `${entity.entityType}:${entity.slug}:${currentMetric}`
								const checked = selectedIds.has(candidateId)
								const tvl = compactUsd(entity.tvl)
								const limitReached = !checked && series.length >= MAX_SERIES
								return (
									<li key={`${entity.entityType}:${entity.slug}`}>
										<button
											type="button"
											onClick={() => toggleEntity(entity)}
											disabled={limitReached}
											aria-pressed={checked}
											className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
												checked ? 'bg-(--link-button) text-(--link-text)' : 'text-(--text-primary) hover:bg-(--link-hover-bg)'
											}`}
										>
											<span
												className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
													checked
														? 'border-(--link-text) bg-(--link-text)'
														: 'border-(--form-control-border) bg-(--cards-bg) group-hover:border-(--text-tertiary)'
												}`}
											>
												{checked ? (
													<svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
														<path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												) : null}
											</span>
											<span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--cards-bg)">
												<img src={entityLogo(entity)} alt="" className="h-full w-full object-cover" />
											</span>
											<span className="min-w-0 flex-1 truncate text-sm">{entity.name}</span>
											{tvl ? (
												<span className="shrink-0 text-[11px] text-(--text-tertiary) tabular-nums">{tvl}</span>
											) : null}
										</button>
									</li>
								)
							})
						)}
					</ul>
				</aside>

				<section className="flex thin-scrollbar min-h-0 flex-col overflow-y-auto">
					{series.length === 0 ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 py-16 text-center">
							<div className="text-sm font-medium text-(--text-primary)">Pick up to {MAX_SERIES} series</div>
							<p className="max-w-sm text-xs leading-relaxed text-(--text-tertiary)">
								Choose a metric from the left, then tick any protocols or chains to add them as series. Switch metric or
								tab to mix different metrics and entity types on a single chart.
							</p>
						</div>
					) : (
						<>
							<div className="grid gap-2 px-5 pt-4 pb-3">
								<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">Series</span>
								<ul className="grid gap-1.5">
									{series.map((s, i) => {
										const id = seriesId(s)
										const types = availableTypesForEntity(s.entityType, s.slug, s.geckoId)
										return (
											<li
												key={id}
												className="grid grid-cols-[12px_1fr_auto_24px] items-center gap-2 rounded-md border border-(--cards-border) bg-(--app-bg) px-2.5 py-1.5"
											>
												<span
													aria-hidden
													className="h-2 w-2 rounded-full"
													style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
												/>
												<span className="flex min-w-0 items-center gap-2">
													<span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--cards-bg)">
														<img src={entityLogo(s)} alt="" className="h-full w-full object-cover" />
													</span>
													<span className="truncate text-[12px] font-medium text-(--text-primary)">{s.name}</span>
													<span className="font-jetbrains text-[9px] tracking-[0.16em] text-(--text-tertiary) uppercase">
														{s.entityType}
													</span>
												</span>
												<select
													value={s.chartType}
													onChange={(e) => updateSeriesChartType(id, e.target.value)}
													className="rounded border border-(--form-control-border) bg-(--cards-bg) px-2 py-1 text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
												>
													{types.map((type) => {
														const meta = CHART_TYPES[type as keyof typeof CHART_TYPES]
														return (
															<option key={type} value={type}>
																{meta?.title || type}
															</option>
														)
													})}
												</select>
												<button
													type="button"
													onClick={() => removeSeries(id)}
													aria-label={`Remove ${s.name}`}
													className="flex h-6 w-6 items-center justify-center rounded text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
												>
													×
												</button>
											</li>
										)
									})}
								</ul>
								{metaLoading ? (
									<div className="text-[11px] text-(--text-tertiary)">Loading available chart types…</div>
								) : null}
							</div>

							<div className="flex flex-wrap items-center gap-3 px-5 pb-3">
								<div className="grid gap-1.5">
									<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">Range</span>
									<div className="flex items-center rounded-md border border-(--cards-border) bg-(--app-bg) p-0.5 text-xs">
										{RANGES.map((r) => {
											const active = range === r.value
											return (
												<button
													key={r.value}
													type="button"
													onClick={() => setRange(r.value)}
													className={`rounded px-2.5 py-1 font-medium transition-colors ${
														active
															? 'bg-(--cards-bg) text-(--text-primary) shadow-sm'
															: 'text-(--text-tertiary) hover:text-(--text-primary)'
													}`}
												>
													{r.label}
												</button>
											)
										})}
									</div>
								</div>
								<label className="flex cursor-pointer items-center gap-2 self-end pb-1 text-xs text-(--text-secondary)">
									<input
										type="checkbox"
										checked={logScale}
										onChange={(e) => setLogScale(e.target.checked)}
										className="h-3.5 w-3.5 accent-(--link-text)"
									/>
									<span>Log scale (Y-axis)</span>
								</label>
							</div>

							<div className="relative min-h-0 flex-1 border-t border-(--cards-border) bg-(--app-bg)">
								<div className="pointer-events-none absolute top-3 left-5 z-10 flex items-center gap-2">
									<span className="rounded-full border border-(--cards-border) bg-(--cards-bg)/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase backdrop-blur">
										Preview
									</span>
								</div>
								<div className="px-3 pt-2 pb-3">
									<MultiPreview
										series={series}
										range={range}
										logScale={logScale}
										annotations={annotations}
										height={300}
									/>
								</div>
							</div>

							<div className="grid gap-2 border-t border-(--cards-border) px-5 py-3">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">
										Annotations
									</span>
									<button
										type="button"
										onClick={addAnnotation}
										disabled={annotations.length >= MAX_ANNOTATIONS}
										className="rounded border border-(--cards-border) px-2 py-0.5 text-[11px] text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
									>
										+ Add
									</button>
								</div>
								{annotations.length === 0 ? (
									<p className="text-[11px] text-(--text-tertiary)">
										Mark a date on the chart with a short label (e.g. "V3 launch", "depeg event").
									</p>
								) : (
									<ul className="grid gap-1.5">
										{annotations.map((annotation, i) => (
											<li
												key={i}
												className="grid grid-cols-[16px_120px_1fr_24px] items-center gap-2 rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1.5"
											>
												<span className="font-jetbrains text-[10px] font-semibold text-(--text-tertiary)">
													{String.fromCharCode(65 + i)}
												</span>
												<input
													type="date"
													value={annotation.date.slice(0, 10)}
													onChange={(e) => updateAnnotation(i, { date: e.target.value })}
													className="rounded border border-(--form-control-border) bg-(--cards-bg) px-2 py-1 text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
												/>
												<input
													value={annotation.label}
													onChange={(e) => updateAnnotation(i, { label: e.target.value })}
													placeholder="Label"
													className="rounded border border-(--form-control-border) bg-(--cards-bg) px-2 py-1 text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
												/>
												<button
													type="button"
													onClick={() => removeAnnotation(i)}
													aria-label="Remove annotation"
													className="flex h-6 w-6 items-center justify-center rounded text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
												>
													×
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						</>
					)}
				</section>
			</div>

			<div className="grid items-end gap-3 border-t border-(--cards-border) bg-(--cards-bg) px-5 py-3 md:grid-cols-[1fr_auto]">
				<label className="grid gap-1">
					<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">
						Caption (optional)
					</span>
					<input
						value={caption}
						onChange={(event) => setCaption(event.target.value)}
						placeholder="Add a one-line caption shown under the chart…"
						disabled={!canInsert}
						className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none disabled:opacity-60"
					/>
				</label>
				<div className="flex items-center justify-end gap-2">
					<Ariakit.DialogDismiss className="rounded-md border border-(--cards-border) px-3 py-2 text-xs text-(--text-secondary) hover:bg-(--link-hover-bg)">
						Cancel
					</Ariakit.DialogDismiss>
					<button
						type="button"
						disabled={!canInsert}
						onClick={handleInsert}
						className="rounded-md bg-(--link-text) px-4 py-2 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
					>
						{initialConfig ? 'Update chart' : 'Insert chart'}
					</button>
				</div>
			</div>
		</Ariakit.Dialog>
	)
}
