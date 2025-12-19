import type { Column, Row, Table } from '@tanstack/react-table'
import type { UnifiedRowHeaderType } from '../../../types'
import { getAggregationContextFromRow, getRowDisplayProps, getRowHeaderFromGroupingColumn } from '../core/groupingUtils'
import type { NormalizedRow } from '../types'
import { isCustomColumnId } from './customColumns'

export function getRowsAtGroupLevel(table: Table<NormalizedRow>, level: UnifiedRowHeaderType): Row<NormalizedRow>[] {
	const result: Row<NormalizedRow>[] = []

	const collectRows = (rows: Row<NormalizedRow>[]) => {
		for (const row of rows) {
			if (row.getIsGrouped()) {
				const rowHeader = getRowHeaderFromGroupingColumn(row.groupingColumnId)
				if (rowHeader === level) {
					result.push(row)
				} else if (row.subRows?.length) {
					collectRows(row.subRows)
				}
			}
		}
	}

	const rowModel = table.getRowModel()
	collectRows(rowModel.rows)

	return result
}

export function getGroupedRowCsvValue(row: Row<NormalizedRow>, columnId: string, percentColumns: Set<string>): string {
	const display = getRowDisplayProps(row)

	if (columnId === 'name') {
		return display.label
	}

	if (isCustomColumnId(columnId)) {
		const value = row.getValue(columnId)
		if (value === null || value === undefined) {
			return ''
		}
		return typeof value === 'number' ? String(value) : ''
	}

	const aggregation = getAggregationContextFromRow(row)
	if (!aggregation) {
		return ''
	}

	const value = aggregation.metrics[columnId as keyof typeof aggregation.metrics]

	if (value === null || value === undefined) {
		return ''
	}

	if (percentColumns.has(columnId) && typeof value === 'number') {
		return value.toFixed(2)
	}

	return typeof value === 'number' ? String(value) : ''
}

const GROUP_LEVEL_HEADERS: Record<UnifiedRowHeaderType, string> = {
	chain: 'Chain',
	category: 'Category',
	'parent-protocol': 'Protocol Group',
	protocol: 'Protocol'
}

export function buildGroupedCsvData(
	rows: Row<NormalizedRow>[],
	columns: Column<NormalizedRow>[],
	percentColumns: Set<string>,
	level: UnifiedRowHeaderType
): { headers: string[]; data: string[][] } {
	const groupHeader = GROUP_LEVEL_HEADERS[level]
	const columnHeaders = columns.map((column) => {
		const header = column.columnDef.header
		return typeof header === 'string' ? header : column.id
	})

	const hasGroupColumn = columnHeaders.some((h) => h.toLowerCase() === groupHeader.toLowerCase())

	if (hasGroupColumn) {
		const data = rows.map((row) => columns.map((column) => getGroupedRowCsvValue(row, column.id, percentColumns)))
		return { headers: columnHeaders, data }
	}

	const nameIndex = columnHeaders.findIndex((h) => h === 'Name' || h === 'name')
	const insertIndex = nameIndex >= 0 ? nameIndex + 1 : 0
	const headers = [...columnHeaders.slice(0, insertIndex), groupHeader, ...columnHeaders.slice(insertIndex)]

	const data = rows.map((row) => {
		const display = getRowDisplayProps(row)
		const rowData = columns.map((column) => getGroupedRowCsvValue(row, column.id, percentColumns))
		return [...rowData.slice(0, insertIndex), display.label, ...rowData.slice(insertIndex)]
	})

	return { headers, data }
}
