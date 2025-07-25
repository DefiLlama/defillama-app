import type { IJoin2ReturnType, IOverviewProps, ProtocolAdaptorSummaryProps } from '~/api/categories/adaptors'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

export interface IProtocolContainerProps {
	protocolSummary: ProtocolAdaptorSummaryProps
	title: string
	metadata?: {
		revenue?: boolean
		bribeRevenue?: boolean
		tokenTax?: boolean
	}
}

export interface IDimensionChainChartProps {
	data: {
		total24h: IProtocolContainerProps['protocolSummary']['total24h']
		total7d: IProtocolContainerProps['protocolSummary']['total7d']
		disabled: IProtocolContainerProps['protocolSummary']['disabled']
		dailyRevenue?: IProtocolContainerProps['protocolSummary']['dailyRevenue']
		change_1d: IProtocolContainerProps['protocolSummary']['change_1d']
		change_1m?: IProtocolContainerProps['protocolSummary']['change_1m']
		change_7dover7d?: IOverviewProps['dexsDominance']
		dexsDominance?: IOverviewProps['dexsDominance']
	}
	chartData: [IJoin2ReturnType, string[]]
	name: string
	logo?: string
	isProtocolPage?: boolean
	chainsChart?: [IJoin2ReturnType, string[]]
	type?: string
	title?: string
	fullChart?: boolean
	totalAllTime?: number
	disableDefaultLeged?: boolean
	chartTypes?: string[]
	selectedType?: string
	selectedChartType?: string
}

export interface IDimenisionProtocolChartProps {
	data: {
		total24h: IProtocolContainerProps['protocolSummary']['total24h']
		total7d: IProtocolContainerProps['protocolSummary']['total7d']
		disabled: IProtocolContainerProps['protocolSummary']['disabled']
		dailyRevenue?: IProtocolContainerProps['protocolSummary']['dailyRevenue']
		dailyBribesRevenue?: IProtocolContainerProps['protocolSummary']['dailyBribesRevenue']
		dailyTokenTaxes?: IProtocolContainerProps['protocolSummary']['dailyTokenTaxes']
		totalAllTimeTokenTaxes?: IProtocolContainerProps['protocolSummary']['totalAllTimeTokenTaxes']
		totalAllTimeBribes?: IProtocolContainerProps['protocolSummary']['totalAllTimeBribes']
		change_1d: IProtocolContainerProps['protocolSummary']['change_1d']
		change_1m?: IProtocolContainerProps['protocolSummary']['change_1m']
		change_7dover7d?: IOverviewProps['dexsDominance']
		dexsDominance?: IOverviewProps['dexsDominance']
	}
	chartData: [IJoin2ReturnType, string[]]
	name: string
	logo?: string
	isProtocolPage?: boolean
	chainsChart?: [IJoin2ReturnType, string[]]
	type?: string
	title?: string
	fullChart?: boolean
	totalAllTime?: number
	disableDefaultLeged?: boolean
	chartTypes?: string[]
	selectedType?: string
	selectedChartType?: string
	linkedProtocols?: string[]
}

export type IDimensionChartTypes = 'chain' | 'version' | 'tokens'

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
	methodology?: string | null
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
}

export interface IChainsByAdapterPageData {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}` | null
	chartData: Record<string, Record<string, number>>
	chains: Array<{
		name: string
		logo: string
		total24h: number | null
		total30d: number | null
		bribes?: { total24h: number | null; total30d: number | null }
		tokenTax?: { total24h: number | null; total30d: number | null }
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
