import { downloadTabular, type CsvCell, type DownloadFormat } from '~/utils/download'

export interface QueryResult {
	columns: Array<{ name: string; type: string }>
	rows: Record<string, unknown>[]
}

// LlamaSQL/Arrow results contain native types that the CSV writer can't round-trip directly.
// Convert once, here, and pass a CsvCell[][] to the shared downloadTabular pipeline so we
// reuse the same escaping, file-naming, and analytics hooks as the rest of the app.
export function exportQueryResult(result: QueryResult, format: DownloadFormat, filename = 'query-result'): void {
	if (!result || result.rows.length === 0) {
		// Still emit an empty file so "nothing happened" isn't the UX for empty results.
		downloadTabular(format, filename, [result.columns.map((c) => c.name)], { addTimestamp: true })
		return
	}
	const header: CsvCell[] = result.columns.map((c) => c.name)
	const data: CsvCell[][] = result.rows.map((row) => result.columns.map((c) => toCell(row[c.name])))
	downloadTabular(format, filename, [header, ...data], { addTimestamp: true })
}

function toCell(value: unknown): CsvCell {
	if (value === null || value === undefined) return ''
	if (typeof value === 'bigint') return value.toString()
	if (value instanceof Date) return value.toISOString()
	if (typeof value === 'object') {
		// Arrow may hand us Date-like, Map-like, or array values. Fall through to the CSV writer's
		// object handling (JSON.stringify) rather than guessing semantic types here.
		return value as CsvCell
	}
	return value as CsvCell
}
