import * as Ariakit from '@ariakit/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { SortIcon } from '~/components/Table/SortIcon'
import { downloadCSV } from '~/utils/download'
import type { ChartDatasetDefinition } from './chart-datasets'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const ROW_HEIGHT = 36
const COLUMN_DETECTION_SAMPLE_SIZE = 200
const COLUMN_WIDTH_SAMPLE_SIZE = 40
const EMPTY_SELECTION = new Set<number>()
const DATE_HEADER_PATTERN = /(date|time|timestamp|day)/i
const PERCENT_HEADER_PATTERN = /(apy|pct|percent|change|rate|fee)/i
const CURRENCY_HEADER_PATTERN =
	/(usd|tvl|mcap|market.?cap|price|amount|volume|fees?|revenue|supply|borrow|depositusd|withdrawusd|value|flow)/i

const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const decimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const preciseDecimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })
const compactNumberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 })
const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 2
})
const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	notation: 'compact',
	maximumFractionDigits: 2
})
const preciseCurrencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 6
})
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

type PreviewRow = { id: number; values: string[] }
type ColumnKind = 'text' | 'number' | 'currency' | 'percent' | 'date'
type SortDirection = 'asc' | 'desc'

interface ColumnMeta {
	index: number
	header: string
	kind: ColumnKind
	align: 'start' | 'end'
	width: number
}

interface SortState {
	index: number
	direction: SortDirection
}

function parseCsvLine(line: string): string[] {
	const fields: string[] = []
	let i = 0
	while (i < line.length) {
		if (line[i] === '"') {
			i++
			let field = ''
			while (i < line.length) {
				if (line[i] === '"' && line[i + 1] === '"') {
					field += '"'
					i += 2
				} else if (line[i] === '"') {
					i++
					break
				} else {
					field += line[i]
					i++
				}
			}
			fields.push(field)
			if (i < line.length && line[i] === ',') i++
		} else {
			let field = ''
			while (i < line.length && line[i] !== ',') {
				field += line[i]
				i++
			}
			fields.push(field)
			if (i < line.length && line[i] === ',') i++
			else break
		}
	}
	return fields
}

function parseCsv(text: string): { headers: string[]; rows: PreviewRow[] } {
	const lines = text.split(/\r?\n/).filter((line) => line.trim())
	if (lines.length === 0) return { headers: [], rows: [] }
	const headers = parseCsvLine(lines[0])
	const rows = lines.slice(1).map((line, id) => ({ id, values: parseCsvLine(line) }))
	return { headers, rows }
}

function parseNumericValue(value: string): number | null {
	const trimmed = value.trim()
	if (!trimmed) return null
	const normalized = trimmed.replace(/[$,%\s]/g, '').replace(/,/g, '')
	if (!normalized) return null
	const parsed = Number(normalized)
	return Number.isFinite(parsed) ? parsed : null
}

function parseDateValue(value: string, header: string): number | null {
	const trimmed = value.trim()
	if (!trimmed) return null
	if (!DATE_HEADER_PATTERN.test(header) && !/[-/:TZ]/i.test(trimmed)) return null
	const parsed = Date.parse(trimmed)
	return Number.isNaN(parsed) ? null : parsed
}

function detectColumnKind(header: string, values: string[]): ColumnKind {
	const sample = values.filter((v) => v.trim()).slice(0, COLUMN_DETECTION_SAMPLE_SIZE)
	if (sample.length === 0) return 'text'
	const numericMatches = sample.filter((v) => parseNumericValue(v) !== null).length
	const dateMatches = sample.filter((v) => parseDateValue(v, header) !== null).length
	const numericRatio = numericMatches / sample.length
	const dateRatio = dateMatches / sample.length
	if ((DATE_HEADER_PATTERN.test(header) && dateRatio >= 0.5) || dateRatio >= 0.9) return 'date'
	if (numericRatio >= 0.85) {
		if (PERCENT_HEADER_PATTERN.test(header)) return 'percent'
		if (CURRENCY_HEADER_PATTERN.test(header)) return 'currency'
		return 'number'
	}
	return 'text'
}

function getColumnWidth(header: string, kind: ColumnKind, values: string[], isFirst: boolean): number {
	const sampleMaxLength = values
		.slice(0, COLUMN_WIDTH_SAMPLE_SIZE)
		.reduce((max, v) => Math.max(max, v.length), header.length)
	if (kind === 'date') return isFirst ? 200 : 160
	if (kind === 'currency' || kind === 'number' || kind === 'percent') return isFirst ? 200 : 140
	const estimated = Math.max(140, Math.min(300, sampleMaxLength * 8 + 24))
	return isFirst ? Math.max(200, estimated) : estimated
}

function formatNumber(value: number): string {
	const abs = Math.abs(value)
	if (abs >= 1000000) return compactNumberFormatter.format(value)
	if (Number.isInteger(value)) return integerFormatter.format(value)
	if (abs >= 1) return decimalFormatter.format(value)
	return preciseDecimalFormatter.format(value)
}

function formatCurrency(value: number): string {
	const abs = Math.abs(value)
	if (abs >= 10000) return compactCurrencyFormatter.format(value)
	if (abs >= 1) return currencyFormatter.format(value)
	return preciseCurrencyFormatter.format(value)
}

function formatCellValue(value: string, column: ColumnMeta): string {
	if (!value) return ''
	if (column.kind === 'currency') {
		const n = parseNumericValue(value)
		return n === null ? value : formatCurrency(n)
	}
	if (column.kind === 'number') {
		const n = parseNumericValue(value)
		return n === null ? value : formatNumber(n)
	}
	if (column.kind === 'percent') {
		const n = parseNumericValue(value)
		return n === null ? value : `${formatNumber(n)}%`
	}
	if (column.kind === 'date') {
		const d = parseDateValue(value, column.header)
		return d === null ? value : dateFormatter.format(d)
	}
	return value
}

function getCellTone(value: string, column: ColumnMeta): string {
	if (column.kind !== 'percent') return ''
	const n = parseNumericValue(value)
	if (n === null) return ''
	if (n > 0) return 'text-green-500'
	if (n < 0) return 'text-red-500'
	return ''
}

function getInitialSortDirection(kind: ColumnKind): SortDirection {
	return kind === 'text' ? 'asc' : 'desc'
}

function buildSelectedCsvRows(columns: ColumnMeta[], selected: Set<number>, rows: PreviewRow[]): string[][] {
	const active = columns.filter((c) => selected.has(c.index))
	if (active.length === 0) return []
	return [active.map((c) => c.header), ...rows.map((row) => active.map((c) => row.values[c.index] ?? ''))]
}

function buildTsvString(columns: ColumnMeta[], selected: Set<number>, rows: PreviewRow[]): string {
	const active = columns.filter((c) => selected.has(c.index))
	if (active.length === 0) return ''
	const header = active.map((c) => c.header).join('\t')
	const body = rows.map((row) => active.map((c) => row.values[c.index] ?? '').join('\t')).join('\n')
	return `${header}\n${body}`
}

interface Props {
	dataset: ChartDatasetDefinition
	options: Array<{ label: string; value: string }>
	authorizedFetch: (url: string, options?: any) => Promise<Response | null>
	onClose: () => void
	isTrial?: boolean
	isPreview?: boolean
}

export function ChartDatasetModal({ dataset, options, authorizedFetch, onClose, isTrial, isPreview }: Props) {
	const queryClient = useQueryClient()
	const subscribeModalStore = Ariakit.useDialogStore()
	const [selectedParam, setSelectedParam] = useState<{ label: string; value: string } | null>(null)
	const [selectedColumns, setSelectedColumns] = useState<Set<number> | null>(null)
	const [search, setSearch] = useState('')
	const [sortState, setSortState] = useState<SortState | null>(null)
	const tableContainerRef = useRef<HTMLDivElement>(null)
	const rightShadowRef = useRef<HTMLDivElement>(null)
	const deferredSearch = useDeferredValue(search.trim().toLowerCase())

	const {
		data: csvText,
		isLoading: dataLoading,
		error: dataError
	} = useQuery({
		queryKey: ['chart-preview', dataset.slug, selectedParam?.value, isPreview],
		queryFn: async () => {
			const url = `/api/downloads/chart/${dataset.slug}?param=${encodeURIComponent(selectedParam!.value)}`
			const response = isPreview ? await fetch(url) : await authorizedFetch(url)
			if (!response || !response.ok) {
				const errorData = await response?.json().catch(() => null)
				throw new Error(errorData?.error ?? `Download failed (${response?.status})`)
			}
			if (isTrial) {
				void queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
			}
			return response.text()
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !!selectedParam
	})

	const { headers, rows } = useMemo(() => {
		if (!csvText) return { headers: [] as string[], rows: [] as PreviewRow[] }
		return parseCsv(csvText)
	}, [csvText])

	useEffect(() => {
		setSelectedColumns(null)
		setSearch('')
		setSortState(null)
	}, [selectedParam])

	useEffect(() => {
		if (headers.length > 0 && selectedColumns === null) {
			setSelectedColumns(new Set(headers.map((_, i) => i)))
			if (sortState === null) {
				const dateIndex = headers.indexOf('date')
				if (dateIndex !== -1) {
					setSortState({ index: dateIndex, direction: 'desc' })
				}
			}
		}
	}, [headers, selectedColumns, sortState])

	const cols = selectedColumns ?? EMPTY_SELECTION

	const columnMeta = useMemo(() => {
		return headers.map<ColumnMeta>((header, index) => {
			const values = rows.map((row) => row.values[index] ?? '')
			const kind = detectColumnKind(header, values)
			return {
				index,
				header,
				kind,
				align: kind === 'text' || kind === 'date' ? 'start' : 'end',
				width: getColumnWidth(header, kind, values, index === 0)
			}
		})
	}, [headers, rows])

	const selectedCount = useMemo(() => columnMeta.filter((c) => cols.has(c.index)).length, [columnMeta, cols])

	const filteredRows = useMemo(() => {
		if (deferredSearch.length === 0) return rows
		return rows.filter((row) =>
			columnMeta.some((column) => (row.values[column.index] ?? '').toLowerCase().includes(deferredSearch))
		)
	}, [columnMeta, deferredSearch, rows])

	const sortedRows = useMemo(() => {
		if (!sortState) return filteredRows
		const activeColumn = columnMeta.find((c) => c.index === sortState.index)
		if (!activeColumn) return filteredRows
		const dir = sortState.direction === 'asc' ? 1 : -1

		return [...filteredRows].sort((a, b) => {
			const av = a.values[activeColumn.index] ?? ''
			const bv = b.values[activeColumn.index] ?? ''
			const aBlank = !av.trim()
			const bBlank = !bv.trim()
			if (aBlank && bBlank) return a.id - b.id
			if (aBlank) return 1
			if (bBlank) return -1

			if (activeColumn.kind === 'date') {
				const ad = parseDateValue(av, activeColumn.header)
				const bd = parseDateValue(bv, activeColumn.header)
				if (ad === null && bd === null) return a.id - b.id
				if (ad === null) return 1
				if (bd === null) return -1
				const cmp = ad - bd
				return cmp === 0 ? a.id - b.id : cmp * dir
			}

			if (activeColumn.kind === 'number' || activeColumn.kind === 'currency' || activeColumn.kind === 'percent') {
				const an = parseNumericValue(av)
				const bn = parseNumericValue(bv)
				if (an === null && bn === null) return a.id - b.id
				if (an === null) return 1
				if (bn === null) return -1
				const cmp = an - bn
				return cmp === 0 ? a.id - b.id : cmp * dir
			}

			const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
			return cmp === 0 ? a.id - b.id : cmp * dir
		})
	}, [columnMeta, filteredRows, sortState])

	const tableWidth = useMemo(() => columnMeta.reduce((t, c) => t + c.width, 0), [columnMeta])
	const gridTemplate = useMemo(() => columnMeta.map((c) => `minmax(${c.width}px, 1fr)`).join(' '), [columnMeta])

	const hasData = !dataLoading && !dataError && headers.length > 0 && !!selectedParam

	const updateScrollShadows = useCallback(() => {
		const el = tableContainerRef.current
		if (!el) return
		const scrolled = el.scrollLeft > 1
		const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
		el.style.setProperty('--sticky-shadow', scrolled ? '4px 0 8px -2px rgba(0,0,0,0.25)' : 'none')
		if (rightShadowRef.current) {
			rightShadowRef.current.style.opacity = canScrollRight ? '1' : '0'
		}
	}, [])

	useEffect(() => {
		const el = tableContainerRef.current
		if (!el || !hasData) return
		updateScrollShadows()
		el.addEventListener('scroll', updateScrollShadows, { passive: true })
		const ro = new ResizeObserver(updateScrollShadows)
		ro.observe(el)
		return () => {
			el.removeEventListener('scroll', updateScrollShadows)
			ro.disconnect()
		}
	}, [updateScrollShadows, hasData])

	const rowVirtualizer = useVirtualizer({
		count: sortedRows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 10
	})

	const toggleColumn = useCallback((index: number) => {
		setSelectedColumns((prev) => {
			const next = new Set(prev ?? [])
			if (next.has(index)) next.delete(index)
			else next.add(index)
			return next
		})
	}, [])

	const toggleAll = useCallback(() => {
		const allSelected = cols.size === headers.length
		if (allSelected) {
			setSelectedColumns(new Set())
			setSortState(null)
		} else {
			setSelectedColumns(new Set(headers.map((_, i) => i)))
		}
	}, [cols.size, headers])

	const handleSort = useCallback((column: ColumnMeta) => {
		setSortState((prev) => {
			if (!prev || prev.index !== column.index) {
				return { index: column.index, direction: getInitialSortDirection(column.kind) }
			}
			return { index: column.index, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
		})
	}, [])

	const handleDownload = useCallback(() => {
		if (selectedCount === 0) {
			toast.error('Select at least one column')
			return
		}
		const csvRows = buildSelectedCsvRows(columnMeta, cols, sortedRows)
		if (csvRows.length <= 1) {
			toast.error('No rows to download')
			return
		}
		const filename = selectedParam ? `${dataset.slug}_${selectedParam.value}.csv` : `${dataset.slug}.csv`
		downloadCSV(filename, csvRows, { addTimestamp: false })
		toast.success(`Downloaded ${filename}`)
	}, [dataset.slug, columnMeta, cols, sortedRows, selectedCount, selectedParam])

	const handleCopy = useCallback(async () => {
		if (selectedCount === 0) {
			toast.error('Select at least one column')
			return
		}
		const tsv = buildTsvString(columnMeta, cols, sortedRows)
		if (!tsv) {
			toast.error('No data to copy')
			return
		}
		try {
			await navigator.clipboard.writeText(tsv)
			toast.success('Copied to clipboard (paste into spreadsheets)')
		} catch {
			toast.error('Failed to copy')
		}
	}, [columnMeta, cols, sortedRows, selectedCount])

	const activeSortDirection = sortState ? sortState.direction : false
	const allSelected = headers.length > 0 && cols.size === headers.length

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
				>
					<div className="flex shrink-0 flex-col border-b border-(--divider)">
						<div className="flex items-center gap-3 px-4 py-2.5">
							<div className="mr-auto min-w-0">
								<h2 className="truncate text-base font-semibold">{dataset.name}</h2>
								<p className="text-xs text-(--text-tertiary)">
									{!selectedParam
										? `Select a ${dataset.paramLabel.toLowerCase()} to preview`
										: dataLoading
											? 'Loading...'
											: dataError
												? 'Error'
												: `${sortedRows.length.toLocaleString()} rows · ${selectedCount}/${headers.length} cols selected`}
								</p>
							</div>

							{hasData ? (
								<>
									<button
										type="button"
										onClick={() => (isPreview ? subscribeModalStore.show() : void handleCopy())}
										disabled={!isPreview && selectedCount === 0}
										className="hidden items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:opacity-40 sm:flex"
										title="Copy selected columns as TSV"
									>
										<Icon name="clipboard" className="h-3.5 w-3.5" />
										<span className="hidden lg:inline">Copy</span>
									</button>

									<button
										type="button"
										onClick={() => (isPreview ? subscribeModalStore.show() : handleDownload())}
										disabled={!isPreview && selectedCount === 0}
										className="flex items-center gap-1.5 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
									>
										<Icon name="download-cloud" className="h-3.5 w-3.5" />
										<span className="hidden sm:inline">Download</span>
									</button>
								</>
							) : null}

							<button
								type="button"
								onClick={onClose}
								className="rounded-md p-1.5 text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
							>
								<Icon name="x" className="h-4 w-4" />
							</button>
						</div>

						<div className="flex flex-wrap items-center gap-2 border-t border-(--divider) px-4 py-2">
							<OptionPickerPopover
								label={dataset.paramLabel}
								options={options}
								selected={selectedParam}
								onSelect={(opt) => {
									setSelectedParam(opt)
									setSelectedColumns(null)
									setSortState(null)
									setSearch('')
								}}
							/>

							{hasData && !isPreview ? (
								<>
									<label className="relative min-w-0 flex-1">
										<Icon
											name="search"
											height={14}
											width={14}
											className="absolute top-0 bottom-0 left-2.5 my-auto text-(--text-tertiary)"
										/>
										<input
											value={search}
											onChange={(e) => setSearch(e.currentTarget.value)}
											placeholder="Filter rows..."
											className="w-full min-w-32 rounded-md border border-(--divider) bg-transparent py-1.5 pr-2.5 pl-8 text-xs transition-colors outline-none placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary)/30 sm:w-48"
										/>
									</label>

									<ColumnPickerPopover
										columns={columnMeta}
										selected={cols}
										allSelected={allSelected}
										onToggle={toggleColumn}
										onToggleAll={toggleAll}
									/>

									<button
										type="button"
										onClick={() => void handleCopy()}
										disabled={selectedCount === 0}
										className="flex items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:opacity-40 sm:hidden"
										title="Copy selected columns as TSV"
									>
										<Icon name="clipboard" className="h-3.5 w-3.5" />
									</button>
								</>
							) : hasData && isPreview ? (
								<p className="text-xs text-(--text-tertiary)">Preview — showing first {sortedRows.length} rows</p>
							) : null}
						</div>
					</div>

					{!selectedParam ? (
						<div className="flex flex-1 items-center justify-center">
							<div className="flex flex-col items-center gap-2 text-center">
								<Icon name="search" className="h-6 w-6 text-(--text-tertiary)" />
								<p className="text-sm text-(--text-secondary)">
									Select a {dataset.paramLabel.toLowerCase()} above to load chart data
								</p>
							</div>
						</div>
					) : dataLoading ? (
						<div className="flex flex-1 items-center justify-center">
							<div className="flex flex-col items-center gap-3">
								<LoadingSpinner size={28} />
								<p className="text-sm text-(--text-secondary)">Fetching chart data...</p>
							</div>
						</div>
					) : dataError ? (
						<div className="flex flex-1 items-center justify-center">
							<div className="flex flex-col items-center gap-2">
								<Icon name="alert-triangle" className="h-6 w-6 text-red-500" />
								<p className="text-sm text-red-500">
									{dataError instanceof Error ? dataError.message : 'Failed to fetch data'}
								</p>
							</div>
						</div>
					) : columnMeta.length === 0 ? (
						<div className="flex flex-1 items-center justify-center">
							<div className="flex flex-col items-center gap-2 text-center">
								<Icon name="eye-off" className="h-6 w-6 text-(--text-tertiary)" />
								<p className="text-sm text-(--text-secondary)">No data</p>
							</div>
						</div>
					) : sortedRows.length === 0 ? (
						<div className="flex flex-1 items-center justify-center">
							<div className="flex flex-col items-center gap-2 text-center">
								<Icon name="search" className="h-6 w-6 text-(--text-tertiary)" />
								<p className="text-sm text-(--text-secondary)">No matching rows</p>
							</div>
						</div>
					) : (
						<div className="relative min-h-0 flex-1">
							<div
								ref={rightShadowRef}
								className="pointer-events-none absolute inset-y-0 right-0 z-40 w-32 opacity-0 transition-opacity duration-200"
								style={{ background: 'linear-gradient(to left, var(--cards-bg) 0%, transparent 100%)' }}
							/>
							<div
								ref={tableContainerRef}
								className={`thin-scrollbar h-full ${isPreview ? 'overflow-x-auto overflow-y-hidden' : 'overflow-auto'}`}
							>
								<div className="sticky top-0 z-20 bg-(--cards-bg)" style={{ minWidth: `${tableWidth}px` }}>
									<div style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
										{columnMeta.map((column, position) => {
											const isSelected = cols.has(column.index)
											const isSorted = sortState?.index === column.index ? activeSortDirection : false
											const isSticky = position === 0
											return (
												<div
													key={column.index}
													className="border-t border-r border-(--divider) bg-(--cards-bg) last:border-r-0"
													style={{
														position: isSticky ? 'sticky' : undefined,
														left: isSticky ? 0 : undefined,
														zIndex: isSticky ? 30 : undefined,
														background: 'var(--cards-bg)',
														boxShadow: isSticky ? 'var(--sticky-shadow, none)' : undefined
													}}
												>
													<div className="flex items-center gap-0.5 p-2">
														<input
															type="checkbox"
															checked={isSelected}
															onChange={() => toggleColumn(column.index)}
															className="mr-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-(--primary)"
														/>
														<button
															type="button"
															onClick={() => handleSort(column)}
															className="flex min-w-0 flex-1 items-center gap-1"
														>
															<span
																className={`truncate text-xs font-medium ${isSelected ? 'text-(--text-secondary)' : 'text-(--text-tertiary)'}`}
															>
																{column.header}
															</span>
															<SortIcon dir={isSorted} />
														</button>
													</div>
												</div>
											)
										})}
									</div>
								</div>

								<div
									style={{
										height: `${rowVirtualizer.getTotalSize()}px`,
										minWidth: `${tableWidth}px`,
										position: 'relative'
									}}
								>
									{rowVirtualizer.getVirtualItems().map((virtualRow) => {
										const row = sortedRows[virtualRow.index]
										const isOdd = virtualRow.index % 2 === 1
										return (
											<div
												key={row.id}
												style={{
													display: 'grid',
													gridTemplateColumns: gridTemplate,
													minWidth: `${tableWidth}px`,
													position: 'absolute',
													top: 0,
													left: 0,
													width: '100%',
													height: `${virtualRow.size}px`,
													transform: `translateY(${virtualRow.start}px)`
												}}
											>
												{columnMeta.map((column, position) => {
													const rawValue = row.values[column.index] ?? ''
													const displayValue = formatCellValue(rawValue, column)
													const isSticky = position === 0
													const isSelected = cols.has(column.index)
													const tone = isSelected ? getCellTone(rawValue, column) : ''
													return (
														<div
															key={column.index}
															title={rawValue || undefined}
															className={`overflow-hidden border-t border-r border-(--divider) p-2 text-sm text-ellipsis whitespace-nowrap last:border-r-0 ${tone} ${!isSelected ? 'text-(--text-tertiary) opacity-40' : ''}`}
															style={{
																textAlign: column.align,
																position: isSticky ? 'sticky' : undefined,
																left: isSticky ? 0 : undefined,
																zIndex: isSticky ? 1 : undefined,
																background: isSticky ? 'var(--cards-bg)' : isOdd ? 'var(--bg-primary)' : undefined,
																boxShadow: isSticky ? 'var(--sticky-shadow, none)' : undefined
															}}
														>
															{displayValue}
														</div>
													)
												})}
											</div>
										)
									})}
								</div>
								{isPreview ? (
									<PlaceholderRows columnMeta={columnMeta} gridTemplate={gridTemplate} tableWidth={tableWidth} />
								) : null}
							</div>
							{isPreview ? (
								<>
									<div
										className="pointer-events-none absolute inset-x-0 bottom-0 z-40"
										style={{
											top: '20%',
											backdropFilter: 'blur(4px)',
											WebkitBackdropFilter: 'blur(4px)',
											maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%)',
											WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%)'
										}}
									/>
									<div className="absolute inset-x-0 bottom-0 z-50 border-t border-(--divider) bg-(--cards-bg) px-6 py-5">
										<div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
											<p className="text-sm font-semibold text-(--text-primary)">
												This is a preview — subscribe to download full datasets
											</p>
											<p className="text-xs text-(--text-tertiary)">
												Get access to all rows, all columns, and unlimited CSV downloads
											</p>
											<Link
												href="/subscribe"
												className="mt-1 inline-flex items-center gap-2 rounded-lg bg-(--primary) px-8 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
											>
												<Icon name="arrow-up-right" className="h-4 w-4" />
												Subscribe
											</Link>
										</div>
									</div>
								</>
							) : null}
						</div>
					)}
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

const PLACEHOLDER_WIDTHS = [30, 22, 38, 25, 32, 20, 35, 28, 40, 24, 31, 21, 36, 29, 34]

function PlaceholderRows({
	columnMeta,
	gridTemplate,
	tableWidth
}: {
	columnMeta: ColumnMeta[]
	gridTemplate: string
	tableWidth: number
}) {
	const placeholderCount = 20
	return (
		<div style={{ minWidth: `${tableWidth}px` }}>
			{Array.from({ length: placeholderCount }, (_, rowIdx) => (
				<div
					key={`placeholder-${rowIdx}`}
					style={{ display: 'grid', gridTemplateColumns: gridTemplate, height: `${ROW_HEIGHT}px` }}
				>
					{columnMeta.map((column, colIdx) => (
						<div
							key={column.index}
							className="flex items-center border-t border-r border-(--divider) p-2 last:border-r-0"
							style={{ justifyContent: column.align === 'end' ? 'flex-end' : 'flex-start' }}
						>
							<div
								className="rounded bg-(--text-tertiary)/30"
								style={{
									height: 12,
									width: `${PLACEHOLDER_WIDTHS[(rowIdx * columnMeta.length + colIdx) % PLACEHOLDER_WIDTHS.length]}%`
								}}
							/>
						</div>
					))}
				</div>
			))}
		</div>
	)
}

function OptionPickerPopover({
	label,
	options,
	selected,
	onSelect
}: {
	label: string
	options: Array<{ label: string; value: string }>
	selected: { label: string; value: string } | null
	onSelect: (option: { label: string; value: string } | null) => void
}) {
	const popoverStore = Ariakit.usePopoverStore()
	const [optionSearch, setOptionSearch] = useState('')
	const deferredOptionSearch = useDeferredValue(optionSearch.trim().toLowerCase())

	const filtered = useMemo(() => {
		if (!deferredOptionSearch) return options
		return options.filter((o) => o.label.toLowerCase().includes(deferredOptionSearch))
	}, [options, deferredOptionSearch])

	return (
		<Ariakit.PopoverProvider store={popoverStore}>
			<Ariakit.PopoverDisclosure className="flex items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)">
				<Icon name="chevron-down" className="h-3.5 w-3.5" />
				{selected ? selected.label : `Select ${label}`}
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				gutter={6}
				portal
				unmountOnHide
				className="z-[60] flex max-h-80 w-80 flex-col overflow-hidden rounded-lg border border-(--divider) bg-(--cards-bg) shadow-xl"
			>
				<div className="border-b border-(--divider) px-3 py-2">
					<input
						value={optionSearch}
						onChange={(e) => setOptionSearch(e.currentTarget.value)}
						placeholder={`Search ${label.toLowerCase()}...`}
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
									popoverStore.hide()
									setOptionSearch('')
								}}
								className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--link-hover-bg) ${selected?.value === opt.value ? 'font-medium text-(--primary)' : 'text-(--text-secondary)'}`}
							>
								{opt.label}
							</button>
						))
					)}
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}

function ColumnPickerPopover({
	columns,
	selected,
	allSelected,
	onToggle,
	onToggleAll
}: {
	columns: ColumnMeta[]
	selected: Set<number>
	allSelected: boolean
	onToggle: (index: number) => void
	onToggleAll: () => void
}) {
	const popoverStore = Ariakit.usePopoverStore()

	return (
		<Ariakit.PopoverProvider store={popoverStore}>
			<Ariakit.PopoverDisclosure className="flex items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)">
				<Icon name="eye" className="h-3.5 w-3.5" />
				Columns
				<span className="text-(--text-tertiary)">
					{selected.size}/{columns.length}
				</span>
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				gutter={6}
				portal
				unmountOnHide
				className="z-[60] flex max-h-80 w-64 flex-col overflow-hidden rounded-lg border border-(--divider) bg-(--cards-bg) shadow-xl"
			>
				<div className="flex items-center justify-between border-b border-(--divider) px-3 py-2">
					<span className="text-xs font-medium text-(--text-secondary)">Toggle columns</span>
					<button type="button" onClick={onToggleAll} className="text-xs text-(--primary) hover:underline">
						{allSelected ? 'Deselect all' : 'Select all'}
					</button>
				</div>
				<div className="thin-scrollbar flex-1 overflow-auto py-1">
					{columns.map((column) => {
						const isSelected = selected.has(column.index)
						return (
							<button
								key={column.index}
								type="button"
								onClick={() => onToggle(column.index)}
								className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--link-hover-bg)"
							>
								<span
									className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
										isSelected ? 'border-(--primary) bg-(--primary) text-white' : 'border-(--divider)'
									}`}
								>
									{isSelected ? <Icon name="check" className="h-2.5 w-2.5" /> : null}
								</span>
								<span className={isSelected ? 'text-(--text-primary)' : 'text-(--text-tertiary)'}>{column.header}</span>
							</button>
						)
					})}
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
