import { IRaise } from '~/api/types'

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
			tvl: Array<{ date: number; totalLiquidityUSD: number }>
			tokens: Array<{ date: number; tokens: Record<string, number> }>
			tokensInUsd: Array<{ date: number; tokens: Record<string, number> }>
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
	methodologyURLs?: Record<string, string>
	methodology?: string | null
	methodologyURL?: string | null
	childMethodologies?: Array<[string, string | null, string | null]>
}

export interface IProtocolOverviewPageData {
	name: string
	symbol?: string | null
	category?: string | null
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
		ownTokens: number
		stablecoins: number
		majors: number
		others: number
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
	cards: Array<CardType>
	isCEX?: boolean
}

export interface IProtocolPageStyles {
	'--primary-color': string
	'--bg-color': string
	'--btn-bg': string
	'--btn-hover-bg': string
	'--btn-text': string
}

export type CardType =
	| 'treasury'
	| 'fees'
	| 'revenue'
	| 'holdersRevenue'
	| 'incentives'
	| 'earnings'
	| 'dexVolume'
	| 'dexAggregatorVolume'
	| 'perpVolume'
	| 'perpAggregatorVolume'
	| 'bridgeAggregatorVolume'
	| 'optionsPremiumVolume'
	| 'optionsNotionalVolume'
	| 'unlocks'
	| 'governance'
	| 'yields'

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
