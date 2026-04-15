import dayjs from 'dayjs'
import { parseCsvLine, type ParsedCsvRow } from './csvParse'
import type { DateRangeConfig } from './savedDownloads'

export interface ResolvedDateRange {
	from: string // YYYY-MM-DD, inclusive
	to: string // YYYY-MM-DD, inclusive
}

/**
 * Convert a DateRangeConfig into an inclusive {from, to} pair of YYYY-MM-DD strings.
 * Returns null for unbounded ranges ('all' preset) and for invalid inputs — callers
 * treat null as "no filter applied".
 *
 * Relative presets resolve against `dayjs()` at call time, so "last 30 days" keeps
 * rolling each time a saved preset re-runs.
 */
export function resolveDateRange(range: DateRangeConfig | null | undefined): ResolvedDateRange | null {
	if (!range) return null
	if (range.kind === 'preset') {
		if (range.preset === 'all') return null
		const today = dayjs()
		const to = today.format('YYYY-MM-DD')
		switch (range.preset) {
			case '7d':
				return { from: today.subtract(7, 'day').format('YYYY-MM-DD'), to }
			case '30d':
				return { from: today.subtract(30, 'day').format('YYYY-MM-DD'), to }
			case '90d':
				return { from: today.subtract(90, 'day').format('YYYY-MM-DD'), to }
			case '1y':
				return { from: today.subtract(1, 'year').format('YYYY-MM-DD'), to }
			case 'ytd':
				return { from: today.startOf('year').format('YYYY-MM-DD'), to }
		}
	}
	if (!range.from || !range.to) return null
	// Normalize order so a user entering from > to doesn't silently produce an empty set.
	if (range.from > range.to) return { from: range.to, to: range.from }
	return { from: range.from, to: range.to }
}

/**
 * Filter a CSV string by its `date` column. Only full-line slicing — no re-serialization
 * of fields — so quoted/escaped values in non-date columns are preserved bit-for-bit.
 * Returns the original string unchanged when there is no filter or no date column.
 */
export function filterCsvByDateRange(csv: string, range: DateRangeConfig | null | undefined): string {
	const window = resolveDateRange(range)
	if (!window) return csv
	const eol = csv.includes('\r\n') ? '\r\n' : '\n'
	const lines = csv.split(eol)
	if (lines.length === 0) return csv
	const headerLine = lines[0]
	if (!headerLine.trim()) return csv
	const headers = parseCsvLine(headerLine)
	const dateIdx = headers.indexOf('date')
	if (dateIdx === -1) return csv

	const kept: string[] = [headerLine]
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]
		if (!line.trim()) continue
		const fields = parseCsvLine(line)
		const date = fields[dateIdx]
		if (!date) continue
		if (date < window.from || date > window.to) continue
		kept.push(line)
	}
	return kept.join(eol)
}

/**
 * Filter already-parsed rows by a specific date column index. Used in preview paths
 * where rows have already been parsed — cheaper than re-parsing.
 */
export function filterParsedRowsByDateRange<T extends ParsedCsvRow>(
	rows: readonly T[],
	dateColIndex: number,
	range: DateRangeConfig | null | undefined
): T[] {
	const window = resolveDateRange(range)
	if (!window) return rows.slice()
	if (dateColIndex < 0) return rows.slice()
	const result: T[] = []
	for (const row of rows) {
		const date = row.values[dateColIndex]
		if (!date) continue
		if (date < window.from || date > window.to) continue
		result.push(row)
	}
	return result
}
