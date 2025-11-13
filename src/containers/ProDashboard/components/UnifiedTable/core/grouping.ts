import type { UnifiedRowHeaderType } from '../../../types'

export const ROW_HEADER_GROUPING_COLUMN_IDS: Record<UnifiedRowHeaderType, string> = {
	'parent-protocol': '__group_parent_protocol',
	protocol: '__group_protocol',
	chain: '__group_chain',
	category: '__group_category'
}

export const GROUPING_COLUMN_ID_SET = new Set<string>(Object.values(ROW_HEADER_GROUPING_COLUMN_IDS))

export type GroupingColumnId = (typeof ROW_HEADER_GROUPING_COLUMN_IDS)[keyof typeof ROW_HEADER_GROUPING_COLUMN_IDS]

export const GROUPING_COLUMN_ID_TO_HEADER = Object.entries(ROW_HEADER_GROUPING_COLUMN_IDS).reduce<
	Record<string, UnifiedRowHeaderType>
>((acc, [header, columnId]) => {
	acc[columnId] = header as UnifiedRowHeaderType
	return acc
}, {})

export const getGroupingColumnIdsForHeaders = (headers: UnifiedRowHeaderType[]): string[] => {
	return headers.map((header) => ROW_HEADER_GROUPING_COLUMN_IDS[header]!).filter(Boolean)
}

export const isGroupingColumnId = (columnId: string): boolean => GROUPING_COLUMN_ID_SET.has(columnId)
