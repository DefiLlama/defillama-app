// Raw API request/response types for emissions/unlocks API endpoints

export interface EmissionEvent {
	timestamp: number
	noOfTokens: number[]
	description?: string
	category?: string
	unlockType?: string
	rateDurationDays?: number
}

interface TokenPriceSnapshot {
	symbol?: string | null
	price?: number | null
}

export interface ProtocolEmission {
	name: string
	token: string
	gecko_id?: string | null
	events?: EmissionEvent[] | null
	tokenPrice?: TokenPriceSnapshot[] | null
	unlockEvents?: unknown
	sources?: unknown
	tPrice?: number | null
	tSymbol?: string | null
	circSupply?: number | null
	maxSupply?: number | null
	totalLocked?: number | null
	mcap?: number | null
	unlocksPerDay?: number | null
}

export interface ProtocolEmissionDetail {
	name: string
	gecko_id?: string | null
	metadata?: {
		token?: string | null
		sources?: string[] | null
		notes?: string[] | null
		events?: EmissionEvent[] | null
	} | null
	documentedData?: {
		data?: Array<{
			label?: string
			data?: Array<{
				timestamp: number
				unlocked?: number | null
			}>
		}> | null
		tokenAllocation?: Record<string, number> | null
	} | null
	realTimeData?: {
		data?: Array<{
			label?: string
			data?: Array<{
				timestamp: number
				unlocked?: number | null
			}>
		}> | null
		tokenAllocation?: Record<string, number> | null
	} | null
	unlockUsdChart?: unknown[] | null
	futures?: Record<string, unknown> | null
	categories?: Record<string, string[]> | null
}

export interface EmissionSupplyMetrics {
	maxSupply: number
	adjustedSupply: number
	tbdAmount: number
	incentiveAmount: number
	nonIncentiveAmount: number
}

export interface ProtocolEmissionSupplyMetricsEntry {
	name: string
	supplyMetrics: EmissionSupplyMetrics
}

export type ProtocolEmissionSupplyMetricsMap = Record<string, ProtocolEmissionSupplyMetricsEntry>

export interface TokenAllocationSplit {
	current: Record<string, number>
	final: Record<string, number>
}

// Chart/dataset types used by both API and queries
export interface EmissionsDataset {
	source: Array<Record<string, number | null>>
	dimensions: string[]
}

export interface EmissionsChartRow {
	timestamp: number
	[label: string]: number | null
}

interface EmissionsChartConfigItem {
	type: 'line'
	name: string
	encode: { x: 'timestamp'; y: string }
	color: string | undefined
	stack: string
}

export type EmissionsChartConfig = EmissionsChartConfigItem[]
