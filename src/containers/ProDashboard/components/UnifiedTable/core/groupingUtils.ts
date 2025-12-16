import type { Row } from '@tanstack/react-table'
import type { UnifiedRowHeaderType } from '../../../types'
import type { NormalizedRow, NumericMetrics } from '../types'
import { aggregateMetrics } from '../utils/aggregation'
import { GROUPING_COLUMN_ID_TO_HEADER, ROW_HEADER_GROUPING_COLUMN_IDS, type GroupingColumnId } from './grouping'

const UNKNOWN_LABELS: Record<UnifiedRowHeaderType, string> = {
	protocol: 'Unknown Protocol',
	'parent-protocol': 'Independent',
	chain: 'All Chains',
	category: 'Other'
}

const keyFromValue = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const GROUP_KEY_PREFIX: Record<UnifiedRowHeaderType, string> = {
	'parent-protocol': 'parent',
	protocol: 'protocol',
	chain: 'chain',
	category: 'category'
}

const SELF_GROUP_PREFIX = 'self'

export const isSelfGroupingValue = (value: string | undefined): boolean =>
	Boolean(value && value.startsWith(`${GROUP_KEY_PREFIX['parent-protocol']}:${SELF_GROUP_PREFIX}`))

type HeaderValueMeta = {
	key: string
	label: string
	groupKind?: 'parent' | 'protocol'
	iconUrl?: string | null
}

export const getHeaderGroupingValue = (row: NormalizedRow, header: UnifiedRowHeaderType): HeaderValueMeta => {
	if (header === 'parent-protocol') {
		const parentId = row.parentProtocolId?.trim()
		const hasParent = Boolean(parentId)
		if (hasParent) {
			return {
				key: `${GROUP_KEY_PREFIX[header]}:${parentId}`,
				label:
					(row.parentProtocolName && row.parentProtocolName.trim().length
						? row.parentProtocolName
						: UNKNOWN_LABELS['parent-protocol']) ?? UNKNOWN_LABELS['parent-protocol'],
				groupKind: 'parent',
				iconUrl: row.parentProtocolLogo ?? null
			}
		}
		const protocolKey = row.protocolId?.trim() ?? keyFromValue(row.name || 'protocol')
		return {
			key: `${GROUP_KEY_PREFIX[header]}:${SELF_GROUP_PREFIX}-${protocolKey}`,
			label: row.displayName ?? row.name ?? UNKNOWN_LABELS.protocol,
			groupKind: 'protocol',
			iconUrl: row.logo ?? null
		}
	}

	if (header === 'protocol') {
		const key = row.protocolId?.trim() ?? keyFromValue(row.name || 'protocol')
		return {
			key: `${GROUP_KEY_PREFIX[header]}:${key}`,
			label: row.displayName ?? row.name ?? UNKNOWN_LABELS.protocol,
			groupKind: 'protocol',
			iconUrl: row.logo ?? null
		}
	}

	if (header === 'chain') {
		const chainLabel = row.chain && row.chain.trim().length ? row.chain : UNKNOWN_LABELS.chain
		return {
			key: `${GROUP_KEY_PREFIX[header]}:${keyFromValue(chainLabel) || 'all'}`,
			label: chainLabel,
			iconUrl: null
		}
	}

	if (header === 'category') {
		const category = row.category && row.category.trim().length ? row.category : UNKNOWN_LABELS.category
		return {
			key: `${GROUP_KEY_PREFIX[header]}:${keyFromValue(category) || 'other'}`,
			label: category,
			iconUrl: null
		}
	}

	return { key: `${GROUP_KEY_PREFIX[header]}:${header}`, label: header }
}

export const getGroupingKeyForRow = (row: NormalizedRow, header: UnifiedRowHeaderType): string =>
	getHeaderGroupingValue(row, header).key

const getLeafRowsFromRow = (row: Row<NormalizedRow>): Row<NormalizedRow>[] | undefined => {
	return (row as Row<NormalizedRow> & { leafRows?: Row<NormalizedRow>[] }).leafRows
}

const toNormalizedRows = (leafRows?: Row<NormalizedRow>[]): NormalizedRow[] => {
	if (!leafRows) return []
	return leafRows
		.map((leaf) => leaf.original)
		.filter((value): value is NormalizedRow => Boolean(value && value.id && value.metrics))
}

const getCommonCategory = (rows: NormalizedRow[]): string | null => {
	if (!rows.length) return null
	const first = rows[0]?.category
	if (!first) return null
	for (let i = 1; i < rows.length; i++) {
		if (rows[i]?.category !== first) {
			return null
		}
	}
	return first
}

const getAggregatedChains = (rows: NormalizedRow[]): string[] => {
	const set = new Set<string>()
	for (const row of rows) {
		if (row.chains?.length) {
			row.chains.forEach((chain) => set.add(chain))
		} else if (row.chain) {
			set.add(row.chain)
		}
	}
	return Array.from(set)
}

const getAggregatedOracles = (rows: NormalizedRow[]): string[] => {
	const set = new Set<string>()
	for (const row of rows) {
		if (row.oracles?.length) {
			row.oracles.forEach((oracle) => set.add(oracle))
		}
	}
	return Array.from(set)
}

type AggregatedGroupContext = {
	metrics: NumericMetrics
	category: string | null
	chains: string[]
	oracles: string[]
	rows: NormalizedRow[]
}

const aggregationCache = new WeakMap<Row<NormalizedRow>[], AggregatedGroupContext>()

const computeGroupContext = (leafRows: Row<NormalizedRow>[]): AggregatedGroupContext => {
	const existing = aggregationCache.get(leafRows)
	if (existing) {
		return existing
	}
	const rows = toNormalizedRows(leafRows)
	const context: AggregatedGroupContext = {
		rows,
		metrics: aggregateMetrics(rows),
		category: getCommonCategory(rows),
		chains: getAggregatedChains(rows),
		oracles: getAggregatedOracles(rows)
	}
	aggregationCache.set(leafRows, context)
	return context
}

export const getAggregationContextFromRow = (row: Row<NormalizedRow>): AggregatedGroupContext | null => {
	const leafRows = getLeafRowsFromRow(row)
	if (!leafRows || !leafRows.length) return null
	return computeGroupContext(leafRows)
}

export const getAggregationContextFromLeafRows = (leafRows: Row<NormalizedRow>[]): AggregatedGroupContext => {
	return computeGroupContext(leafRows)
}

export const getRowHeaderFromGroupingColumn = (columnId?: string): UnifiedRowHeaderType | null => {
	if (!columnId) return null
	return GROUPING_COLUMN_ID_TO_HEADER[columnId as GroupingColumnId] ?? null
}

export const getRowDisplayProps = (
	row: Row<NormalizedRow>
): {
	header: UnifiedRowHeaderType | null
	label: string
	groupKind?: 'parent' | 'protocol'
	iconUrl?: string | null
	category: string | null
	chains: string[]
	oracles: string[]
	isSelfGroup: boolean
	original?: NormalizedRow
} => {
	if (!row.getIsGrouped()) {
		const original = row.original
		return {
			header: null,
			label: original?.displayName ?? original?.name ?? '',
			groupKind: 'protocol',
			iconUrl: original?.logo ?? null,
			category: original?.category ?? null,
			chains: original?.chains ?? (original?.chain ? [original.chain] : []),
			oracles: original?.oracles ?? [],
			isSelfGroup: false,
			original
		}
	}

	const header = getRowHeaderFromGroupingColumn(row.groupingColumnId)
	const leafRows = getLeafRowsFromRow(row)
	const firstLeaf = leafRows?.[0]?.original
	if (!header || !firstLeaf) {
		return {
			header: null,
			label: '',
			groupKind: undefined,
			iconUrl: null,
			category: null,
			chains: [],
			oracles: [],
			isSelfGroup: false
		}
	}

	const headerValue = getHeaderGroupingValue(firstLeaf, header)
	const aggregation = leafRows && leafRows.length ? computeGroupContext(leafRows) : null
	return {
		header,
		label: headerValue.label,
		groupKind: headerValue.groupKind,
		iconUrl: headerValue.iconUrl,
		category: aggregation?.category ?? null,
		chains: aggregation?.chains ?? [],
		oracles: aggregation?.oracles ?? [],
		isSelfGroup: isSelfGroupingValue(row.groupingValue as string | undefined),
		original: firstLeaf
	}
}

export const getChainNameForRow = (row: Row<NormalizedRow>): string | null => {
	if (!row) return null
	if (!row.getIsGrouped()) {
		return row.original?.chain ?? null
	}
	const header = getRowHeaderFromGroupingColumn(row.groupingColumnId)
	if (header === 'chain') {
		const display = getRowDisplayProps(row)
		return display.label || null
	}
	return null
}
