import * as Ariakit from '@ariakit/react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { SortIcon } from '~/components/Table/SortIcon'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { useRecentDownloads, useSavedDownloads } from '~/contexts/LocalStorage'
import { downloadCSV } from '~/utils/download'
import type { ChartDatasetDefinition } from './chart-datasets'
import { combineCsvsWide } from './combineCsvsWide'
import { filterParsedRowsByDateRange } from './csvDateFilter'
import { parseCsv, type ParsedCsvRow } from './csvParse'
import { DateRangePicker } from './DateRangePicker'
import {
	applyChartColumnsAndSort,
	applyChartParams,
	type ChartSavedConfig,
	type DateRangeConfig,
	defaultPresetName,
	extractChartConfig,
	generatePresetId
} from './savedDownloads'
import { SavePresetDialog } from './SavePresetDialog'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const ROW_HEIGHT = 36
const COLUMN_DETECTION_SAMPLE_SIZE = 200
const COLUMN_WIDTH_SAMPLE_SIZE = 40
const EMPTY_SELECTION = new Set<number>()
const MAX_PARAMS = 25
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

type PreviewRow = ParsedCsvRow
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

interface ParamOption {
	label: string
	value: string
	category?: string
	isChild?: boolean
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
	options: Array<ParamOption>
	authorizedFetch: (url: string, options?: any) => Promise<Response | null>
	onClose: () => void
	isTrial?: boolean
	isPreview?: boolean
	initialConfig?: ChartSavedConfig
}

export function ChartDatasetModal({
	dataset,
	options,
	authorizedFetch,
	onClose,
	isTrial,
	isPreview,
	initialConfig
}: Props) {
	const queryClient = useQueryClient()
	const subscribeModalStore = Ariakit.useDialogStore()
	const { savedDownloads, saveDownload } = useSavedDownloads()
	const { recordRecent } = useRecentDownloads()
	const [selectedParams, setSelectedParams] = useState<Array<ParamOption>>([])
	const [activePreviewValue, setActivePreviewValue] = useState<string | null>(null)
	const [selectedColumns, setSelectedColumns] = useState<Set<number> | null>(null)
	const [search, setSearch] = useState('')
	const [sortState, setSortState] = useState<SortState | null>(null)
	const [dateRange, setDateRange] = useState<DateRangeConfig | null>(initialConfig?.dateRange ?? null)
	const [showSaveDialog, setShowSaveDialog] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
	const initialParamsAppliedRef = useRef(false)
	const initialColumnsAppliedRef = useRef(false)
	const tableContainerRef = useRef<HTMLDivElement>(null)
	const rightShadowRef = useRef<HTMLDivElement>(null)
	const deferredSearch = useDeferredValue(search.trim().toLowerCase())

	useEffect(() => {
		setDateRange(initialConfig?.dateRange ?? null)
		initialParamsAppliedRef.current = false
		initialColumnsAppliedRef.current = false
	}, [initialConfig?.id, initialConfig?.dateRange])

	// Apply saved params once options are loaded.
	useEffect(() => {
		if (!initialConfig || initialParamsAppliedRef.current) return
		if (options.length === 0) return
		const { params, missingParams } = applyChartParams(initialConfig, options)
		setSelectedParams(params)
		initialParamsAppliedRef.current = true
		if (missingParams.length > 0) {
			toast(
				`${missingParams.length} saved ${dataset.paramLabel.toLowerCase()}${
					missingParams.length === 1 ? '' : 's'
				} no longer available`
			)
		}
	}, [initialConfig, options, dataset.paramLabel])

	const protocolCategories = useMemo(() => {
		if (dataset.paramType !== 'protocol') return []
		const cats = new Map<string, number>()
		for (const opt of options) {
			if (opt.category) cats.set(opt.category, (cats.get(opt.category) ?? 0) + 1)
		}
		return [...cats.entries()].sort((a, b) => b[1] - a[1])
	}, [options, dataset.paramType])

	const filteredOptions = useMemo(() => {
		if (!selectedCategory) return options
		return options.filter((o) => o.category === selectedCategory)
	}, [options, selectedCategory])

	const selectedParam = useMemo(
		() => selectedParams.find((p) => p.value === activePreviewValue) ?? null,
		[selectedParams, activePreviewValue]
	)

	const csvQueries = useQueries({
		queries: selectedParams.map((param) => ({
			queryKey: ['chart-preview', dataset.slug, param.value, isPreview] as const,
			queryFn: async () => {
				const nonce = isPreview ? `&_n=${Math.random().toString(36).slice(2)}` : ''
				const url = `/api/downloads/chart/${dataset.slug}?param=${encodeURIComponent(param.value)}${nonce}`
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
			retry: 1
		}))
	})

	const activeQueryIndex = useMemo(
		() => selectedParams.findIndex((p) => p.value === activePreviewValue),
		[selectedParams, activePreviewValue]
	)

	const activeQuery = activeQueryIndex >= 0 ? csvQueries[activeQueryIndex] : null
	const csvText = (activeQuery?.data as string | undefined) ?? undefined
	const dataLoading = activeQuery?.isLoading ?? false
	const dataError = activeQuery?.error ?? null

	const { headers, rows } = useMemo(() => {
		if (!csvText) return { headers: [] as string[], rows: [] as PreviewRow[] }
		return parseCsv(csvText)
	}, [csvText])

	useEffect(() => {
		setActivePreviewValue((cur) => {
			if (selectedParams.length === 0) return null
			if (cur && selectedParams.some((p) => p.value === cur)) return cur
			return selectedParams[0].value
		})
	}, [selectedParams])

	useEffect(() => {
		setSelectedColumns(null)
		setSearch('')
		setSortState(null)
	}, [activePreviewValue])

	useEffect(() => {
		if (headers.length === 0 || selectedColumns !== null) return

		if (initialConfig && !initialColumnsAppliedRef.current) {
			const {
				selectedColumns: appliedCols,
				sort,
				missingColumns,
				missingSortColumn
			} = applyChartColumnsAndSort(initialConfig, headers)
			setSelectedColumns(appliedCols ?? new Set(headers.map((_, i) => i)))
			if (sort) {
				setSortState(sort)
			} else if (sortState === null) {
				const dateIndex = headers.indexOf('date')
				if (dateIndex !== -1) {
					setSortState({ index: dateIndex, direction: 'desc' })
				}
			}
			initialColumnsAppliedRef.current = true
			if (missingColumns.length > 0) {
				toast(
					`${missingColumns.length} saved column${
						missingColumns.length === 1 ? '' : 's'
					} no longer available: ${missingColumns.slice(0, 3).join(', ')}${missingColumns.length > 3 ? '…' : ''}`
				)
			}
			if (missingSortColumn) {
				toast(`Saved sort column "${missingSortColumn}" no longer available`)
			}
			return
		}

		setSelectedColumns(new Set(headers.map((_, i) => i)))
		if (sortState === null) {
			const dateIndex = headers.indexOf('date')
			if (dateIndex !== -1) {
				setSortState({ index: dateIndex, direction: 'desc' })
			}
		}
	}, [headers, selectedColumns, sortState, initialConfig])

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

	const dateColIndex = useMemo(() => headers.indexOf('date'), [headers])

	const dateBounds = useMemo(() => {
		if (dateColIndex < 0 || rows.length === 0) return { min: undefined, max: undefined } as const
		let min: string | undefined
		let max: string | undefined
		for (const row of rows) {
			const d = row.values[dateColIndex]
			if (!d) continue
			if (min === undefined || d < min) min = d
			if (max === undefined || d > max) max = d
		}
		return { min, max } as const
	}, [rows, dateColIndex])

	const dateFilteredRows = useMemo(
		() => filterParsedRowsByDateRange(rows, dateColIndex, dateRange),
		[rows, dateColIndex, dateRange]
	)

	const filteredRows = useMemo(() => {
		if (deferredSearch.length === 0) return dateFilteredRows
		return dateFilteredRows.filter((row) =>
			columnMeta.some((column) => (row.values[column.index] ?? '').toLowerCase().includes(deferredSearch))
		)
	}, [columnMeta, deferredSearch, dateFilteredRows])

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
	const hasSelection = selectedParams.length > 0
	const isBulk = selectedParams.length > 1

	const readyCount = useMemo(() => csvQueries.filter((q) => !!q.data).length, [csvQueries])
	const loadingCount = useMemo(() => csvQueries.filter((q) => q.isLoading).length, [csvQueries])

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

	const handleToggleParam = useCallback(
		(opt: ParamOption) => {
			const exists = selectedParams.some((p) => p.value === opt.value)
			if (exists) {
				setSelectedParams((prev) => prev.filter((p) => p.value !== opt.value))
				return
			}
			if (selectedParams.length >= MAX_PARAMS) {
				toast.error(`Max ${MAX_PARAMS} items — remove one first`)
				return
			}
			setSelectedParams((prev) => [...prev, opt])
		},
		[selectedParams]
	)

	const handleRemoveParam = useCallback((value: string) => {
		setSelectedParams((prev) => prev.filter((p) => p.value !== value))
	}, [])

	const handleClearParams = useCallback(() => {
		setSelectedParams([])
	}, [])

	const handleAddMultipleParams = useCallback((opts: ParamOption[]) => {
		setSelectedParams((prev) => {
			const existing = new Set(prev.map((p) => p.value))
			const toAdd = opts.filter((o) => !existing.has(o.value))
			const combined = [...prev, ...toAdd]
			if (combined.length > MAX_PARAMS) {
				toast.error(`Can only add ${MAX_PARAMS - prev.length} more (max ${MAX_PARAMS})`)
				return [...prev, ...toAdd.slice(0, MAX_PARAMS - prev.length)]
			}
			return combined
		})
	}, [])

	const handleSetActive = useCallback((value: string) => {
		setActivePreviewValue(value)
	}, [])

	const handleDownloadCombined = useCallback(() => {
		const ready: Array<{ label: string; value: string; csvText: string }> = []
		const failed: Array<ParamOption> = []
		csvQueries.forEach((query, i) => {
			const p = selectedParams[i]
			if (!p) return
			const data = query.data as unknown
			if (typeof data === 'string') {
				ready.push({ label: p.label, value: p.value, csvText: data })
				return
			}
			const err = (query as { error?: unknown }).error
			if (err) failed.push(p)
		})
		if (ready.length === 0) {
			toast.error('No data available to download')
			return
		}
		const merged = combineCsvsWide(ready, dateRange)
		if (merged.length <= 1) {
			toast.error('No rows to download')
			return
		}
		const filename = `${dataset.slug}_combined.csv`
		downloadCSV(filename, merged, { addTimestamp: true })
		if (failed.length > 0) {
			toast.success(
				`Downloaded ${filename} — skipped ${failed.length} failed (${failed.map((f) => f.label).join(', ')})`
			)
		} else {
			toast.success(`Downloaded ${filename}`)
		}

		const configBase = extractChartConfig({
			slug: dataset.slug,
			headers,
			selectedParams,
			selectedColumns: cols,
			sort: sortState,
			dateRange
		})
		recordRecent({
			...configBase,
			id: generatePresetId(),
			name: defaultPresetName(configBase, dataset.name),
			createdAt: Date.now()
		})
	}, [csvQueries, selectedParams, dataset.slug, dataset.name, headers, cols, sortState, dateRange, recordRecent])

	const handleDownloadSingle = useCallback(
		(param: ParamOption) => {
			const idx = selectedParams.findIndex((p) => p.value === param.value)
			if (idx < 0) return
			const query = csvQueries[idx]
			if (!query || typeof query.data !== 'string') {
				toast.error('Data not loaded yet')
				return
			}
			const filename = `${dataset.slug}_${param.value}.csv`

			let downloadedHeaders: string[] | null = null
			let downloadedCols: Set<number> | null = null
			let downloadedSort: SortState | null = null

			if (param.value === activePreviewValue && selectedCount > 0 && deferredSearch.length === 0) {
				const csvRows = buildSelectedCsvRows(columnMeta, cols, sortedRows)
				if (csvRows.length > 1) {
					downloadCSV(filename, csvRows, { addTimestamp: false })
					toast.success(`Downloaded ${filename}`)
					downloadedHeaders = headers
					downloadedCols = cols
					downloadedSort = sortState
				}
			}
			if (downloadedHeaders === null) {
				const parsed = parseCsv(query.data)
				const parsedDateIdx = parsed.headers.indexOf('date')
				const rowsForDownload = filterParsedRowsByDateRange(parsed.rows, parsedDateIdx, dateRange)
				if (rowsForDownload.length === 0) {
					toast.error('No rows to download')
					return
				}
				const allRows: string[][] = [
					parsed.headers,
					...rowsForDownload.map((r) => parsed.headers.map((_, i) => r.values[i] ?? ''))
				]
				downloadCSV(filename, allRows, { addTimestamp: false })
				toast.success(`Downloaded ${filename}`)
				downloadedHeaders = parsed.headers
			}

			const configBase = extractChartConfig({
				slug: dataset.slug,
				headers: downloadedHeaders,
				selectedParams: [param],
				selectedColumns: downloadedCols,
				sort: downloadedSort,
				dateRange
			})
			recordRecent({
				...configBase,
				id: generatePresetId(),
				name: defaultPresetName(configBase, dataset.name),
				createdAt: Date.now()
			})
		},
		[
			csvQueries,
			selectedParams,
			activePreviewValue,
			selectedCount,
			deferredSearch,
			columnMeta,
			cols,
			sortedRows,
			headers,
			sortState,
			dateRange,
			dataset.slug,
			dataset.name,
			recordRecent
		]
	)

	const handleDownload = useCallback(() => {
		if (selectedParams.length === 0) return
		if (selectedParams.length === 1) {
			if (!selectedParam) return
			if (selectedCount === 0) {
				toast.error('Select at least one column')
				return
			}
			const csvRows = buildSelectedCsvRows(columnMeta, cols, sortedRows)
			if (csvRows.length <= 1) {
				toast.error('No rows to download')
				return
			}
			const filename = `${dataset.slug}_${selectedParam.value}.csv`
			downloadCSV(filename, csvRows, { addTimestamp: false })
			toast.success(`Downloaded ${filename}`)

			const configBase = extractChartConfig({
				slug: dataset.slug,
				headers,
				selectedParams,
				selectedColumns: cols,
				sort: sortState,
				dateRange
			})
			recordRecent({
				...configBase,
				id: generatePresetId(),
				name: defaultPresetName(configBase, dataset.name),
				createdAt: Date.now()
			})
			return
		}
		handleDownloadCombined()
	}, [
		selectedParams,
		selectedParam,
		selectedCount,
		columnMeta,
		cols,
		sortedRows,
		dataset.slug,
		dataset.name,
		headers,
		sortState,
		dateRange,
		recordRecent,
		handleDownloadCombined
	])

	const handleSavePreset = useCallback(
		(name: string, replaceExisting: boolean) => {
			const configBase = extractChartConfig({
				slug: dataset.slug,
				headers,
				selectedParams,
				selectedColumns: cols,
				sort: sortState,
				dateRange
			})
			saveDownload(
				{
					...configBase,
					id: generatePresetId(),
					name,
					createdAt: Date.now()
				},
				{ replaceByName: replaceExisting }
			)
			setShowSaveDialog(false)
			toast.success(`Saved preset "${name}"`)
		},
		[dataset.slug, headers, selectedParams, cols, sortState, dateRange, saveDownload]
	)

	const suggestedPresetName = useMemo(() => {
		if (selectedParams.length === 0) return ''
		const configBase = extractChartConfig({
			slug: dataset.slug,
			headers,
			selectedParams,
			selectedColumns: cols,
			sort: sortState,
			dateRange
		})
		return defaultPresetName(configBase, dataset.name)
	}, [dataset.slug, dataset.name, headers, selectedParams, cols, sortState, dateRange])

	const existingPresetNames = useMemo(() => savedDownloads.map((s) => s.name), [savedDownloads])

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

	const hasActiveFilter = !!dateRange || deferredSearch.length > 0
	const rowsCountLabel = hasActiveFilter
		? `${sortedRows.length.toLocaleString()} of ${rows.length.toLocaleString()} rows`
		: `${sortedRows.length.toLocaleString()} rows`

	const headerSubtitle = (() => {
		if (!hasSelection) {
			return `Select ${dataset.paramLabel.toLowerCase()}(s) to preview`
		}
		if (isBulk) {
			if (loadingCount > 0) return `Loading ${readyCount}/${selectedParams.length}...`
			if (selectedParam && headers.length > 0) {
				return `${rowsCountLabel} · previewing ${selectedParam.label}`
			}
			return `${selectedParams.length} selected`
		}
		if (dataLoading) return 'Loading...'
		if (dataError) return 'Error'
		if (headers.length > 0) {
			return `${rowsCountLabel} · ${selectedCount}/${headers.length} cols selected`
		}
		return ''
	})()

	const downloadLabel = isBulk ? 'Download Combined' : 'Download'
	const topBarDownloadDisabled = (() => {
		if (isPreview) return false
		if (!hasSelection) return true
		if (isBulk) {
			return loadingCount === selectedParams.length || readyCount === 0
		}
		return selectedCount === 0
	})()

	const showTopBarActions = hasSelection && (isBulk || hasData)

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
								<p className="text-xs text-(--text-tertiary)">{headerSubtitle}</p>
							</div>

							{showTopBarActions ? (
								<>
									{!isBulk && hasData ? (
										<button
											type="button"
											onClick={() =>
												isPreview ? (setSignupSource('downloads'), subscribeModalStore.show()) : void handleCopy()
											}
											disabled={!isPreview && selectedCount === 0}
											className="hidden items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:opacity-40 sm:flex"
											title="Copy selected columns as TSV"
										>
											<Icon name="clipboard" className="h-3.5 w-3.5" />
											<span className="hidden lg:inline">Copy</span>
										</button>
									) : null}

									{!isPreview ? (
										<button
											type="button"
											onClick={() => setShowSaveDialog(true)}
											disabled={!hasSelection}
											className="hidden items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:opacity-40 sm:flex"
											title="Save as preset"
										>
											<Icon name="bookmark" className="h-3.5 w-3.5" />
											<span className="hidden lg:inline">Save preset</span>
										</button>
									) : null}

									<button
										type="button"
										onClick={() =>
											isPreview ? (setSignupSource('downloads'), subscribeModalStore.show()) : handleDownload()
										}
										disabled={topBarDownloadDisabled}
										className="flex items-center gap-1.5 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
									>
										<Icon name="download-cloud" className="h-3.5 w-3.5" />
										<span className="hidden sm:inline">{downloadLabel}</span>
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
							{protocolCategories.length > 0 ? (
								<CategoryPickerPopover
									categories={protocolCategories}
									selected={selectedCategory}
									onSelect={setSelectedCategory}
								/>
							) : null}
							<MultiOptionPickerPopover
								label={dataset.paramLabel}
								options={filteredOptions}
								selected={selectedParams}
								onToggle={handleToggleParam}
								onClearAll={handleClearParams}
								onAddMultiple={handleAddMultipleParams}
								maxSelections={MAX_PARAMS}
							/>

							{hasSelection && !isPreview ? (
								<DateRangePicker
									value={dateRange}
									onChange={setDateRange}
									minDate={dateBounds.min}
									maxDate={dateBounds.max}
								/>
							) : null}

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

					<div className="flex min-h-0 flex-1">
						<div className="relative flex min-w-0 flex-1 flex-col">
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
										<p className="text-sm text-(--text-secondary)">
											{dateRange && rows.length > 0
												? 'No rows in selected date range'
												: deferredSearch.length > 0
													? 'No rows match your search'
													: 'No matching rows'}
										</p>
										{dateRange && rows.length > 0 ? (
											<button
												type="button"
												onClick={() => setDateRange(null)}
												className="mt-1 rounded-md border border-(--divider) px-3 py-1 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
											>
												Clear date range
											</button>
										) : null}
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
											<PlaceholderRows
												columnMeta={columnMeta}
												gridTemplate={gridTemplate}
												tableWidth={tableWidth}
												rows={sortedRows}
												cols={cols}
											/>
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
						</div>

						{hasSelection ? (
							<BulkPreviewSidebar
								dataset={dataset}
								selectedParams={selectedParams}
								activePreviewValue={activePreviewValue}
								csvQueries={csvQueries}
								onSelectActive={handleSetActive}
								onRemove={handleRemoveParam}
								onClearAll={handleClearParams}
								onDownloadSingle={handleDownloadSingle}
								onDownloadCombined={handleDownloadCombined}
								isPreview={!!isPreview}
								onSubscribeClick={() => {
									setSignupSource('downloads')
									subscribeModalStore.show()
								}}
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
			{showSaveDialog ? (
				<SavePresetDialog
					suggestedName={suggestedPresetName}
					existingNames={existingPresetNames}
					onSave={handleSavePreset}
					onClose={() => setShowSaveDialog(false)}
				/>
			) : null}
		</>
	)
}

function PlaceholderRows({
	columnMeta,
	gridTemplate,
	tableWidth,
	rows,
	cols
}: {
	columnMeta: ColumnMeta[]
	gridTemplate: string
	tableWidth: number
	rows: PreviewRow[]
	cols: Set<number>
}) {
	if (rows.length === 0) return null
	const duplicated = [...rows, ...rows]
	return (
		<div style={{ minWidth: `${tableWidth}px` }}>
			{duplicated.map((row, rowIdx) => {
				const isOdd = (rows.length + rowIdx) % 2 === 1
				return (
					<div
						key={`placeholder-${rowIdx}`}
						style={{ display: 'grid', gridTemplateColumns: gridTemplate, height: `${ROW_HEIGHT}px` }}
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
	)
}

function CategoryPickerPopover({
	categories,
	selected,
	onSelect
}: {
	categories: Array<[string, number]>
	selected: string | null
	onSelect: (cat: string | null) => void
}) {
	const [search, setSearch] = useState('')
	const deferred = useDeferredValue(search.trim().toLowerCase())

	const filtered = useMemo(() => {
		if (!deferred) return categories
		return categories.filter(([cat]) => cat.toLowerCase().includes(deferred))
	}, [categories, deferred])

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure className="flex items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)">
				<Icon name="tag" className="h-3.5 w-3.5" />
				<span>{selected ?? 'All categories'}</span>
				{selected ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onSelect(null)
						}}
						className="rounded-full p-0.5 hover:bg-(--link-hover-bg)"
					>
						<Icon name="x" className="h-2.5 w-2.5" />
					</button>
				) : null}
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				gutter={6}
				portal
				unmountOnHide
				className="z-[60] flex max-h-80 w-64 flex-col overflow-hidden rounded-lg border border-(--divider) bg-(--cards-bg) shadow-xl"
			>
				<div className="border-b border-(--divider) px-3 py-2">
					<input
						value={search}
						onChange={(e) => setSearch(e.currentTarget.value)}
						placeholder="Search categories..."
						className="w-full rounded-md border border-(--divider) bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-(--text-tertiary) focus:border-(--primary)"
						autoFocus
					/>
				</div>
				<div className="thin-scrollbar flex-1 overflow-auto py-1">
					<button
						type="button"
						onClick={() => onSelect(null)}
						className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--link-hover-bg) ${
							selected === null ? 'font-medium text-(--text-primary)' : 'text-(--text-secondary)'
						}`}
					>
						All categories
					</button>
					{filtered.map(([cat, count]) => (
						<button
							key={cat}
							type="button"
							onClick={() => onSelect(cat)}
							className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--link-hover-bg) ${
								selected === cat ? 'font-medium text-(--text-primary)' : 'text-(--text-secondary)'
							}`}
						>
							<span className="truncate">{cat}</span>
							<span className="shrink-0 text-(--text-tertiary)">{count}</span>
						</button>
					))}
					{filtered.length === 0 ? (
						<p className="px-3 py-2 text-xs text-(--text-tertiary)">No categories match</p>
					) : null}
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}

function MultiOptionPickerPopover({
	label,
	options,
	selected,
	onToggle,
	onClearAll,
	onAddMultiple,
	maxSelections
}: {
	label: string
	options: Array<ParamOption>
	selected: Array<ParamOption>
	onToggle: (option: ParamOption) => void
	onClearAll: () => void
	onAddMultiple: (options: ParamOption[]) => void
	maxSelections: number
}) {
	const popoverStore = Ariakit.usePopoverStore()
	const [optionSearch, setOptionSearch] = useState('')
	const deferredOptionSearch = useDeferredValue(optionSearch.trim().toLowerCase())

	const selectedValues = useMemo(() => new Set(selected.map((s) => s.value)), [selected])

	const filtered = useMemo(() => {
		const source = deferredOptionSearch
			? options.filter((o) => o.label.toLowerCase().includes(deferredOptionSearch))
			: options
		return source.slice(0, 200)
	}, [options, deferredOptionSearch])

	const capHit = selected.length >= maxSelections

	const unselectedInView = useMemo(
		() => filtered.filter((o) => !selectedValues.has(o.value)),
		[filtered, selectedValues]
	)
	const canAddAll = unselectedInView.length > 0 && selected.length + unselectedInView.length <= maxSelections

	const triggerText =
		selected.length === 0 ? `Select ${label}` : selected.length === 1 ? `1 ${label}` : `${selected.length} ${label}s`

	return (
		<Ariakit.PopoverProvider store={popoverStore}>
			<Ariakit.PopoverDisclosure className="flex items-center gap-1.5 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)">
				<Icon name="chevron-down" className="h-3.5 w-3.5" />
				<span>{triggerText}</span>
				{selected.length > 0 ? (
					<span className="rounded bg-(--primary) px-1 text-[10px] font-semibold text-white">{selected.length}</span>
				) : null}
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				gutter={6}
				portal
				unmountOnHide
				className="z-[60] flex max-h-96 w-80 flex-col overflow-hidden rounded-lg border border-(--divider) bg-(--cards-bg) shadow-xl"
			>
				<div className="flex items-center justify-between gap-2 border-b border-(--divider) px-3 py-2">
					<span className="text-xs font-medium text-(--text-secondary)">
						{selected.length}/{maxSelections} selected
					</span>
					<div className="flex items-center gap-2">
						{canAddAll ? (
							<button
								type="button"
								onClick={() => onAddMultiple(unselectedInView)}
								className="text-xs text-(--primary) hover:underline"
							>
								Add all ({unselectedInView.length})
							</button>
						) : null}
						{selected.length > 0 ? (
							<button type="button" onClick={onClearAll} className="text-xs text-(--primary) hover:underline">
								Clear all
							</button>
						) : null}
					</div>
				</div>
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
						filtered.map((opt) => {
							const isSelected = selectedValues.has(opt.value)
							const disabled = !isSelected && capHit
							return (
								<button
									key={opt.value}
									type="button"
									disabled={disabled}
									onClick={() => onToggle(opt)}
									title={disabled ? `Max ${maxSelections} items` : undefined}
									className={`flex w-full items-center gap-2.5 py-1.5 pr-3 text-left text-xs transition-colors hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40 ${
										isSelected ? 'text-(--text-primary)' : 'text-(--text-secondary)'
									} ${opt.isChild ? 'pl-7' : 'pl-3'}`}
								>
									<span
										className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
											isSelected ? 'border-(--primary) bg-(--primary) text-white' : 'border-(--divider)'
										}`}
									>
										{isSelected ? <Icon name="check" className="h-2.5 w-2.5" /> : null}
									</span>
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

interface CsvQueryStatus {
	data: unknown
	isLoading: boolean
	error: unknown
}

interface BulkPreviewSidebarProps {
	dataset: ChartDatasetDefinition
	selectedParams: Array<ParamOption>
	activePreviewValue: string | null
	csvQueries: ReadonlyArray<CsvQueryStatus>
	onSelectActive: (value: string) => void
	onRemove: (value: string) => void
	onClearAll: () => void
	onDownloadSingle: (param: ParamOption) => void
	onDownloadCombined: () => void
	isPreview: boolean
	onSubscribeClick: () => void
	readyCount: number
	loadingCount: number
}

function BulkPreviewSidebar({
	dataset,
	selectedParams,
	activePreviewValue,
	csvQueries,
	onSelectActive,
	onRemove,
	onClearAll,
	onDownloadSingle,
	onDownloadCombined,
	isPreview,
	onSubscribeClick,
	readyCount,
	loadingCount
}: BulkPreviewSidebarProps) {
	const combinedDisabled = loadingCount > 0 || readyCount === 0
	return (
		<aside className="hidden w-72 shrink-0 flex-col border-l border-(--divider) bg-(--bg-primary) sm:flex">
			<div className="flex items-center justify-between gap-2 border-b border-(--divider) px-3 py-2">
				<div className="min-w-0">
					<p className="text-xs font-semibold text-(--text-primary)">
						Selected {dataset.paramLabel.toLowerCase()}s ({selectedParams.length})
					</p>
					{loadingCount > 0 ? (
						<p className="text-[10px] text-(--text-tertiary)">
							Ready {readyCount}/{selectedParams.length}
						</p>
					) : null}
				</div>
				{selectedParams.length > 0 ? (
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
				{selectedParams.map((param, i) => {
					const query = csvQueries[i]
					const isActive = param.value === activePreviewValue
					const isReady = typeof query?.data === 'string'
					const isQueryLoading = !!query?.isLoading
					const hasError = !!query?.error
					return (
						<div
							key={param.value}
							className={`flex items-center gap-1.5 border-b border-(--divider) px-2.5 py-2 text-xs transition-colors ${
								isActive ? 'bg-(--link-hover-bg)' : 'hover:bg-(--link-hover-bg)'
							}`}
						>
							<button
								type="button"
								onClick={() => onSelectActive(param.value)}
								className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
								title={`Preview ${param.label}`}
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
									{param.label}
								</span>
							</button>
							<button
								type="button"
								onClick={() => onDownloadSingle(param)}
								disabled={!isReady || isPreview}
								title={isPreview ? 'Subscribe to download' : 'Download this CSV'}
								className="shrink-0 rounded p-1 text-(--text-tertiary) transition-colors hover:bg-(--bg-main) hover:text-(--primary) disabled:cursor-not-allowed disabled:opacity-30"
							>
								<Icon name="download-cloud" className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => onRemove(param.value)}
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
							Wide format — each {dataset.paramLabel.toLowerCase()} becomes a column
						</p>
					</>
				)}
			</div>
		</aside>
	)
}
