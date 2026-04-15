import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import type { ProtocolCategoryMetrics } from './constants'

export interface IProtocolMetricTotals {
	total24h: number | null
	total7d: number | null
	total30d: number | null
}

export interface IProtocolPerpMetricTotals extends IProtocolMetricTotals {
	doublecounted?: boolean
	zeroFeePerp?: boolean
}

export interface IProtocolOpenInterestTotals extends IProtocolMetricTotals {}

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
	dexAggregatorsVolume?: IProtocolMetricTotals | null
	perpVolume?: IProtocolPerpMetricTotals | null
	perpsAggregatorsVolume?: IProtocolMetricTotals | null
	bridgeAggregatorsVolume?: IProtocolMetricTotals | null
	normalizedVolume?: IProtocolMetricTotals | null
	openInterest?: IProtocolOpenInterestTotals | null
	optionsPremiumVolume?: IProtocolMetricTotals | null
	optionsNotionalVolume?: IProtocolMetricTotals | null
	tags: Array<string>
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
	capabilities: ProtocolCategoryMetrics
	chains: Array<{ label: string; to: string }>
	chain: string
	charts: { dataset: IMultiSeriesChart2Props['dataset']; charts: NonNullable<IMultiSeriesChart2Props['charts']> }
	summaryMetrics: {
		fees?: IProtocolMetricTotals | null
		revenue?: IProtocolMetricTotals | null
		dexVolume?: IProtocolMetricTotals | null
		dexAggregatorsVolume?: IProtocolMetricTotals | null
		perpVolume?: IProtocolMetricTotals | null
		perpsAggregatorsVolume?: IProtocolMetricTotals | null
		bridgeAggregatorsVolume?: IProtocolMetricTotals | null
		normalizedVolume?: IProtocolMetricTotals | null
		openInterest?: IProtocolOpenInterestTotals | null
		optionsPremiumVolume?: IProtocolMetricTotals | null
		optionsNotionalVolume?: IProtocolMetricTotals | null
	}
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
