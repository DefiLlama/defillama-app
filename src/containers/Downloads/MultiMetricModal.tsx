import * as Ariakit from '@ariakit/react'
import { useQueries } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon, type IIcon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { slug as toSlug } from '~/utils'
import { downloadCSV } from '~/utils/download'
import { chartDatasets, chartDatasetsBySlug, type ChartDatasetDefinition, type ChartOptionsMap } from './chart-datasets'
import { combineCsvsWide, type CsvItem } from './combineCsvsWide'
import { parseCsv, type ParsedCsvRow } from './csvParse'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const MAX_METRICS = 25
const PREVIEW_ROWS = 200
const SUGGESTED_COUNT = 8

export interface ParamOption {
	label: string
	value: string
}

export type ParamType = 'protocol' | 'chain'

const PARAM_LABELS: Record<ParamType, { singular: string; verb: string; search: string }> = {
	protocol: { singular: 'protocol', verb: 'Pick a protocol', search: 'Search protocols...' },
	chain: { singular: 'chain', verb: 'Pick a chain', search: 'Search chains...' }
}

interface CsvQueryStatus {
	data: unknown
	isLoading: boolean
	error: unknown
}

interface MultiMetricModalProps {
	chartOptionsMap: ChartOptionsMap
	authorizedFetch: (url: string, options?: RequestInit) => Promise<Response>
	onClose: () => void
	isPreview: boolean
}

function resolveDatasetValue(
	paramValue: string,
	paramType: ParamType,
	datasetOptions: ParamOption[]
): string | null {
	if (paramType === 'protocol') {
		// All protocol datasets share the toSlug(p.name) convention.
		return datasetOptions.find((o) => o.value === paramValue)?.value ?? null
	}
	// Chains: values are inconsistent across datasets — some raw (e.g. "Ethereum"),
	// some slugged (e.g. "ethereum"). Match on either form.
	const lower = paramValue.toLowerCase()
	const slugged = toSlug(paramValue)
	for (const opt of datasetOptions) {
		if (opt.value === paramValue) return opt.value
		if (opt.value.toLowerCase() === lower) return opt.value
		if (opt.value === slugged) return opt.value
		if (toSlug(opt.label) === slugged) return opt.value
	}
	return null
}

function paramSlugForFilename(value: string): string {
	const s = toSlug(value)
	return s || 'combined'
}

function shortMetricName(dataset: ChartDatasetDefinition): string {
	return dataset.name
		.replace(/^(Protocol|Chain)\s+/i, '')
		.replace(/\s+Chart$/i, '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
}

function metricDisplayName(dataset: ChartDatasetDefinition): string {
	return dataset.name.replace(/^Protocol\s+/i, '')
}

export function MultiMetricModal({
	chartOptionsMap,
	authorizedFetch,
	onClose,
	isPreview
}: MultiMetricModalProps) {
	const subscribeModalStore = Ariakit.useDialogStore()
	const [paramType, setParamType] = useState<ParamType>('protocol')
	const [param, setParam] = useState<ParamOption | null>(null)
	const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
	const [activeMetric, setActiveMetric] = useState<string | null>(null)

	const protocolOptions = useMemo<ParamOption[]>(
		() => chartOptionsMap['protocol-tvl-chart'] ?? [],
		[chartOptionsMap]
	)
	const chainOptions = useMemo<ParamOption[]>(
		() => chartOptionsMap['chain-tvl-chart'] ?? [],
		[chartOptionsMap]
	)
	const paramOptions = paramType === 'protocol' ? protocolOptions : chainOptions

	const availableMetrics = useMemo(() => {
		if (!param) return []
		return chartDatasets.filter((d) => {
			if (d.paramType !== paramType) return false
			const opts = chartOptionsMap[d.slug] ?? []
			return resolveDatasetValue(param.value, paramType, opts) !== null
		})
	}, [param, paramType, chartOptionsMap])

	useEffect(() => {
		const availableSet = new Set(availableMetrics.map((m) => m.slug))
		setSelectedMetrics((prev) => {
			const next = prev.filter((slug) => availableSet.has(slug))
			return next.length === prev.length ? prev : next
		})
	}, [availableMetrics])

	useEffect(() => {
		setActiveMetric((cur) => {
			if (selectedMetrics.length === 0) return null
			if (cur && selectedMetrics.includes(cur)) return cur
			return selectedMetrics[0]
		})
	}, [selectedMetrics])

	const csvQueries = useQueries({
		queries: selectedMetrics.map((slug) => {
			const datasetOpts = chartOptionsMap[slug] ?? []
			const datasetValue = param ? resolveDatasetValue(param.value, paramType, datasetOpts) : null
			return {
				queryKey: ['multi-metric', slug, paramType, datasetValue, isPreview] as const,
				queryFn: async () => {
					if (!datasetValue) throw new Error(`Not available for this ${PARAM_LABELS[paramType].singular}`)
					const url = `/api/downloads/chart/${slug}?param=${encodeURIComponent(datasetValue)}`
					const resp = await authorizedFetch(url)
					if (!resp.ok) {
						let msg = `Request failed (${resp.status})`
						try {
							const body = await resp.json()
							if (body && typeof body.error === 'string') msg = body.error
						} catch {}
						throw new Error(msg)
					}
					return await resp.text()
				},
				enabled: !!param && !!datasetValue,
				staleTime: 5 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: 1
			}
		})
	})

	const activeQueryIndex = useMemo(
		() => selectedMetrics.findIndex((s) => s === activeMetric),
		[selectedMetrics, activeMetric]
	)
	const activeQuery = activeQueryIndex >= 0 ? csvQueries[activeQueryIndex] : null
	const activeCsvText = (activeQuery?.data as string | undefined) ?? undefined
	const activeLoading = !!activeQuery?.isLoading
	const activeError = activeQuery?.error
	const activeDataset = activeMetric ? chartDatasetsBySlug.get(activeMetric) ?? null : null

	const parsedActive = useMemo(() => (activeCsvText ? parseCsv(activeCsvText) : null), [activeCsvText])

	const readyCount = csvQueries.filter((q) => typeof q.data === 'string').length
	const loadingCount = csvQueries.filter((q) => q.isLoading).length

	const handleToggleMetric = useCallback((slug: string) => {
		setSelectedMetrics((prev) => {
			if (prev.includes(slug)) return prev.filter((s) => s !== slug)
			if (prev.length >= MAX_METRICS) {
				toast.error(`Max ${MAX_METRICS} metrics`)
				return prev
			}
			return [...prev, slug]
		})
	}, [])

	const handleClearMetrics = useCallback(() => setSelectedMetrics([]), [])

	const handleSelectAll = useCallback(() => {
		setSelectedMetrics(availableMetrics.slice(0, MAX_METRICS).map((m) => m.slug))
	}, [availableMetrics])

	const handleRemoveMetric = useCallback((slug: string) => {
		setSelectedMetrics((prev) => prev.filter((s) => s !== slug))
	}, [])

	const handleSetActive = useCallback((slug: string) => setActiveMetric(slug), [])

	const handleChangeParam = useCallback((next: ParamOption) => {
		setParam(next)
	}, [])

	const handleChangeParamType = useCallback((next: ParamType) => {
		setParamType((prev) => {
			if (prev === next) return prev
			setParam(null)
			setSelectedMetrics([])
			setActiveMetric(null)
			return next
		})
	}, [])

	const handleDownloadCombined = useCallback(() => {
		if (!param) return
		const ready: CsvItem[] = []
		const failed: Array<{ slug: string; name: string }> = []
		csvQueries.forEach((query, i) => {
			const slug = selectedMetrics[i]
			if (!slug) return
			const dataset = chartDatasetsBySlug.get(slug)
			if (!dataset) return
			const data = query.data as unknown
			if (typeof data === 'string') {
				ready.push({ label: dataset.name, value: shortMetricName(dataset), csvText: data })
				return
			}
			const err = (query as { error?: unknown }).error
			if (err) failed.push({ slug, name: dataset.name })
		})
		if (ready.length === 0) {
			toast.error('No data ready to download')
			return
		}
		const merged = combineCsvsWide(ready)
		if (merged.length <= 1) {
			toast.error('No rows to download')
			return
		}
		const filename = `${paramSlugForFilename(param.value)}_metrics.csv`
		downloadCSV(filename, merged, { addTimestamp: true })
		if (failed.length > 0) {
			toast.success(`Downloaded ${filename} — skipped ${failed.length} (${failed.map((f) => f.name).join(', ')})`)
		} else {
			toast.success(`Downloaded ${filename}`)
		}
	}, [csvQueries, selectedMetrics, param])

	const handleDownloadSingle = useCallback(
		(slug: string) => {
			if (!param) return
			const idx = selectedMetrics.findIndex((s) => s === slug)
			if (idx < 0) return
			const query = csvQueries[idx]
			const data = query?.data as unknown
			if (typeof data !== 'string' || !data) {
				toast.error('Not ready yet')
				return
			}
			const dataset = chartDatasetsBySlug.get(slug)
			if (!dataset) return
			const filename = `${paramSlugForFilename(param.value)}_${shortMetricName(dataset)}.csv`
			downloadCSV(filename, data, { addTimestamp: true })
			toast.success(`Downloaded ${filename}`)
		},
		[csvQueries, selectedMetrics, param]
	)

	const handleSubscribeClick = useCallback(() => {
		setSignupSource('downloads')
		subscribeModalStore.show()
	}, [subscribeModalStore])

	const handleTopBarDownload = useCallback(() => {
		if (isPreview) {
			handleSubscribeClick()
			return
		}
		if (selectedMetrics.length === 1) {
			handleDownloadSingle(selectedMetrics[0])
		} else {
			handleDownloadCombined()
		}
	}, [isPreview, selectedMetrics, handleSubscribeClick, handleDownloadSingle, handleDownloadCombined])

	const isBulk = selectedMetrics.length > 1
	const hasSelection = selectedMetrics.length > 0
	const downloadLabel = isBulk ? 'Download combined' : 'Download CSV'
	const topBarDownloadDisabled = !isPreview && (
		!param ||
		!hasSelection ||
		(isBulk
			? loadingCount === selectedMetrics.length || readyCount === 0
			: activeLoading || !activeCsvText)
	)

	const headerSubtitle = (() => {
		if (!param) return `${PARAM_LABELS[paramType].verb} to begin`
		if (!hasSelection) {
			return `${availableMetrics.length} metrics available — pick any to combine`
		}
		if (loadingCount > 0) {
			return `Loading ${readyCount}/${selectedMetrics.length}`
		}
		if (isBulk) {
			return `${selectedMetrics.length} metrics ready · previewing ${
				activeDataset ? metricDisplayName(activeDataset) : ''
			}`
		}
		if (activeError) return 'Error loading metric'
		if (parsedActive) {
			return `${parsedActive.rows.length.toLocaleString()} rows · ${parsedActive.headers.length} cols`
		}
		return ''
	})()

	const suggestions = useMemo(
		() => paramOptions.slice(0, SUGGESTED_COUNT),
		[paramOptions]
	)

	return (
		<>
			<Ariakit.DialogProvider
				open
				setOpen={(open) => {
					if (!open) onClose()
				}}
			>
				<Ariakit.Dialog
					className="fixed inset-0 z-50 m-auto flex max-h-[90dvh] min-h-[55dvh] w-[calc(100vw-1rem)] max-w-7xl flex-col overflow-hidden rounded-xl border border-(--cards-border) bg-(--cards-bg) shadow-2xl sm:w-[calc(100vw-2rem)]"
					portal
					unmountOnHide
					backdrop={<div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />}
				>
					<div className="flex shrink-0 flex-col border-b border-(--divider)">
						<div className="flex items-center gap-3 px-4 py-2.5">
							<div className="mr-auto min-w-0">
								<div className="flex items-center gap-2">
									<h2 className="truncate text-base font-semibold">
										{param ? param.label : 'Combined report'}
									</h2>
									<span className="rounded-full bg-(--primary)/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-(--primary) uppercase">
										Combined
									</span>
								</div>
								<p className="truncate text-xs text-(--text-tertiary)">{headerSubtitle}</p>
							</div>

							{param && hasSelection ? (
								<button
									type="button"
									onClick={handleTopBarDownload}
									disabled={topBarDownloadDisabled}
									className="flex items-center gap-1.5 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
								>
									<Icon name="download-cloud" className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">{downloadLabel}</span>
								</button>
							) : null}

							<button
								type="button"
								onClick={onClose}
								className="rounded-md p-1.5 text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
								aria-label="Close"
							>
								<Icon name="x" className="h-4 w-4" />
							</button>
						</div>

						<div className="flex flex-wrap items-center gap-2 border-t border-(--divider) px-4 py-2">
							<ParamPickerPopover
								paramType={paramType}
								value={param}
								protocolOptions={protocolOptions}
								chainOptions={chainOptions}
								onChange={handleChangeParam}
								onChangeParamType={handleChangeParamType}
							/>

							{param ? (
								<MetricMultiPickerPopover
									metrics={availableMetrics}
									selected={selectedMetrics}
									onToggle={handleToggleMetric}
									onClearAll={handleClearMetrics}
									onSelectAll={handleSelectAll}
									maxSelections={MAX_METRICS}
								/>
							) : null}

							{isPreview ? (
								<p className="ml-auto text-[11px] text-(--text-tertiary)">Preview — last 10 rows</p>
							) : null}
						</div>
					</div>

					<div className="flex min-h-0 flex-1 flex-col sm:flex-row">
						<div className="flex min-h-0 min-w-0 flex-1 flex-col">
							{!param ? (
								<ParamPickerEmpty
									paramType={paramType}
									onChangeParamType={handleChangeParamType}
									options={paramOptions}
									suggestions={suggestions}
									onSelect={handleChangeParam}
								/>
							) : !hasSelection ? (
								<EmptyState
									paramType={paramType}
									availableCount={availableMetrics.length}
									onSelectAll={availableMetrics.length > 0 ? handleSelectAll : undefined}
								/>
							) : !activeMetric ? (
								<CenteredHint icon="search" text="Pick a metric to preview" />
							) : activeLoading ? (
								<CenteredLoader />
							) : activeError ? (
								<CenteredError error={activeError} />
							) : !parsedActive || parsedActive.rows.length === 0 ? (
								<CenteredHint icon="eye-off" text="No data" />
							) : (
								<PreviewTable parsed={parsedActive} />
							)}
						</div>

						{param && hasSelection ? (
							<MetricsSidebar
								selectedMetrics={
									selectedMetrics
										.map((slug) => chartDatasetsBySlug.get(slug))
										.filter((d): d is ChartDatasetDefinition => !!d)
								}
								csvQueries={csvQueries as ReadonlyArray<CsvQueryStatus>}
								activeMetric={activeMetric}
								onSetActive={handleSetActive}
								onRemove={handleRemoveMetric}
								onClearAll={handleClearMetrics}
								onDownloadSingle={handleDownloadSingle}
								onDownloadCombined={handleDownloadCombined}
								isPreview={isPreview}
								onSubscribeClick={handleSubscribeClick}
								readyCount={readyCount}
								loadingCount={loadingCount}
							/>
						) : null}
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>

			{isPreview ? (
				<Suspense fallback={null}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
		</>
	)
}

function ParamTypeToggle({
	paramType,
	onChange,
	size = 'md'
}: {
	paramType: ParamType
	onChange: (next: ParamType) => void
	size?: 'sm' | 'md'
}) {
	const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
	return (
		<div className="inline-flex items-center gap-0.5 rounded-md border border-(--divider) bg-(--bg-primary) p-0.5">
			{(['protocol', 'chain'] as const).map((t) => (
				<button
					key={t}
					type="button"
					onClick={() => onChange(t)}
					className={`rounded-sm font-medium capitalize transition-colors ${pad} ${
						paramType === t
							? 'bg-(--primary) text-white shadow-sm'
							: 'text-(--text-secondary) hover:text-(--text-primary)'
					}`}
				>
					{t}
				</button>
			))}
		</div>
	)
}

function ParamPickerEmpty({
	paramType,
	onChangeParamType,
	options,
	suggestions,
	onSelect
}: {
	paramType: ParamType
	onChangeParamType: (next: ParamType) => void
	options: ParamOption[]
	suggestions: ParamOption[]
	onSelect: (opt: ParamOption) => void
}) {
	const popoverStore = Ariakit.usePopoverStore()
	const [search, setSearch] = useState('')
	const deferred = useDeferredValue(search.trim().toLowerCase())

	const filtered = useMemo(() => {
		const source = deferred ? options.filter((o) => o.label.toLowerCase().includes(deferred)) : options
		return source.slice(0, 200)
	}, [options, deferred])

	const labels = PARAM_LABELS[paramType]

	return (
		<div className="flex flex-1 items-center justify-center px-6 py-8">
			<div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
				<div className="flex h-11 w-11 items-center justify-center rounded-full bg-(--primary)/10">
					<Icon name="layers" className="h-5 w-5 text-(--primary)" />
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-base font-medium text-(--text-primary)">
						Choose a {labels.singular} to begin
					</p>
					<p className="text-xs text-(--text-tertiary)">
						Pick a {labels.singular} — we&rsquo;ll show its available metrics so you can combine them.
					</p>
				</div>

				<ParamTypeToggle paramType={paramType} onChange={onChangeParamType} />

				<div className="w-full">
					<Ariakit.PopoverProvider store={popoverStore}>
						<Ariakit.PopoverDisclosure className="group flex w-full items-center justify-between gap-3 rounded-lg border border-(--form-control-border) bg-(--bg-primary) px-3.5 py-2.5 text-sm transition-colors hover:border-(--primary)/50 focus:border-(--primary) focus:outline-none focus:ring-2 focus:ring-(--primary)/20">
							<span className="flex items-center gap-2 text-(--text-tertiary)">
								<Icon name="search" className="h-4 w-4" />
								Search a {labels.singular}
							</span>
							<Icon
								name="chevron-down"
								className="h-4 w-4 text-(--text-tertiary) transition-transform group-aria-expanded:rotate-180"
							/>
						</Ariakit.PopoverDisclosure>
						<Ariakit.Popover
							gutter={6}
							portal
							unmountOnHide
							sameWidth
							className="z-[70] flex max-h-96 flex-col overflow-hidden rounded-lg border border-(--divider) bg-(--cards-bg) shadow-xl"
						>
							<div className="border-b border-(--divider) px-3 py-2">
								<input
									value={search}
									onChange={(e) => setSearch(e.currentTarget.value)}
									placeholder={labels.search}
									className="w-full rounded-md border border-(--divider) bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-(--text-tertiary) focus:border-(--primary)"
									autoFocus
								/>
							</div>
							<div className="thin-scrollbar flex-1 overflow-auto py-1">
								{filtered.length === 0 ? (
									<p className="px-3 py-2 text-xs text-(--text-tertiary)">No results</p>
								) : (
									filtered.map((opt) => (
										<button
											key={opt.value}
											type="button"
											onClick={() => {
												onSelect(opt)
												setSearch('')
												popoverStore.hide()
											}}
											className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
										>
											<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--text-tertiary)/30" />
											<span className="truncate">{opt.label}</span>
										</button>
									))
								)}
								{filtered.length >= 200 ? (
									<p className="px-3 py-2 text-[11px] text-(--text-tertiary)">
										Showing first 200 — refine the search to narrow results
									</p>
								) : null}
							</div>
						</Ariakit.Popover>
					</Ariakit.PopoverProvider>
				</div>

				{suggestions.length > 0 ? (
					<div className="flex flex-col items-center gap-2">
						<p className="text-[10px] font-semibold tracking-[0.08em] text-(--text-tertiary) uppercase">
							Or start with
						</p>
						<div className="flex flex-wrap justify-center gap-1.5">
							{suggestions.map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => onSelect(opt)}
									className="inline-flex items-center gap-1 rounded-md border border-(--divider) bg-(--bg-primary) px-2.5 py-1 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--primary)/50 hover:text-(--text-primary)"
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>
				) : null}
			</div>
		</div>
	)
}

function EmptyState({
	paramType,
	availableCount,
	onSelectAll
}: {
	paramType: ParamType
	availableCount: number
	onSelectAll?: () => void
}) {
	return (
		<div className="flex flex-1 items-center justify-center px-6">
			<div className="flex max-w-sm flex-col items-center gap-3 text-center">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--primary)/10">
					<Icon name="layers" className="h-5 w-5 text-(--primary)" />
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-sm font-medium text-(--text-primary)">Select metrics to combine</p>
					<p className="text-xs text-(--text-tertiary)">
						{availableCount > 0
							? `Pick any of ${availableCount} time-series metrics from the toolbar above. They'll merge into one CSV with date columns aligned.`
							: `No time-series metrics available for this ${PARAM_LABELS[paramType].singular}.`}
					</p>
				</div>
				{onSelectAll ? (
					<button
						type="button"
						onClick={onSelectAll}
						className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-(--primary)/30 bg-(--primary)/5 px-3 py-1.5 text-xs font-medium text-(--primary) transition-colors hover:bg-(--primary)/10"
					>
						<Icon name="check" className="h-3.5 w-3.5" />
						Select all {availableCount}
					</button>
				) : null}
			</div>
		</div>
	)
}

function CenteredLoader() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="flex flex-col items-center gap-3">
				<LoadingSpinner size={28} />
				<p className="text-sm text-(--text-secondary)">Fetching data...</p>
			</div>
		</div>
	)
}

function CenteredError({ error }: { error: unknown }) {
	const msg = error instanceof Error ? error.message : 'Failed to fetch data'
	return (
		<div className="flex flex-1 items-center justify-center px-6">
			<div className="flex max-w-md flex-col items-center gap-2 text-center">
				<Icon name="alert-triangle" className="h-6 w-6 text-red-500" />
				<p className="text-sm text-red-500">{msg}</p>
			</div>
		</div>
	)
}

function CenteredHint({ icon, text }: { icon: IIcon['name']; text: string }) {
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="flex flex-col items-center gap-2 text-center">
				<Icon name={icon} className="h-6 w-6 text-(--text-tertiary)" />
				<p className="text-sm text-(--text-secondary)">{text}</p>
			</div>
		</div>
	)
}

function PreviewTable({ parsed }: { parsed: { headers: string[]; rows: ParsedCsvRow[] } }) {
	const { headers, rows } = parsed
	const display = rows.slice(0, PREVIEW_ROWS)
	return (
		<div className="thin-scrollbar relative min-h-0 flex-1 overflow-auto">
			<table className="w-full text-xs">
				<thead className="sticky top-0 z-10 bg-(--cards-bg)">
					<tr>
						{headers.map((h) => (
							<th
								key={h}
								className="border-b border-(--divider) px-3 py-2 text-left font-medium whitespace-nowrap text-(--text-tertiary)"
							>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{display.map((row, rowIdx) => (
						<tr
							key={row.id}
							className={`border-b border-(--divider)/40 last:border-b-0 ${
								rowIdx % 2 === 1 ? 'bg-(--bg-primary)/40' : ''
							}`}
						>
							{headers.map((_, i) => (
								<td
									key={i}
									className={`px-3 py-1.5 whitespace-nowrap text-(--text-primary) ${
										i === 0 ? '' : 'tabular-nums'
									}`}
								>
									{row.values[i] ?? ''}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{rows.length > PREVIEW_ROWS ? (
				<p className="border-t border-(--divider) bg-(--cards-bg) px-3 py-2 text-[11px] text-(--text-tertiary)">
					Showing first {PREVIEW_ROWS.toLocaleString()} of {rows.length.toLocaleString()} rows · download for full data
				</p>
			) : null}
		</div>
	)
}

interface MetricsSidebarProps {
	selectedMetrics: ChartDatasetDefinition[]
	csvQueries: ReadonlyArray<CsvQueryStatus>
	activeMetric: string | null
	onSetActive: (slug: string) => void
	onRemove: (slug: string) => void
	onClearAll: () => void
	onDownloadSingle: (slug: string) => void
	onDownloadCombined: () => void
	isPreview: boolean
	onSubscribeClick: () => void
	readyCount: number
	loadingCount: number
}

function MetricsSidebar({
	selectedMetrics,
	csvQueries,
	activeMetric,
	onSetActive,
	onRemove,
	onClearAll,
	onDownloadSingle,
	onDownloadCombined,
	isPreview,
	onSubscribeClick,
	readyCount,
	loadingCount
}: MetricsSidebarProps) {
	const combinedDisabled = loadingCount > 0 || readyCount === 0
	return (
		<aside className="hidden w-72 shrink-0 flex-col border-l border-(--divider) bg-(--bg-primary) sm:flex">
			<div className="flex items-center justify-between gap-2 border-b border-(--divider) px-3 py-2">
				<div className="min-w-0">
					<p className="text-xs font-semibold text-(--text-primary)">
						Selected metrics ({selectedMetrics.length})
					</p>
					{loadingCount > 0 ? (
						<p className="text-[10px] text-(--text-tertiary)">
							Ready {readyCount}/{selectedMetrics.length}
						</p>
					) : null}
				</div>
				{selectedMetrics.length > 0 ? (
					<button
						type="button"
						onClick={onClearAll}
						className="shrink-0 text-[11px] text-(--text-tertiary) hover:text-(--text-primary) hover:underline"
					>
						Clear all
					</button>
				) : null}
			</div>
			<div className="thin-scrollbar flex-1 overflow-auto">
				{selectedMetrics.map((metric, i) => {
					const query = csvQueries[i]
					const isActive = metric.slug === activeMetric
					const isReady = typeof query?.data === 'string'
					const isQueryLoading = !!query?.isLoading
					const hasError = !!query?.error
					return (
						<div
							key={metric.slug}
							className={`flex items-center gap-1.5 border-b border-(--divider) px-2.5 py-2 text-xs transition-colors ${
								isActive ? 'bg-(--link-hover-bg)' : 'hover:bg-(--link-hover-bg)'
							}`}
						>
							<button
								type="button"
								onClick={() => onSetActive(metric.slug)}
								className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
								title={`Preview ${metric.name}`}
							>
								<span className="flex h-4 w-4 shrink-0 items-center justify-center">
									{isQueryLoading ? (
										<LoadingSpinner size={12} />
									) : hasError ? (
										<Icon name="alert-triangle" className="h-3.5 w-3.5 text-red-500" />
									) : isReady ? (
										<Icon name="check" className="h-3.5 w-3.5 text-green-500" />
									) : null}
								</span>
								<span
									className={`truncate ${isActive ? 'font-medium text-(--text-primary)' : 'text-(--text-secondary)'}`}
								>
									{metricDisplayName(metric)}
								</span>
							</button>
							<button
								type="button"
								onClick={() => onDownloadSingle(metric.slug)}
								disabled={!isReady || isPreview}
								title={isPreview ? 'Subscribe to download' : 'Download this CSV'}
								className="shrink-0 rounded p-1 text-(--text-tertiary) transition-colors hover:bg-(--bg-main) hover:text-(--primary) disabled:cursor-not-allowed disabled:opacity-30"
							>
								<Icon name="download-cloud" className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => onRemove(metric.slug)}
								title="Remove"
								className="shrink-0 rounded p-1 text-(--text-tertiary) transition-colors hover:bg-(--bg-main) hover:text-red-500"
							>
								<Icon name="x" className="h-3.5 w-3.5" />
							</button>
						</div>
					)
				})}
			</div>
			<div className="border-t border-(--divider) p-3">
				{isPreview ? (
					<button
						type="button"
						onClick={onSubscribeClick}
						className="flex w-full items-center justify-center gap-1.5 rounded-md bg-(--primary) px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90"
					>
						<Icon name="arrow-up-right" className="h-3.5 w-3.5" />
						Subscribe to download
					</button>
				) : (
					<>
						<button
							type="button"
							onClick={onDownloadCombined}
							disabled={combinedDisabled}
							className="flex w-full items-center justify-center gap-1.5 rounded-md bg-(--primary) px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
						>
							<Icon name="download-cloud" className="h-3.5 w-3.5" />
							Download combined CSV
						</button>
						<p className="mt-1.5 text-center text-[10px] text-(--text-tertiary)">
							Wide format — each metric becomes a column
						</p>
					</>
				)}
			</div>
		</aside>
	)
}

function ParamPickerPopover({
	paramType,
	value,
	protocolOptions,
	chainOptions,
	onChange,
	onChangeParamType
}: {
	paramType: ParamType
	value: ParamOption | null
	protocolOptions: ParamOption[]
	chainOptions: ParamOption[]
	onChange: (opt: ParamOption) => void
	onChangeParamType: (next: ParamType) => void
}) {
	const popoverStore = Ariakit.usePopoverStore()
	const [search, setSearch] = useState('')
	const deferredSearch = useDeferredValue(search.trim().toLowerCase())

	const activeOptions = paramType === 'protocol' ? protocolOptions : chainOptions
	const labels = PARAM_LABELS[paramType]

	const filtered = useMemo(() => {
		const source = deferredSearch
			? activeOptions.filter((o) => o.label.toLowerCase().includes(deferredSearch))
			: activeOptions
		return source.slice(0, 200)
	}, [activeOptions, deferredSearch])

	return (
		<Ariakit.PopoverProvider store={popoverStore}>
			<Ariakit.PopoverDisclosure
				className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) ${
					value
						? 'border-(--divider) text-(--text-secondary)'
						: 'border-(--primary)/40 text-(--primary)'
				}`}
			>
				<Icon name="chevron-down" className="h-3.5 w-3.5" />
				{value ? (
					<span className="capitalize">
						{labels.singular}: <span className="text-(--text-primary) normal-case">{value.label}</span>
					</span>
				) : (
					<span>{labels.verb}</span>
				)}
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				gutter={6}
				portal
				unmountOnHide
				className="z-[60] flex max-h-96 w-80 flex-col overflow-hidden rounded-lg border border-(--divider) bg-(--cards-bg) shadow-xl"
			>
				<div className="flex items-center justify-center border-b border-(--divider) px-3 py-2">
					<ParamTypeToggle paramType={paramType} onChange={onChangeParamType} size="sm" />
				</div>
				<div className="border-b border-(--divider) px-3 py-2">
					<input
						value={search}
						onChange={(e) => setSearch(e.currentTarget.value)}
						placeholder={labels.search}
						className="w-full rounded-md border border-(--divider) bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-(--text-tertiary) focus:border-(--primary)"
						autoFocus
					/>
				</div>
				<div className="thin-scrollbar flex-1 overflow-auto py-1">
					{filtered.length === 0 ? (
						<p className="px-3 py-2 text-xs text-(--text-tertiary)">No results</p>
					) : (
						filtered.map((opt) => {
							const isSelected = value?.value === opt.value
							return (
								<button
									key={opt.value}
									type="button"
									onClick={() => {
										onChange(opt)
										setSearch('')
										popoverStore.hide()
									}}
									className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--link-hover-bg) ${
										isSelected ? 'text-(--text-primary)' : 'text-(--text-secondary)'
									}`}
								>
									<span
										className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
											isSelected ? 'bg-(--primary)' : 'bg-(--text-tertiary)/30'
										}`}
									/>
									<span className="truncate">{opt.label}</span>
								</button>
							)
						})
					)}
					{filtered.length >= 200 ? (
						<p className="px-3 py-2 text-[11px] text-(--text-tertiary)">
							Showing first 200 — refine the search to narrow results
						</p>
					) : null}
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}

function MetricMultiPickerPopover({
	metrics,
	selected,
	onToggle,
	onClearAll,
	onSelectAll,
	maxSelections
}: {
	metrics: ChartDatasetDefinition[]
	selected: string[]
	onToggle: (slug: string) => void
	onClearAll: () => void
	onSelectAll: () => void
	maxSelections: number
}) {
	const [search, setSearch] = useState('')
	const deferred = useDeferredValue(search.trim().toLowerCase())
	const selectedSet = useMemo(() => new Set(selected), [selected])
	const capHit = selected.length >= maxSelections

	const grouped = useMemo(() => {
		const filtered = deferred
			? metrics.filter((m) => m.name.toLowerCase().includes(deferred) || m.category.toLowerCase().includes(deferred))
			: metrics
		const groups = new Map<string, ChartDatasetDefinition[]>()
		for (const m of filtered) {
			const arr = groups.get(m.category) ?? []
			arr.push(m)
			groups.set(m.category, arr)
		}
		return [...groups.entries()]
	}, [metrics, deferred])

	const triggerLabel = (() => {
		if (selected.length === 0) return 'Pick metrics'
		if (selected.length === metrics.length) return `All ${metrics.length} metrics`
		return `${selected.length} of ${metrics.length} metrics`
	})()

	const allSelected = selected.length === metrics.length && metrics.length > 0

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure className="flex items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)">
				<Icon name="chevron-down" className="h-3.5 w-3.5" />
				<span>{triggerLabel}</span>
				{selected.length > 0 ? (
					<span className="rounded bg-(--primary) px-1 text-[10px] font-semibold text-white">
						{selected.length}
					</span>
				) : null}
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				gutter={6}
				portal
				unmountOnHide
				className="z-[60] flex max-h-[28rem] w-80 flex-col overflow-hidden rounded-lg border border-(--divider) bg-(--cards-bg) shadow-xl"
			>
				<div className="flex items-center justify-between gap-2 border-b border-(--divider) px-3 py-2">
					<span className="text-xs font-medium text-(--text-secondary)">
						{selected.length}/{maxSelections} selected
					</span>
					<button
						type="button"
						onClick={allSelected ? onClearAll : onSelectAll}
						className="text-xs text-(--primary) hover:underline"
					>
						{allSelected ? 'Clear all' : 'Select all'}
					</button>
				</div>
				<div className="border-b border-(--divider) px-3 py-2">
					<input
						value={search}
						onChange={(e) => setSearch(e.currentTarget.value)}
						placeholder="Search metrics..."
						className="w-full rounded-md border border-(--divider) bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-(--text-tertiary) focus:border-(--primary)"
						autoFocus
					/>
				</div>
				<div className="thin-scrollbar flex-1 overflow-auto">
					{grouped.length === 0 ? (
						<p className="px-3 py-3 text-xs text-(--text-tertiary)">No matches</p>
					) : (
						grouped.map(([category, items]) => (
							<div key={category} className="py-1">
								<p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-[0.06em] text-(--text-tertiary) uppercase">
									{category}
								</p>
								{items.map((metric) => {
									const isSelected = selectedSet.has(metric.slug)
									const disabled = !isSelected && capHit
									return (
										<button
											key={metric.slug}
											type="button"
											disabled={disabled}
											onClick={() => onToggle(metric.slug)}
											title={disabled ? `Max ${maxSelections} metrics` : metric.description}
											className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40 ${
												isSelected ? 'text-(--text-primary)' : 'text-(--text-secondary)'
											}`}
										>
											<span
												className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
													isSelected ? 'border-(--primary) bg-(--primary) text-white' : 'border-(--divider)'
												}`}
											>
												{isSelected ? <Icon name="check" className="h-2.5 w-2.5" /> : null}
											</span>
											<span className="truncate">{metricDisplayName(metric)}</span>
										</button>
									)
								})}
							</div>
						))
					)}
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
