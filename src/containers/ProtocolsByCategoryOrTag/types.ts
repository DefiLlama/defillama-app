import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'

export interface IRWAStats {
	volumeUsd1d: number
	volumeUsd7d: number
	tvlUsd: number
	symbols: Array<string>
	matchExact?: boolean
	redeemable?: boolean
	attestations?: boolean
	cexListed?: boolean
	kyc?: boolean
	transferable?: boolean
	selfCustody?: boolean
}

interface IProtocolMetricTotals {
	total24h: number | null
	total7d: number | null
	total30d: number | null
}

interface IProtocolPerpMetricTotals extends IProtocolMetricTotals {
	doublecounted?: boolean
	zeroFeePerp?: boolean
}

interface IProtocolOpenInterestTotals {
	total24h: number | null
}

interface IProtocolByCategory {
	name: string
	slug: string
	logo: string
	chains: Array<string>
	tvl: number | null
	extraTvls: Record<string, number>
	mcap: number | null
	fees?: IProtocolMetricTotals | null
	revenue?: IProtocolMetricTotals | null
	dexVolume?: IProtocolMetricTotals | null
	perpVolume?: IProtocolPerpMetricTotals | null
	openInterest?: IProtocolOpenInterestTotals | null
	optionsPremium?: IProtocolMetricTotals | null
	optionsNotional?: IProtocolMetricTotals | null
	tags: Array<string>
	rwaStats?: IRWAStats | null
	borrowed?: number | null
	supplied?: number | null
	suppliedTvl?: number | null
}

interface IProtocolByCategoryWithSubRows extends IProtocolByCategory {
	subRows?: IProtocolByCategory[]
}

export interface IProtocolByCategoryOrTagPageData {
	protocols: Array<IProtocolByCategoryWithSubRows>
	category: string | null
	tag: string | null
	effectiveCategory: string | null
	chains: Array<{ label: string; to: string }>
	chain: string
	charts: { dataset: IMultiSeriesChart2Props['dataset']; charts: NonNullable<IMultiSeriesChart2Props['charts']> }
	fees7d: number | null
	revenue7d: number | null
	dexVolume7d: number | null
	perpVolume7d: number | null
	openInterest: number | null
	optionsPremium7d: number | null
	optionsNotional7d: number | null
	extraTvlCharts: Record<string, Record<string | number, number | null>>
}

export interface IProtocolsCategoriesExtraTvlPoint {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
}

export interface IProtocolsCategoriesTableRow {
	name: string
	protocols: number
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	revenue: number
	extraTvls: Record<string, IProtocolsCategoriesExtraTvlPoint>
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	description: string
	subRows?: Array<IProtocolsCategoriesTableRow>
}

export type IProtocolsCategoriesChartRow = Record<string, number | null> & { timestamp: number }

export interface IProtocolsCategoriesPageData {
	categories: Array<string>
	tableData: Array<IProtocolsCategoriesTableRow>
	chartSource: Array<IProtocolsCategoriesChartRow>
	categoryColors: Record<string, string>
	extraTvlCharts: Record<string, Record<string, Record<number, number>>>
}
