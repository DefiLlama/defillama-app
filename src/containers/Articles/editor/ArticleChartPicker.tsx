import * as Ariakit from '@ariakit/react'
import { useQueries } from '@tanstack/react-query'
import { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAppMetadata } from '~/containers/ProDashboard/AppMetadataContext'
import type { TimePeriod } from '~/containers/ProDashboard/dashboardReducer'
import {
	getChartQueryFn,
	getChartQueryKey,
	ProxyAuthTokenContext,
	useProtocolsAndChains
} from '~/containers/ProDashboard/queries'
import { CHART_TYPES, getChainChartTypes, getProtocolChartTypes } from '~/containers/ProDashboard/types'
import { tokenIconUrl, chainIconUrl } from '~/utils/icons'
import type {
	ArticleChartAnnotation,
	ArticleChartConfig,
	ArticleChartEntity,
	ArticleChartEntityType,
	ArticleChartRange
} from '../types'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))

const PROTOCOL_CHART_TYPES = getProtocolChartTypes()
const CHAIN_CHART_TYPES = getChainChartTypes()

const SERIES_COLORS = ['#3e6dcc', '#e07b39', '#16a34a', '#a855f7']
const MAX_ENTITIES = 4
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

function entityKey(entity: { entityType: ArticleChartEntityType; slug: string }) {
	return `${entity.entityType}:${entity.slug}`
}

function entityLogo(entity: Entity | ArticleChartEntity) {
	if ('logo' in entity && entity.logo) return entity.logo
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
	entities,
	chartType,
	range,
	logScale,
	annotations,
	height
}: {
	entities: ArticleChartEntity[]
	chartType: string
	range: ArticleChartRange
	logScale: boolean
	annotations: ArticleChartAnnotation[]
	height: number
}) {
	const authToken = useContext(ProxyAuthTokenContext)
	const queries = useQueries({
		queries: entities.map((entity) => ({
			queryKey: [
				'pro-dashboard',
				...getChartQueryKey(chartType, entity.entityType, entity.slug, entity.geckoId ?? null, range as TimePeriod)
			],
			queryFn: getChartQueryFn(
				chartType,
				entity.entityType,
				entity.slug,
				entity.geckoId ?? null,
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
	const meta = CHART_TYPES[chartType as keyof typeof CHART_TYPES]

	const series = useMemo(() => {
		return entities
			.map((entity, i) => {
				const data = queries[i]?.data as Array<[number, number | null]> | undefined
				if (!data || data.length === 0) return null
				return {
					name: entity.name,
					type: (meta?.chartType === 'bar' ? 'bar' : 'line') as 'line' | 'bar',
					color: SERIES_COLORS[i % SERIES_COLORS.length],
					data,
					...(meta?.chartType === 'area' && entities.length === 1 ? { areaStyle: {} } : {})
				}
			})
			.filter(<T,>(v: T | null): v is T => v !== null)
	}, [queries, meta, entities])

	const seriesWithMarkers = useMemo(() => {
		if (annotations.length === 0 || series.length === 0) return series
		const [first, ...rest] = series
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
	}, [series, annotations])

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
	if (isError || series.length === 0) {
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

export function ArticleChartPickerDialog({ store, onInsert, initialConfig }: Props) {
	const open = Ariakit.useStoreState(store, 'open')
	const [tab, setTab] = useState<ArticleChartEntityType>('protocol')
	const [query, setQuery] = useState('')
	const [picked, setPicked] = useState<ArticleChartEntity[]>([])
	const [chartType, setChartType] = useState<string | null>(null)
	const [caption, setCaption] = useState('')
	const [range, setRange] = useState<ArticleChartRange>('all')
	const [logScale, setLogScale] = useState(false)
	const [annotations, setAnnotations] = useState<ArticleChartAnnotation[]>([])
	const inputRef = useRef<HTMLInputElement>(null)

	const { data: catalog, isLoading: catalogLoading } = useProtocolsAndChains()
	const { availableProtocolChartTypes, availableChainChartTypes, loading: metaLoading } = useAppMetadata()

	useEffect(() => {
		if (!open) {
			setQuery('')
			setPicked([])
			setChartType(null)
			setCaption('')
			setRange('all')
			setLogScale(false)
			setAnnotations([])
			setTab('protocol')
		} else if (initialConfig) {
			const firstEntity = initialConfig.entities[0]
			if (firstEntity) setTab(firstEntity.entityType)
			setChartType(initialConfig.chartType)
			setCaption(initialConfig.caption ?? '')
			setRange(initialConfig.range ?? 'all')
			setLogScale(initialConfig.logScale ?? false)
			setAnnotations(initialConfig.annotations ?? [])
			setPicked(initialConfig.entities.map((e) => ({ ...e })))
			requestAnimationFrame(() => inputRef.current?.focus())
		} else {
			requestAnimationFrame(() => inputRef.current?.focus())
		}
	}, [open, initialConfig])

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

	const filteredEntities = useMemo(() => {
		const q = query.trim().toLowerCase()
		const list = q
			? entities.filter((e) => e.name.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q))
			: entities
		return list.slice(0, 200)
	}, [entities, query])

	const pickedKeys = useMemo(() => new Set(picked.map(entityKey)), [picked])

	const togglePick = (entity: Entity) => {
		const key = entityKey(entity)
		setPicked((prev) => {
			if (prev.some((p) => entityKey(p) === key)) return prev.filter((p) => entityKey(p) !== key)
			if (prev.length >= MAX_ENTITIES) return prev
			const next: ArticleChartEntity = {
				entityType: entity.entityType,
				slug: entity.slug,
				name: entity.name,
				...(entity.geckoId ? { geckoId: entity.geckoId } : {})
			}
			return [...prev, next]
		})
	}

	const removePicked = (key: string) => {
		setPicked((prev) => prev.filter((p) => entityKey(p) !== key))
	}

	const availableTypes = useMemo<string[]>(() => {
		if (picked.length === 0) return []
		const order = picked[0].entityType === 'protocol' ? PROTOCOL_CHART_TYPES : CHAIN_CHART_TYPES
		const fn = picked[0].entityType === 'protocol' ? availableProtocolChartTypes : availableChainChartTypes
		const sets = picked.map((p) => new Set(fn(p.slug, { hasGeckoId: !!p.geckoId })))
		return order.filter((t) => sets.every((s) => s.has(t)))
	}, [picked, availableProtocolChartTypes, availableChainChartTypes])

	useEffect(() => {
		if (picked.length === 0) {
			setChartType(null)
			return
		}
		if (chartType && availableTypes.includes(chartType)) return
		setChartType(availableTypes[0] ?? null)
	}, [picked, availableTypes, chartType])

	const handleSwitchTab = (value: ArticleChartEntityType) => {
		if (picked.length > 0 && picked[0].entityType !== value) setPicked([])
		setTab(value)
		setChartType(null)
		setQuery('')
	}

	const canInsert = picked.length > 0 && !!chartType
	const handleInsert = () => {
		if (!canInsert || !chartType) return
		onInsert({
			entities: picked,
			chartType,
			...(range !== 'all' ? { range } : {}),
			...(logScale ? { logScale: true } : {}),
			...(annotations.length > 0 ? { annotations } : {}),
			...(caption.trim() ? { caption: caption.trim() } : {})
		})
		store.hide()
	}

	const chartTitle = chartType ? CHART_TYPES[chartType as keyof typeof CHART_TYPES]?.title || chartType : null

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

	const lockedTab = picked.length > 0 ? picked[0].entityType : null

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
						const disabled = lockedTab !== null && lockedTab !== value
						return (
							<button
								key={value}
								role="tab"
								aria-selected={active}
								type="button"
								disabled={disabled}
								onClick={() => handleSwitchTab(value)}
								className={`rounded px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
				{picked.length > 0 ? (
					<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
						{picked.length} / {MAX_ENTITIES} selected
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
					<div className="px-3 pt-3 pb-2">
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
								const key = entityKey(entity)
								const active = pickedKeys.has(key)
								const tvl = compactUsd(entity.tvl)
								const limitReached = !active && picked.length >= MAX_ENTITIES
								return (
									<li key={key}>
										<button
											type="button"
											onClick={() => togglePick(entity)}
											disabled={limitReached}
											className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
												active
													? 'bg-(--link-button) text-(--link-text)'
													: 'text-(--text-primary) hover:bg-(--link-hover-bg)'
											}`}
										>
											<span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--cards-bg)">
												<img src={entityLogo(entity)} alt="" className="h-full w-full object-cover" />
											</span>
											<span className="min-w-0 flex-1 truncate text-sm">{entity.name}</span>
											{active ? (
												<span className="font-jetbrains text-[10px] text-(--link-text)">✓</span>
											) : tvl ? (
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
					{picked.length === 0 ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 py-16 text-center">
							<div className="text-sm font-medium text-(--text-primary)">
								Pick up to {MAX_ENTITIES} {tab === 'protocol' ? 'protocols' : 'chains'}
							</div>
							<p className="max-w-xs text-xs text-(--text-tertiary)">
								Click entities on the left to add them. Compare up to four series in a single figure.
							</p>
						</div>
					) : (
						<>
							<div className="flex flex-wrap items-center gap-1.5 px-5 pt-4 pb-3">
								{picked.map((entity, i) => (
									<span
										key={entityKey(entity)}
										className="inline-flex items-center gap-1.5 rounded-full border border-(--cards-border) bg-(--app-bg) py-1 pr-1 pl-2.5"
									>
										<span
											aria-hidden
											className="h-2 w-2 rounded-full"
											style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
										/>
										<span className="text-[12px] font-medium text-(--text-primary)">{entity.name}</span>
										<button
											type="button"
											onClick={() => removePicked(entityKey(entity))}
											aria-label={`Remove ${entity.name}`}
											className="flex h-5 w-5 items-center justify-center rounded-full text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
										>
											×
										</button>
									</span>
								))}
							</div>

							<div className="grid gap-3 px-5 pb-3">
								<div className="grid gap-1.5">
									<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">Chart</span>
									{metaLoading && availableTypes.length === 0 ? (
										<div className="text-xs text-(--text-tertiary)">Loading available charts…</div>
									) : availableTypes.length === 0 ? (
										<div className="text-xs text-(--text-tertiary)">No charts available for this combination.</div>
									) : (
										<div className="flex flex-wrap gap-1.5">
											{availableTypes.map((type) => {
												const meta = CHART_TYPES[type as keyof typeof CHART_TYPES]
												const active = chartType === type
												return (
													<button
														key={type}
														type="button"
														onClick={() => setChartType(type)}
														className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
															active
																? 'border-(--link-text) bg-(--link-text) text-white'
																: 'border-(--cards-border) text-(--text-secondary) hover:border-(--link-text)/50 hover:text-(--text-primary)'
														}`}
													>
														{meta?.title || type}
													</button>
												)
											})}
										</div>
									)}
								</div>

								<div className="flex flex-wrap items-center gap-3">
									<div className="grid gap-1.5">
										<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">
											Range
										</span>
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
							</div>

							<div className="relative min-h-0 flex-1 border-t border-(--cards-border) bg-(--app-bg)">
								{chartType ? (
									<>
										<div className="pointer-events-none absolute top-3 left-5 z-10 flex items-center gap-2">
											<span className="rounded-full border border-(--cards-border) bg-(--cards-bg)/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase backdrop-blur">
												Preview
											</span>
											<span className="text-xs font-medium text-(--text-primary)">{chartTitle}</span>
										</div>
										<div className="px-3 pt-2 pb-3">
											<MultiPreview
												entities={picked}
												chartType={chartType}
												range={range}
												logScale={logScale}
												annotations={annotations}
												height={300}
											/>
										</div>
									</>
								) : null}
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
