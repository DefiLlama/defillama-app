import type {
	EmissionsDataset,
	EmissionsChartRow,
	EmissionsChartConfig,
	EmissionEvent,
	ProtocolEmission,
	TokenAllocationSplit
} from './api.types'

export interface ProtocolEmissionWithHistory extends ProtocolEmission {
	upcomingEvent?: EmissionEvent[] | null
	lastEvent?: EmissionEvent[] | null
	historicalPrice?: Array<[number, number]>
	unlockEvents?: null
	sources?: null
}

export interface ProtocolEmissionResult {
	chartData: { documented: EmissionsChartRow[]; realtime: EmissionsChartRow[] }
	pieChartData: {
		documented: Array<{ name: string; value: number | string }>
		realtime: Array<{ name: string; value: number | string }>
	}
	stackColors: { documented: Record<string, string>; realtime: Record<string, string> }
	datasets: { documented: EmissionsDataset; realtime: EmissionsDataset }
	chartsConfigs: { documented: EmissionsChartConfig; realtime: EmissionsChartConfig }
	meta: ProtocolEmission | Record<string, never>
	sources: string[]
	notes: string[]
	events: EmissionEvent[]
	token: string | null
	geckoId: string | null
	upcomingEvent: EmissionEvent[]
	tokenAllocation: { documented: TokenAllocationSplit; realtime: TokenAllocationSplit }
	futures: { openInterest?: number; fundingRate?: number }
	categories: { documented: string[]; realtime: string[] }
	categoriesBreakdown: Record<string, string[]> | null
	hallmarks: { documented: Array<[number, string]>; realtime: Array<[number, string]> }
	name: string | null
	tokenPrice: { price?: number; symbol?: string }
	unlockUsdChart: unknown[] | null
}
