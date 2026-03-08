export type CsvCell = string | number | boolean

export function isCsvCell(value: unknown): value is CsvCell {
	if (typeof value === 'number') return Number.isFinite(value)
	return typeof value === 'string' || typeof value === 'boolean'
}

export function toCsvCell(value: unknown): CsvCell {
	return isCsvCell(value) ? value : ''
}
