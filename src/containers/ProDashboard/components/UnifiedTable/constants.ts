import type { UnifiedRowHeaderType } from '../../types'

export const DEFAULT_PROTOCOLS_ROW_HEADERS: UnifiedRowHeaderType[] = ['parent-protocol', 'protocol']
export const DEFAULT_CHAINS_ROW_HEADERS: UnifiedRowHeaderType[] = ['chain']

export const DEFAULT_PROTOCOLS_COLUMN_ORDER = [
	'name',
	'tvl',
	'change1d',
	'change7d',
	'change1m',
	'fees24h',
	'revenue24h',
	'volume24h',
	'perpsVolume24h',
	'openInterest',
	'mcap'
]

export const DEFAULT_CHAINS_COLUMN_ORDER = [
	'name',
	'tvl',
	'change1d',
	'change7d',
	'change1m',
	'fees24h',
	'revenue24h',
	'volume24h',
	'mcap',
	'openInterest'
]

export const DEFAULT_UNIFIED_TABLE_COLUMN_ORDER_BY_STRATEGY = {
	protocols: DEFAULT_PROTOCOLS_COLUMN_ORDER,
	chains: DEFAULT_CHAINS_COLUMN_ORDER
} as const
