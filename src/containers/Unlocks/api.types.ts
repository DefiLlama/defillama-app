// Raw API request/response types for emissions/unlocks API endpoints

export interface EmissionEvent {
	timestamp: number
	noOfTokens: number[]
	description?: string
	category?: string
}

export interface ProtocolEmission {
	name: string
	token: string
	gecko_id?: string | null
	events?: EmissionEvent[] | null
	unlockEvents?: unknown
	sources?: unknown
	tPrice?: number | null
	tSymbol?: string | null
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
	categories?: Record<string, string> | null
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

export interface EmissionsChartConfigItem {
	type: 'line'
	name: string
	encode: { x: 'timestamp'; y: string }
	color: string | undefined
	stack: string
}

export type EmissionsChartConfig = EmissionsChartConfigItem[]
