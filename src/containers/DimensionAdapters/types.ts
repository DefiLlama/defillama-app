import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

interface IProtocol {
	name: string
	slug: string
	logo: string
	chains: Array<string>
	category: string | null
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
	pf?: number | null
	ps?: number | null
	methodology?: string | null
	doublecounted?: boolean
	zeroFeePerp?: boolean
}

interface IAdapterByChainPageProtocol extends IProtocol {
	childProtocols?: Array<IProtocol>
}

export interface IAdapterByChainPageData {
	chain: string
	chains: Array<{ label: string; to: string }>
	protocols: Array<IAdapterByChainPageProtocol>
	categories: Array<string>
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}` | null
	chartData: Array<[number, number]>
	total24h: number | null
	total7d: number | null
	total30d: number | null
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	change_7dover7d: number | null
	openInterest: number | null
}

export interface IChainsByAdapterPageData {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}` | null
	chartData: Array<[number, Record<string, number>]>
	chains: Array<{
		name: string
		logo: string
		total24h: number | null
		total30d: number | null
		bribes?: { total24h: number | null; total30d: number | null }
		tokenTax?: { total24h: number | null; total30d: number | null }
		openInterest?: number | null
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
