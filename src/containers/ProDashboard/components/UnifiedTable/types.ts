import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import type { UnifiedTableConfig } from '../../types'

export type UnifiedTableFocusSection = 'strategy' | 'columns' | 'filters' | 'preview'

export interface UnifiedTableProps {
	config: UnifiedTableConfig
	previewMode?: boolean
	columnOrderOverride?: ColumnOrderState
	columnVisibilityOverride?: VisibilityState
	sortingOverride?: SortingState
	onPreviewColumnOrderChange?: (order: ColumnOrderState) => void
	onPreviewColumnVisibilityChange?: (visibility: VisibilityState) => void
	onPreviewSortingChange?: (sorting: SortingState) => void
	onEdit?: (focusSection?: UnifiedTableFocusSection) => void
	onOpenColumnModal?: () => void
	onPresetChange?: (presetId: string) => void
}

export interface NumericMetrics {
	tvl?: number | null
	tvlPrevDay?: number | null
	tvlPrevWeek?: number | null
	tvlPrevMonth?: number | null
	change1d?: number | null
	change7d?: number | null
	change1m?: number | null
	users?: number | null
	bridgedTvl?: number | null
	stablesMcap?: number | null
	nftVolume?: number | null
	tvlShare?: number | null
	stablesShare?: number | null
	volume24hShare?: number | null
	volume24h?: number | null
	volume_7d?: number | null
	volume_30d?: number | null
	cumulativeVolume?: number | null
	volumeChange_1d?: number | null
	volumeChange_7d?: number | null
	volumeChange_1m?: number | null
	volumeDominance_24h?: number | null
	volumeMarketShare7d?: number | null
	fees24h?: number | null
	fees_7d?: number | null
	fees_30d?: number | null
	fees_1y?: number | null
	average_1y?: number | null
	cumulativeFees?: number | null
	userFees_24h?: number | null
	holderRevenue_24h?: number | null
	holderRevenue_7d?: number | null
	holdersRevenue30d?: number | null
	treasuryRevenue_24h?: number | null
	supplySideRevenue_24h?: number | null
	feesChange_1d?: number | null
	feesChange_7d?: number | null
	feesChange_1m?: number | null
	revenue24h?: number | null
	revenue_7d?: number | null
	revenue_30d?: number | null
	revenue_1y?: number | null
	average_revenue_1y?: number | null
	revenueChange_1d?: number | null
	revenueChange_7d?: number | null
	revenueChange_1m?: number | null
	perpsVolume24h?: number | null
	perps_volume_7d?: number | null
	perps_volume_30d?: number | null
	perps_volume_change_1d?: number | null
	perps_volume_change_7d?: number | null
	perps_volume_change_1m?: number | null
	perps_volume_dominance_24h?: number | null
	openInterest?: number | null
	aggregators_volume_24h?: number | null
	aggregators_volume_7d?: number | null
	aggregators_volume_30d?: number | null
	aggregators_volume_change_1d?: number | null
	aggregators_volume_change_7d?: number | null
	aggregators_volume_dominance_24h?: number | null
	aggregators_volume_marketShare7d?: number | null
	derivatives_aggregators_volume_24h?: number | null
	derivatives_aggregators_volume_7d?: number | null
	derivatives_aggregators_volume_30d?: number | null
	derivatives_aggregators_volume_change_1d?: number | null
	derivatives_aggregators_volume_change_7d?: number | null
	derivatives_aggregators_volume_change_1m?: number | null
	options_volume_24h?: number | null
	options_volume_7d?: number | null
	options_volume_30d?: number | null
	options_volume_change_1d?: number | null
	options_volume_change_7d?: number | null
	options_volume_dominance_24h?: number | null
	mcap?: number | null
	fdv?: number | null
	chainMcap?: number | null
	mcaptvl?: number | null
	pf?: number | null
	ps?: number | null
	protocolCount?: number | null
}

export interface NormalizedRow {
	id: string
	name: string
	protocolId?: string
	displayName?: string
	logo?: string | null
	chain?: string | null
	category?: string | null
	chains?: string[]
	allChains?: string[]
	oracles?: string[]
	parentProtocolId?: string | null
	parentProtocolName?: string | null
	parentProtocolLogo?: string | null
	metrics: NumericMetrics
	original?: any
}

export interface ExportableColumn {
	id: string
	header: string
	isVisible: boolean
}

export type MetricGroup =
	| 'tvl'
	| 'volume'
	| 'fees'
	| 'revenue'
	| 'perps'
	| 'aggregators'
	| 'derivatives-aggregators'
	| 'options'
	| 'ratios'
