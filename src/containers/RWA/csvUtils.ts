export const formatCsvCellValue = (value: unknown): string | number | boolean => {
	if (value == null) return ''
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
	if (Array.isArray(value)) return value.join(', ')
	return String(value)
}

export const formatCsvRowValues = (
	row: { getValue: (columnId: string) => unknown },
	columnIds: string[]
): Array<string | number | boolean> => {
	return columnIds.map((columnId) => formatCsvCellValue(row.getValue(columnId)))
}
