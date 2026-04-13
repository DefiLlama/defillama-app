import { parseCsv } from './csvParse'

export interface CsvItem {
	label: string
	value: string
	csvText: string
}

/**
 * Merge N per-item CSVs into a single wide-format CSV.
 *
 * - Outer-joined on the `date` column (dates the API returns as YYYY-MM-DD, so string sort is correct).
 * - If an item has exactly one non-date column, that column is renamed to `item.value`.
 * - If an item has multiple non-date columns, each is prefixed with `${item.value}_`.
 * - Missing cells (a date present in one item but not another) become empty strings.
 *
 * Returns a `string[][]` where the first row is the header and subsequent rows are data.
 */
export function combineCsvsWide(items: CsvItem[]): string[][] {
	if (items.length === 0) return []

	const parsed = items.map((item) => {
		const { headers, rows } = parseCsv(item.csvText)
		const dateIndex = headers.indexOf('date')
		const nonDateIndices: number[] = []
		const outputHeaders: string[] = []
		headers.forEach((header, index) => {
			if (index === dateIndex) return
			nonDateIndices.push(index)
		})
		const useBareValue = nonDateIndices.length === 1
		for (const index of nonDateIndices) {
			outputHeaders.push(useBareValue ? item.value : `${item.value}_${headers[index]}`)
		}
		const byDate = new Map<string, string[]>()
		if (dateIndex !== -1) {
			for (const row of rows) {
				const dateKey = row.values[dateIndex] ?? ''
				if (!dateKey) continue
				byDate.set(
					dateKey,
					nonDateIndices.map((i) => row.values[i] ?? '')
				)
			}
		}
		return { item, outputHeaders, byDate, width: nonDateIndices.length }
	})

	const dateSet = new Set<string>()
	for (const p of parsed) {
		for (const d of p.byDate.keys()) dateSet.add(d)
	}
	const dates = [...dateSet].sort()

	const headerRow: string[] = ['date']
	for (const p of parsed) headerRow.push(...p.outputHeaders)

	const output: string[][] = [headerRow]
	for (const date of dates) {
		const row: string[] = [date]
		for (const p of parsed) {
			const values = p.byDate.get(date)
			if (values) {
				row.push(...values)
			} else {
				for (let i = 0; i < p.width; i++) row.push('')
			}
		}
		output.push(row)
	}

	return output
}
