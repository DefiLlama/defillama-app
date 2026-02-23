import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import type { IAdapterChainOverview } from '~/containers/DimensionAdapters/types'

export interface ChainIncentivesSummary {
	emissions24h: number | null
	emissions7d: number | null
	emissions30d: number | null
}

export interface ProtocolIncentivesSummary extends ChainIncentivesSummary {
	emissionsAllTime: number | null
	emissionsMonthlyAverage1y: number | null
	methodology: string
}

export interface ProtocolEmissionsLookupEntry {
	emissions24h: number | null
	emissions7d: number | null
	emissions30d: number | null
	emissions1y: number | null
	emissionsMonthlyAverage1y: number | null
	emissionsAllTime: number | null
	name: string
}

export type ProtocolEmissionsLookup = Record<string, ProtocolEmissionsLookupEntry>

export interface DimensionEarningsEmissionMatch {
	defillamaId: string
	name: string
	linked?: string[]
	emission24h?: number
	emission7d?: number
	emission30d?: number
	emission1y?: number
	emissionAllTime?: number
}

export type DimensionEarningsOverviewBase = IAdapterChainMetrics
export type DimensionEarningsProtocol = IAdapterChainMetrics['protocols'][0]
export type DimensionEarningsProtocolWithEmissions = DimensionEarningsProtocol & {
	_emissions?: DimensionEarningsEmissionMatch
}

export interface DimensionEarningsOverview extends Omit<IAdapterChainOverview, 'protocols'> {
	protocols: DimensionEarningsProtocolWithEmissions[]
}
