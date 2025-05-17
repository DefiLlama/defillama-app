import type { IJoin2ReturnType, IOverviewProps, ProtocolAdaptorSummaryProps } from '~/api/categories/adaptors'

export interface IProtocolContainerProps {
	protocolSummary: ProtocolAdaptorSummaryProps
	title: string
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
