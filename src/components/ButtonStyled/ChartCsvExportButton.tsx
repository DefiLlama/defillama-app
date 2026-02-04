import type * as echarts from 'echarts/core'
import { useCallback } from 'react'
import { toNiceCsvDate } from '~/utils'
import { CSVDownloadButton } from './CsvButton'

type CsvCell = string | number | boolean

function isRecord(x: unknown): x is Record<string, unknown> {
	return !!x && typeof x === 'object' && !Array.isArray(x)
}

function isStringArray(x: unknown): x is string[] {
	return Array.isArray(x) && x.every((v) => typeof v === 'string')
}

function normalizeEpochSeconds(x: unknown): number | null {
	if (typeof x !== 'number' && typeof x !== 'string') return null
	const n = typeof x === 'number' ? x : Number(x)
	if (!Number.isFinite(n)) return null
	// Heuristic: ms timestamps are ~1e12+, seconds are ~1e9+
	return n > 1e12 ? Math.floor(n / 1e3) : Math.floor(n)
}

function coerceXKey(x: unknown): string | number | null {
	if (typeof x === 'number') return Number.isFinite(x) ? x : null
	if (typeof x !== 'string') return null
	const trimmed = x.trim()
	if (!trimmed) return x
	const asNum = Number(trimmed)
	return Number.isFinite(asNum) ? asNum : x
}

function getDatasetFromOption(option: any): { dimensions: string[] | null; source: unknown[] | null } {
	const ds = option?.dataset
	const datasetObj = Array.isArray(ds) ? ds[0] : ds
	const dimensionsRaw = datasetObj?.dimensions
	const sourceRaw = datasetObj?.source

	const dimensions =
		Array.isArray(dimensionsRaw) && dimensionsRaw.every((d: any) => typeof d === 'string')
			? (dimensionsRaw as string[])
			: null
	const source = Array.isArray(sourceRaw) ? (sourceRaw as unknown[]) : null

	return { dimensions, source }
}

function buildCsvRowsFromDataset(dimensions: string[] | null, source: unknown[] | null): Array<Array<CsvCell>> {
	if (!source || source.length === 0) return []

	// ECharts dataset.source can be:
	// - object rows: [{ timestamp: 1, A: 2 }, ...]
	// - array rows with explicit `dimensions`: [[1,2,...], ...]
	// - array rows with header row: [['timestamp','A',...], [1,2,...], ...]
	let dataRows: unknown[] = source

	const headerDimsFromSource = !dimensions && isStringArray(source[0]) ? (source[0] as string[]) : null
	const dims =
		dimensions ??
		headerDimsFromSource ??
		(() => {
			const first = source[0]
			if (!isRecord(first)) return []
			const keys = Object.keys(first)
			if (keys.includes('timestamp')) return ['timestamp', ...keys.filter((k) => k !== 'timestamp')]
			return keys
		})()

	if (!dimensions && headerDimsFromSource) {
		dataRows = source.slice(1)
	}

	if (dims.length === 0) return []

	const hasTimestamp = dims.includes('timestamp')
	const seriesDims = hasTimestamp ? dims.filter((k) => k !== 'timestamp') : dims

	const rows: Array<Array<CsvCell>> = []

	if (hasTimestamp) {
		rows.push(['Timestamp', 'Date', ...seriesDims])
		const tsIndex = dims.indexOf('timestamp')
		const seriesIndexes = seriesDims.map((k) => dims.indexOf(k))

		for (const row of dataRows) {
			let tsRaw: unknown = ''
			let values: CsvCell[] = []

			if (isRecord(row)) {
				tsRaw = row.timestamp
				values = seriesDims.map((k) => ((row as any)?.[k] ?? '') as CsvCell)
			} else if (Array.isArray(row)) {
				tsRaw = tsIndex >= 0 ? row[tsIndex] : ''
				values = seriesIndexes.map((idx) => ((idx >= 0 ? row[idx] : '') ?? '') as CsvCell)
			} else {
				continue
			}

			const tsSeconds = normalizeEpochSeconds(tsRaw)
			rows.push([(tsRaw ?? '') as CsvCell, tsSeconds != null ? toNiceCsvDate(tsSeconds) : '', ...values])
		}
		return rows
	}

	rows.push([...dims])
	for (const row of dataRows) {
		if (isRecord(row)) {
			rows.push(dims.map((k) => ((row as any)?.[k] ?? '') as CsvCell))
			continue
		}
		if (Array.isArray(row)) {
			rows.push(dims.map((_, idx) => (row[idx] ?? '') as CsvCell))
			continue
		}
	}
	return rows
}

function buildCsvRowsFromSeriesFallback(option: any): Array<Array<CsvCell>> {
	const seriesRaw = option?.series
	const seriesArr: any[] = Array.isArray(seriesRaw) ? seriesRaw : seriesRaw ? [seriesRaw] : []
	if (seriesArr.length === 0) return []

	const xAxisRaw = option?.xAxis
	const xAxis = Array.isArray(xAxisRaw) ? xAxisRaw[0] : xAxisRaw
	const xAxisData: unknown[] | null = Array.isArray(xAxis?.data) ? xAxis.data : null

	const seriesNames: string[] = []
	const rowsByX = new Map<string | number, Record<string, CsvCell>>() // key type must be stable

	for (let s = 0; s < seriesArr.length; s++) {
		const series = seriesArr[s]
		const name = typeof series?.name === 'string' && series.name ? series.name : `series_${s + 1}`
		seriesNames.push(name)

		const data: unknown[] = Array.isArray(series?.data) ? series.data : []
		for (let i = 0; i < data.length; i++) {
			const point = data[i]
			let x: unknown = xAxisData?.[i]
			let y: unknown = null

			if (Array.isArray(point)) {
				x = point[0]
				y = point[1]
			} else if (isRecord(point) && 'value' in point) {
				const v = (point as any).value
				if (Array.isArray(v)) {
					x = v[0]
					y = v[1]
				} else {
					y = v
					if ('name' in point) x = (point as any).name
				}
			} else {
				y = point as any
			}

			const xKey = coerceXKey(x)
			if (xKey == null) continue

			const existing = rowsByX.get(xKey) ?? {}
			existing[name] = (y ?? '') as unknown as CsvCell
			rowsByX.set(xKey, existing)
		}
	}

	if (rowsByX.size === 0) return []

	const xKeys = Array.from(rowsByX.keys())
	const allNumeric = xKeys.every((k) => typeof k === 'number')
	const sorted = allNumeric ? (xKeys as number[]).toSorted((a, b) => a - b) : xKeys

	const maybeFirstTsSeconds = normalizeEpochSeconds(sorted[0])
	const includeDate = maybeFirstTsSeconds != null

	const header: Array<CsvCell> = includeDate ? ['x', 'Date', ...seriesNames] : ['x', ...seriesNames]
	const rows: Array<Array<CsvCell>> = [header]

	for (const xKey of sorted) {
		const record = rowsByX.get(xKey) ?? {}
		const tsSeconds = includeDate ? normalizeEpochSeconds(xKey) : null
		rows.push([
			xKey as CsvCell,
			...(includeDate ? [tsSeconds != null ? toNiceCsvDate(tsSeconds) : ''] : []),
			...seriesNames.map((name) => (record[name] ?? '') as CsvCell)
		])
	}

	return rows
}

function buildCsvFromChart({
	instance,
	filenameBase
}: {
	instance: echarts.ECharts
	filenameBase: string | undefined
}): { filename: string; rows: Array<Array<CsvCell>> } {
	const option = instance.getOption()
	const { dimensions, source } = getDatasetFromOption(option)
	const rows = buildCsvRowsFromDataset(dimensions, source)
	const rowsSafe = rows.length > 0 ? rows : buildCsvRowsFromSeriesFallback(option)

	if (rowsSafe.length === 0) {
		throw new Error('No chart data available for CSV export')
	}

	const base = filenameBase || 'chart'
	const date = new Date().toISOString().split('T')[0]
	return { filename: `${base}-${date}.csv`, rows: rowsSafe }
}

interface ChartCsvExportButtonProps {
	chartInstance: () => echarts.ECharts | null
	className?: string
	smol?: boolean
	filename?: string
}

export function ChartCsvExportButton({ chartInstance, className, smol, filename }: ChartCsvExportButtonProps) {
	const prepareCsv = useCallback(() => {
		const instance = chartInstance()
		if (!instance) {
			throw new Error('Failed to get chart instance')
		}
		return buildCsvFromChart({ instance, filenameBase: filename })
	}, [chartInstance, filename])

	return (
		<CSVDownloadButton prepareCsv={prepareCsv} replaceClassName className={className} smol={smol}>
			<span>{smol ? '.csv' : 'CSV'}</span>
		</CSVDownloadButton>
	)
}
