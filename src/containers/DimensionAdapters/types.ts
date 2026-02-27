import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import type { IAdapterChainMetrics, IAdapterChart, IAdapterProtocolMetrics } from './api.types'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

// Chain-level adapter data with chart
export interface IAdapterChainOverview extends IAdapterChainMetrics {
	totalDataChart: IAdapterChart
}

// Single protocol adapter data with chart
export interface IAdapterProtocolOverview extends IAdapterProtocolMetrics {
	totalDataChart: IAdapterChart
}

type ApiProtocol = IAdapterChainMetrics['protocols'][0]

// Extract base fields from API protocol type
// String fields remain non-nullable (they always exist in API response)
// Numeric fields are nullable for UI layer (can be missing in aggregated data)
export type IProtocol = Pick<ApiProtocol, 'name' | 'slug' | 'logo' | 'chains'> & {
	category: ApiProtocol['category'] | null
	total24h: number | null
	total7d: number | null
	total30d: number | null
	total1y: number | null
	totalAllTime: number | null
	mcap: number | null
	bribes?: {
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		totalAllTime: number | null
	}
	tokenTax?: {
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		totalAllTime: number | null
	}
	openInterest?: number | null
	activeLiquidity?: number | null
	normalizedVolume24h?: number | null
	pfOrPs?: number | null
	methodology?: string | null
	doublecounted?: boolean
	zeroFeePerp?: boolean
	childProtocols?: Array<IProtocol>
}

export interface IAdapterByChainPageData {
	chain: string
	chains: Array<{ label: string; to: string }>
	protocols: Array<IProtocol>
	allProtocols?: string[]
	categories: Array<string>
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}` | null
	chartData: MultiSeriesChart2Dataset
	total24h: number | null
	total7d: number | null
	total30d: number | null
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	change_7dover7d: number | null
	openInterest: number | null
	entityQuestions?: string[]
	activeLiquidity: number | null
}

export interface IChainsByAdapterPageData {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}` | null
	chartData: MultiSeriesChart2Dataset
	chains: Array<{
		name: string
		logo: string
		total24h: number | null
		total7d: number | null
		total30d: number | null
		bribes?: { total24h: number | null; total7d: number | null; total30d: number | null }
		tokenTax?: { total24h: number | null; total7d: number | null; total30d: number | null }
		openInterest?: number | null
		activeLiquidity?: number | null
	}>
	allChains: Array<string>
}

export interface IChainsByREVPageData {
	chains: Array<{
		name: string
		slug: string
		logo: string
		total24h: number | null
		total30d: number | null
	}>
}
