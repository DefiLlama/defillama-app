import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { ProtocolChartsLabels } from './Chart/constants'

export interface IProtocolMetadata {
	name?: string
	tvl?: boolean
	yields?: boolean
	forks?: boolean
	liquidity?: boolean
	raises?: boolean
	fees?: boolean
	revenue?: boolean
	holdersRevenue?: boolean
	dexs?: boolean
	perps?: boolean
	aggregator?: boolean
	options?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
	displayName?: string
	chains?: Array<string>
	hacks?: boolean
	activeUsers?: boolean
	governance?: boolean
	expenses?: boolean
	treasury?: boolean
	nfts?: boolean
	emissions?: boolean
	bribeRevenue?: boolean
	tokenTax?: boolean
}

export interface IProtocolPageMetrics {
	tvl: boolean
	dexs: boolean
	perps: boolean
	options: boolean
	dexAggregators: boolean
	perpsAggregators: boolean
	bridgeAggregators: boolean
	stablecoins: boolean
	bridge: boolean
	treasury: boolean
	unlocks: boolean
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
}

export interface IUpdatedProtocol {
	id: string
	name: string
	address?: string | null
	symbol?: string | null
	url: string
	referralUrl?: string | null
	description: string
	chain: string
	logo: string
	audits: string | null
	audit_note: string | null
	gecko_id: string | null
	cmcId: string | null
	category: string
	tags?: Array<string> | null
	chains: Array<string>
	module: string
	treasury?: string | null
	twitter: string
	audit_links: Array<string>
	openSource?: boolean
	forkedFrom: Array<string>
	oraclesByChain: Record<string, Array<string>>
	parentProtocol?: string
	governanceID?: Array<string>
	github?: Array<string>
	chainTvls?: Record<
		string,
		{
			tvl?: Array<{ date: number; totalLiquidityUSD: number }> | null
			tokens?: Array<{ date: number; tokens: Record<string, number> }> | null
			tokensInUsd?: Array<{ date: number; tokens: Record<string, number> }> | null
		}
	>
	currentChainTvls?: Record<string, number>
	isParentProtocol?: boolean
	mcap: number | null
	methodology?: string
	raises: Array<IRaise>
	otherProtocols?: Array<string>
	hallmarks?: Array<[number, string]>
	stablecoins?: Array<string>
	misrepresentedTokens?: boolean
	deprecated?: boolean
}

interface IAdapterOverview {
	total24h: number | null
	total30d: number | null
	totalAllTime: number | null
	methodology?: string | null
	methodologyURL?: string | null
	childMethodologies?: Array<[string, string | null, string | null]>
}

export interface IProtocolOverviewPageData {
	tvlChartData: Array<[number, number]>
	extraTvlCharts: Record<string, Record<number, number>>
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
	methodology?: string | null
	methodologyURL?: string | null
	github?: Array<string> | null
	pageStyles: IProtocolPageStyles
	metrics: IProtocolPageMetrics
	fees: IAdapterOverview | null
	revenue: IAdapterOverview | null
	holdersRevenue: IAdapterOverview | null
	bribeRevenue: IAdapterOverview | null
	tokenTax: IAdapterOverview | null
	dexVolume: IAdapterOverview | null
	dexAggregatorVolume: IAdapterOverview | null
	perpVolume: IAdapterOverview | null
	perpAggregatorVolume: IAdapterOverview | null
	bridgeAggregatorVolume: IAdapterOverview | null
	optionsPremiumVolume: IAdapterOverview | null
	optionsNotionalVolume: IAdapterOverview | null
	incentives?: {
		emissions24h: number
		emissions7d: number
		emissions30d: number
		emissionsAllTime: number
		average1y: number
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
	devMetrics?: {
		weeklyCommits: number | null
		monthlyCommits: number | null
		weeklyDevelopers: number | null
		monthlyDevelopers: number | null
		lastCommit: number | null
		updatedAt: number | null
	} | null
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
	audits: {
		total: number
		auditLinks: Array<string>
		note: string | null
	} | null
	isCEX?: boolean
	hasKeyMetrics?: boolean
	competitors?: Array<{ name: string; tvl: number }>
	hacks: Array<IHack>
	chartDenominations: Array<{ symbol: string; geckoId?: string | null }>
	chartColors: Record<string, string>
	availableCharts: ProtocolChartsLabels[]
}

export interface IHack {
	date: number
	name: string
	classification: string
	technique: string
	amount: number
	chain: Array<string>
	bridgeHack: boolean
	targetType: string
	source: string
	returnedFunds: number | null
	defillamaId: number
	parentProtocolId: string
	language: string | null
}

export interface IProtocolPageStyles {
	'--primary-color': string
	'--bg-color': string
	'--btn-bg': string
	'--btn-hover-bg': string
	'--btn-text': string
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

export interface IRaise {
	round: string
	amount: number
	valuation: string
	source: string
	date: number
	defillamaId: string
	leadInvestors?: Array<string>
	otherInvestors?: Array<string>
	investors?: Array<string>
}

export interface IProtocolExpenses {
	protocolId: string
	headcount: number
	annualUsdCost: Record<string, number>
	sources?: Array<string> | null
	notes?: Array<string> | null
	lastUpdate?: string | null
}
