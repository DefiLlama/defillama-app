import type { UnifiedRowHeaderType } from '../../types'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from './config/ColumnDictionary'

export const DEFAULT_ROW_HEADERS: UnifiedRowHeaderType[] = ['parent-protocol', 'protocol']

export const DEFAULT_COLUMN_ORDER = [
	'name',
	'category',
	'chains',
	'tvl',
	'change1d',
	'change7d',
	'change1m',
	'fees24h',
	'fees_7d',
	'fees_30d',
	'revenue24h',
	'revenue_7d',
	'revenue_30d',
	'volume24h',
	'volume_7d',
	'perpsVolume24h',
	'openInterest',
	'mcap',
	'fdv',
	'mcaptvl'
]

export const DEFAULT_UNIFIED_TABLE_SORTING: Array<{ id: string; desc: boolean }> = [{ id: 'tvl', desc: true }]
const HIDDEN_TAGS = new Set(['dominance', 'cumulative', 'specialized', 'share'])

export const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = UNIFIED_TABLE_COLUMN_DICTIONARY.reduce<
	Record<string, boolean>
>((acc, column) => {
	if (column.render.startsWith('meta')) {
		acc[column.id] = true
		return acc
	}

	if (column.tags) {
		let hasHiddenTag = false
		for (const tag of column.tags) {
			if (HIDDEN_TAGS.has(tag)) {
				hasHiddenTag = true
				break
			}
		}
		if (hasHiddenTag) {
			acc[column.id] = false
			return acc
		}
	}

	acc[column.id] = true
	return acc
}, {})
