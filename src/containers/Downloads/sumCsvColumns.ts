import { parseCsv } from './csvParse'

function escapeCsvField(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

export function sumCsvColumnsToTotal(csvText: string, sumColumnLabel: string): string {
	const { headers, rows } = parseCsv(csvText)
	const dateIdx = headers.indexOf('date')
	if (dateIdx === -1 || headers.length <= 1) return csvText

	const lines: string[] = [`date,${escapeCsvField(sumColumnLabel)}`]
	for (const row of rows) {
		const date = row.values[dateIdx] ?? ''
		if (!date) continue
		let total = 0
		let hasAny = false
		for (let i = 0; i < headers.length; i++) {
			if (i === dateIdx) continue
			const raw = row.values[i]
			if (raw === undefined || raw === null || raw === '') continue
			const n = Number(raw)
			if (!Number.isFinite(n)) continue
			total += n
			hasAny = true
		}
		lines.push(`${escapeCsvField(date)},${hasAny ? String(total) : ''}`)
	}
	return lines.join('\r\n')
}
