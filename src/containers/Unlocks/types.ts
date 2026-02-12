// Return types for queries.ts functions

import type {
	EmissionsDataset,
	EmissionsChartRow,
	EmissionsChartConfig,
	EmissionEvent,
	ProtocolEmission,
	TokenAllocationSplit
} from './api.types'

export interface EmissionsChartsData {
	documented: EmissionsChartRow[]
	realtime: EmissionsChartRow[]
}

export interface EmissionsCategories {
	documented: string[]
	realtime: string[]
}

export interface EmissionsDatasets {
	documented: EmissionsDataset
	realtime: EmissionsDataset
}

export interface EmissionsChartConfigs {
	documented: EmissionsChartConfig
	realtime: EmissionsChartConfig
}

export interface EmissionsPieChartData {
	documented: Array<{ name: string; value: number | string }>
	realtime: Array<{ name: string; value: number | string }>
}

export interface EmissionsStackColors {
	documented: Record<string, string>
	realtime: Record<string, string>
}

export interface EmissionsTokenAllocation {
	documented: TokenAllocationSplit
	realtime: TokenAllocationSplit
}

export interface EmissionsHallmarks {
	documented: Array<[number, string]>
	realtime: Array<[number, string]>
}

export interface EmissionsFutures {
	openInterest?: number
	fundingRate?: number
}

export interface ProtocolEmissionsChartsResult {
	chartData: EmissionsChartsData
	unlockUsdChart: unknown[] | null
}

export interface ProtocolEmissionsFullResult {
	chartData: EmissionsChartsData
	pieChartData: EmissionsPieChartData
	stackColors: EmissionsStackColors
	datasets: EmissionsDatasets
	chartsConfigs: EmissionsChartConfigs
	categories: EmissionsCategories
	hallmarks: EmissionsHallmarks
	sources: string[]
	notes: string[]
	events: EmissionEvent[]
	futures: EmissionsFutures
	token: string | null
	geckoId: string | null
	name: string | null
	unlockUsdChart: unknown[] | null
	categoriesBreakdown: Record<string, string[]> | null
	tokenAllocation: EmissionsTokenAllocation
}

export interface ProtocolEmissionsScheduleResult {
	datasets: EmissionsDatasets
	chartsConfigs: EmissionsChartConfigs
	categories: EmissionsCategories
	hallmarks: EmissionsHallmarks
}

export interface ProtocolEmissionsPieResult {
	pieChartData: EmissionsPieChartData
	stackColors: EmissionsStackColors
	meta: ProtocolEmission | Record<string, never>
}

export interface ProtocolEmissionWithHistory extends ProtocolEmission {
	upcomingEvent?: EmissionEvent[] | null
	lastEvent?: EmissionEvent[] | null
	historicalPrice?: Array<[number, number]>
	unlockEvents?: null
	sources?: null
}

export interface ProtocolEmissionResult {
	chartData: EmissionsChartsData
	pieChartData: EmissionsPieChartData
	stackColors: EmissionsStackColors
	datasets: EmissionsDatasets
	chartsConfigs: EmissionsChartConfigs
	meta: ProtocolEmission | Record<string, never>
	sources: string[]
	notes: string[]
	events: EmissionEvent[]
	token: string | null
	geckoId: string | null
	upcomingEvent: EmissionEvent[] | null
	tokenAllocation: EmissionsTokenAllocation
	futures: EmissionsFutures
	categories: EmissionsCategories
	categoriesBreakdown: Record<string, string[]> | null
	hallmarks: EmissionsHallmarks
	name: string | null
	tokenPrice: { price?: number | null; symbol?: string | null }
	unlockUsdChart: unknown[] | null
}
