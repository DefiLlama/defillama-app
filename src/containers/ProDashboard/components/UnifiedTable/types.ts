import type { UnifiedTableConfig, UnifiedRowHeaderType } from '../../types'

export interface NumericMetrics {
	tvl?: number | null
	tvlPrevDay?: number | null
	tvlPrevWeek?: number | null
	tvlPrevMonth?: number | null
	change1d?: number | null
	change7d?: number | null
	change1m?: number | null
	volume24h?: number | null
	fees24h?: number | null
	revenue24h?: number | null
	perpsVolume24h?: number | null
	openInterest?: number | null
	mcap?: number | null
	protocolCount?: number | null
}

export interface NormalizedRow {
	id: string
	name: string
	strategyType: UnifiedTableConfig['strategyType']
	protocolId?: string
	displayName?: string
	logo?: string | null
	chain?: string | null
	category?: string | null
	parentProtocolId?: string | null
	parentProtocolName?: string | null
	parentProtocolLogo?: string | null
	metrics: NumericMetrics
	original?: any
}

export interface UnifiedRowNode {
	id: string
	type: 'group' | 'leaf'
	level: number
	header?: UnifiedRowHeaderType
	value: string
	label: string
	metrics: NumericMetrics
	children?: UnifiedRowNode[]
	original?: NormalizedRow
	groupKind?: 'parent' | 'protocol'
	iconUrl?: string | null
}

export interface ExportableColumn {
	id: string
	header: string
	isVisible: boolean
}
