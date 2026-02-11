import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

interface IProtocol {
	name: string
	slug: string
	logo?: string | undefined
	chains?: Array<string> | undefined
	category?: string | null | undefined
	total24h?: number | null | undefined
	total7d?: number | null | undefined
	total30d?: number | null | undefined
	total1y?: number | null | undefined
	totalAllTime?: number | null | undefined
	mcap?: number | null | undefined
	bribes?:
		| {
				total24h: number | null
				total7d: number | null
				total30d: number | null
				total1y: number | null
				totalAllTime: number | null
		  }
		| undefined
	tokenTax?:
		| {
				total24h: number | null
				total7d: number | null
				total30d: number | null
				total1y: number | null
				totalAllTime: number | null
		  }
		| undefined
	openInterest?: number | null | undefined
	activeLiquidity?: number | null | undefined
	normalizedVolume24h?: number | null | undefined
	pf?: number | null | undefined
	ps?: number | null | undefined
	methodology?: string | null | undefined
	doublecounted?: boolean | undefined
	zeroFeePerp?: boolean | undefined
	childProtocols?: Array<IProtocol> | undefined
}

interface IAdapterByChainPageProtocol extends IProtocol {}

export interface IAdapterByChainPageData {
	chain: string
	chains: Array<{ label: string; to: string }>
	protocols: Array<IAdapterByChainPageProtocol>
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
