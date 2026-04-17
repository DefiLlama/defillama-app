export interface ParsedCsvRow {
	id: number
	values: string[]
}

export interface ParsedCsv {
	headers: string[]
	rows: ParsedCsvRow[]
}

export function parseCsvLine(line: string): string[] {
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

export function parseCsv(text: string): ParsedCsv {
	const lines = text.split(/\r?\n/).filter((line) => line.trim())
	if (lines.length === 0) return { headers: [], rows: [] }
	const headers = parseCsvLine(lines[0])
	const rows = lines.slice(1).map((line, id) => ({ id, values: parseCsvLine(line) }))
	return { headers, rows }
}
