import type { IHackApiItem } from '../Hacks/api.types'
import type { IProtocolMetricsV2, IRaise } from './api.types'
import { protocolCharts, type ProtocolChartsLabels } from './constants'

export interface IProtocolPageMetrics {
	tvl: boolean
	dexs: boolean
	perps: boolean
	openInterest: boolean
	optionsPremiumVolume: boolean
	optionsNotionalVolume: boolean
	dexAggregators: boolean
	perpsAggregators: boolean
	bridgeAggregators: boolean
	stablecoins: boolean
	bridge: boolean
	treasury: boolean
	unlocks: boolean
	incentives: boolean
	yields: boolean
	fees: boolean
	revenue: boolean
	bribes: boolean
	tokenTax: boolean
	forks: boolean
	governance: boolean
	nfts: boolean
	dev: boolean
	inflows: boolean
	liquidity: boolean
	activeUsers: boolean
	borrowed: boolean
	tokenRights: boolean
}

interface IAdapterOverview {
	total24h: number | null
	total7d: number | null
	total30d: number | null
	totalAllTime: number | null
	methodology?: string | null
	methodologyURL?: string | null
	breakdownMethodology?: Record<string, string> | null
	childMethodologies?: Array<[string, string | null, string | null]>
	defaultChartView?: 'daily' | 'weekly' | 'monthly'
}

export interface IProtocolOverviewPageData {
	tvlChartData: Array<[string, number]>
	id: string
	name: string
	token: {
		symbol: string | null
		gecko_id: string | null
		gecko_url: string | null
		explorer_url: string | null
	}
	category?: string | null
	tags?: Array<string> | null
	otherProtocols?: Array<string> | null
	deprecated?: boolean
	chains: Array<string> | null
	currentTvlByChain: Record<string, number> | null
	description?: string
	website?: string | null
	twitter?: string | null
	safeHarbor?: boolean
	methodology?: string | null
	methodologyURL?: string | null
	github?: Array<string> | null
	metrics: IProtocolPageMetrics
	fees: IAdapterOverview | null
	revenue: IAdapterOverview | null
	holdersRevenue: IAdapterOverview | null
	bribeRevenue: IAdapterOverview | null
	tokenTax: IAdapterOverview | null
	dexVolume: IAdapterOverview | null
	dexAggregatorVolume: IAdapterOverview | null
	perpVolume: IAdapterOverview | null
	openInterest: IAdapterOverview | null
	perpAggregatorVolume: IAdapterOverview | null
	bridgeAggregatorVolume: IAdapterOverview | null
	optionsPremiumVolume: IAdapterOverview | null
	optionsNotionalVolume: IAdapterOverview | null
	bridgeVolume: Array<{ date: string; depositUSD: number; withdrawUSD: number }> | null
	incentives?: {
		emissions24h: number
		emissions7d: number
		emissions30d: number
		emissionsAllTime: number
		emissionsMonthlyAverage1y: number
		methodology?: string
	} | null
	treasury: {
		ownTokens: number | null
		stablecoins: number | null
		majors: number | null
		others: number | null
		total: number | null
	} | null
	unlocks: {
		recent?: { timestamp: number; amount: number }
		upcoming?: { timestamp: number; amount: number }
	} | null
	yields: { noOfPoolsTracked: number | null; averageAPY: number | null } | null
	governance: {
		lastProposal: {
			title: string
			status: string
		}
	} | null
	articles: IArticle[] | null
	users?: {
		activeUsers: number | null
		newUsers: number | null
		transactions: number | null
		gasUsd: number | null
	} | null
	raises: Array<IRaise> | null
	expenses: {
		headcount: number | null
		total: number | null
		annualUsdCost: Array<[string, number]>
		sources?: Array<string> | null
		notes?: Array<string> | null
		lastUpdate?: string | null
	} | null
	tokenLiquidity: {
		pools: Array<[string, string, number]>
		total: number
	} | null
	tokenCGData?: {
		price: {
			current: number | null
			ath: number | null
			athDate: number | null
			atl: number | null
			atlDate: number | null
		}
		marketCap: { current: number | null }
		totalSupply: number | null
		fdv: { current: number | null }
		volume24h: {
			total: number | null
			cex: number | null
			dex: number | null
		}
		symbol: string | null
	} | null
	outstandingFDV: number | null
	audits: {
		total: number
		auditLinks: Array<string>
		note: string | null
	} | null
	isCEX?: boolean
	hasKeyMetrics?: boolean
	competitors?: Array<{ name: string; tvl: number }>
	hacks: Array<IHackApiItem>
	chartDenominations: Array<{ symbol: string; geckoId?: string | null }>
	chartColors: Record<string, string>
	availableCharts: ProtocolChartsLabels[]
	hallmarks: Array<[number, string]>
	rangeHallmarks: Array<[[number, number], string]>
	geckoId: string | null
	governanceApis: Array<string> | null
	incomeStatement?: {
		data: Record<
			'monthly' | 'quarterly' | 'yearly',
			Record<string, Record<string, { value: number; 'by-label': Record<string, number> }>> & { timestamp?: number }
		>
		labelsByType: Record<string, Array<string>>
		methodology: Record<string, string>
		breakdownMethodology: Record<string, Record<string, string>>
		hasOtherTokenHolderFlows: boolean
	} | null
	openSmolStatsSummaryByDefault?: boolean
	warningBanners?: IProtocolMetricsV2['warningBanners']
	defaultChartView?: 'daily' | 'weekly' | 'monthly'
	seoDescription: string
	seoKeywords: string
	defaultToggledCharts: ProtocolChartsLabels[]
	oracleTvs?: Record<string, number> | null
	entityQuestions?: string[]
}

interface ICredit {
	by: string
}

interface IContentElement {
	subheadlines: { basic: string }
	type: string
	promo_items: { basic: { url: string } }
	canonical_url: string
	display_date: string
	credits: ICredit[]
	headlines: { basic: string }
	taxonomy?: {
		tags?: {
			description: string
			text: string
			slug: string
		}[]
	}
}

export interface IArticlesResponse {
	type: string
	version: string
	content_elements: IContentElement[]
}

export interface IArticle {
	headline: string
	date: string
	href: string
	imgSrc: string | null
}

// date in the chart is in ms
export interface IDenominationPriceHistory {
	prices: Array<[number, number]>
	mcaps: Array<[number, number]>
	volumes: Array<[number, number]>
}

export interface IToggledMetrics extends Record<
	(typeof protocolCharts)[keyof typeof protocolCharts],
	'true' | 'false'
> {
	events: 'true' | 'false'
	denomination: string | null
}
