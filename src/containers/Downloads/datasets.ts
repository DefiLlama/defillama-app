import {
	SERVER_URL,
	V2_SERVER_URL,
	YIELDS_SERVER_URL,
	BRIDGES_SERVER_URL,
	ETF_SERVER_URL,
	STABLECOINS_SERVER_URL,
	TRADFI_API
} from '~/constants'

export interface DatasetDefinition {
	slug: string
	name: string
	description: string
	category: string
	url: string
	fields?: string[]
	defaultSortField?: string
	extractItems: (json: any) => any[]
	chainFilterType?: 'overview' | 'protocols'
}

const extractArray = (json: any): any[] => (Array.isArray(json) ? json : [])
const extractDataField = (json: any): any[] => json?.data ?? extractArray(json)
const extractProtocols = (json: any): any[] => json?.protocols ?? []

function pctChange(current: number | null | undefined, prev: number | null | undefined): number | null {
	if (current == null || prev == null || prev === 0) return null
	return ((current - prev) / prev) * 100
}

const extractLiteProtocols = (json: any): any[] => {
	const protocols: any[] = json?.protocols ?? []
	return protocols.map((p: any) => ({
		name: p.name,
		symbol: p.symbol,
		category: p.category,
		chain: p.chains?.[0] ?? null,
		chains: p.chains,
		tvl: p.tvl,
		tvlPrevDay: p.tvlPrevDay,
		tvlPrevWeek: p.tvlPrevWeek,
		tvlPrevMonth: p.tvlPrevMonth,
		change_1d: pctChange(p.tvl, p.tvlPrevDay),
		change_7d: pctChange(p.tvl, p.tvlPrevWeek),
		change_1m: pctChange(p.tvl, p.tvlPrevMonth),
		mcap: p.mcap,
		url: p.url,
		chainTvls: p.chainTvls
	}))
}

const overviewFields = [
	'name',
	'displayName',
	'category',
	'chains',
	'slug',
	'parentProtocol',
	'total24h',
	'total48hto24h',
	'total7d',
	'total14dto7d',
	'total60dto30d',
	'total30d',
	'total1y',
	'totalAllTime',
	'average1y',
	'monthlyAverage1y',
	'change_1d',
	'change_7d',
	'change_1m',
	'change_7dover7d',
	'change_30dover30d'
]

export const datasets: DatasetDefinition[] = [
	{
		slug: 'protocols',
		name: 'Protocols (TVL)',
		description: 'All protocols with current TVL, market cap, and chain breakdown',
		category: 'TVL',
		url: `${SERVER_URL}/lite/protocols2?b=2`,
		defaultSortField: 'tvl',
		chainFilterType: 'protocols',
		fields: [
			'name',
			'symbol',
			'category',
			'chain',
			'chains',
			'tvl',
			'change_1d',
			'change_7d',
			'change_1m',
			'mcap',
			'url'
		],
		extractItems: extractLiteProtocols
	},
	{
		slug: 'chains',
		name: 'Chains TVL',
		description: 'Current TVL of all chains with token symbols and chain IDs',
		category: 'TVL',
		url: `${V2_SERVER_URL}/chains`,
		defaultSortField: 'tvl',
		fields: ['name', 'tokenSymbol', 'tvl', 'chainId'],
		extractItems: extractArray
	},
	{
		slug: 'yields',
		name: 'Yield Pools',
		description: 'All yield pools with current APY, TVL, reward tokens, and pool metadata',
		category: 'Yields',
		url: `${YIELDS_SERVER_URL}/pools`,
		defaultSortField: 'tvlUsd',
		fields: [
			'chain',
			'project',
			'symbol',
			'tvlUsd',
			'apy',
			'apyBase',
			'apyReward',
			'rewardTokens',
			'pool',
			'apyPct1D',
			'apyPct7D',
			'apyPct30D',
			'stablecoin',
			'ilRisk',
			'exposure',
			'poolMeta',
			'underlyingTokens',
			'apyBase7d',
			'apyMean30d',
			'volumeUsd1d',
			'volumeUsd7d',
			'apyBaseInception'
		],
		extractItems: extractDataField
	},
	{
		slug: 'yields-borrow',
		name: 'Borrow Rates',
		description: 'Borrowing rates across lending protocols with LTV and supply/borrow data',
		category: 'Yields',
		url: `${YIELDS_SERVER_URL}/poolsBorrow`,
		defaultSortField: 'totalBorrowUsd',
		fields: [
			'chain',
			'project',
			'symbol',
			'tvlUsd',
			'apy',
			'apyBase',
			'apyReward',
			'rewardTokens',
			'pool',
			'apyPct1D',
			'apyPct7D',
			'apyPct30D',
			'stablecoin',
			'exposure',
			'poolMeta',
			'underlyingTokens',
			'apyBase7d',
			'apyMean30d',
			'apyBaseBorrow',
			'apyRewardBorrow',
			'totalSupplyUsd',
			'totalBorrowUsd',
			'debtCeilingUsd',
			'ltv',
			'borrowable',
			'mintedCoin',
			'borrowFactor'
		],
		extractItems: extractDataField
	},
	{
		slug: 'perp-funding',
		name: 'Perp Funding Rates',
		description: 'Perpetual futures funding rates, open interest, and index prices',
		category: 'Yields',
		url: `${YIELDS_SERVER_URL}/perps`,
		defaultSortField: 'openInterest',
		fields: [
			'marketplace',
			'market',
			'baseAsset',
			'fundingRate',
			'fundingRatePrevious',
			'openInterest',
			'indexPrice',
			'fundingRate7dAverage',
			'fundingRate7dSum',
			'fundingRate30dAverage',
			'fundingRate30dSum'
		],
		extractItems: extractDataField
	},
	{
		slug: 'lsd-rates',
		name: 'LSD Rates',
		description: 'Liquid staking derivative APY rates and market share data',
		category: 'Yields',
		url: `${YIELDS_SERVER_URL}/lsdRates`,
		extractItems: extractDataField
	},
	{
		slug: 'dex-volumes',
		name: 'DEX Volumes',
		description: 'Aggregated DEX trading volumes by protocol with 24h/7d changes',
		category: 'Volume',
		url: `${SERVER_URL}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'perps-volume',
		name: 'Perps Volume',
		description: 'Perpetual derivatives trading volumes by protocol',
		category: 'Volume',
		url: `${SERVER_URL}/overview/derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'options-premium-volume',
		name: 'Options Premium Volume',
		description: 'Options protocol premium volumes by protocol',
		category: 'Volume',
		url: `${SERVER_URL}/overview/options?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyPremiumVolume`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'options-notional-volume',
		name: 'Options Notional Volume',
		description: 'Options protocol notional volumes by protocol',
		category: 'Volume',
		url: `${SERVER_URL}/overview/options?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyNotionalVolume`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'open-interest',
		name: 'Open Interest',
		description: 'Open interest across perpetual derivatives protocols',
		category: 'Volume',
		url: `${SERVER_URL}/overview/open-interest?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=openInterestAtEnd`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'dex-aggregator-volume',
		name: 'DEX Aggregator Volume',
		description: 'DEX aggregator trading volumes by protocol',
		category: 'Volume',
		url: `${SERVER_URL}/overview/aggregators?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'perps-aggregator-volume',
		name: 'Perps Aggregator Volume',
		description: 'Perpetual futures aggregator volumes by protocol',
		category: 'Volume',
		url: `${SERVER_URL}/overview/aggregator-derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'bridge-aggregator-volume',
		name: 'Bridge Aggregator Volume',
		description: 'Bridge aggregator volumes by protocol',
		category: 'Volume',
		url: `${SERVER_URL}/overview/bridge-aggregators?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'fees',
		name: 'Fees',
		description: 'Protocol fees with 24h totals and daily changes',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'revenue',
		name: 'Revenue',
		description: 'Protocol revenue with 24h totals and daily changes',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'user-fees',
		name: 'User Fees',
		description: 'Fees paid by users across protocols',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyUserFees`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'holders-revenue',
		name: 'Holders Revenue',
		description: 'Revenue distributed to token holders by protocol',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyHoldersRevenue`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'protocol-revenue',
		name: 'Protocol Revenue',
		description: 'Revenue retained by protocol treasuries',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyProtocolRevenue`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'supply-side-revenue',
		name: 'Supply Side Revenue',
		description: 'Revenue earned by liquidity providers and supply-side participants',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailySupplySideRevenue`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'bribes-revenue',
		name: 'Bribes Revenue',
		description: 'Revenue from bribes and vote incentives across protocols',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyBribesRevenue`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'token-taxes',
		name: 'Token Taxes',
		description: 'Revenue from token transfer taxes across protocols',
		category: 'Fees & Revenue',
		url: `${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyTokenTaxes`,
		fields: overviewFields,
		defaultSortField: 'total24h',
		chainFilterType: 'overview',
		extractItems: extractProtocols
	},
	{
		slug: 'stablecoins',
		name: 'Stablecoins',
		description: 'All stablecoins with circulating supply, price, and chain distribution',
		category: 'Stablecoins',
		url: `${STABLECOINS_SERVER_URL}/stablecoins?includePrices=true`,
		fields: [
			'name',
			'symbol',
			'pegType',
			'pegMechanism',
			'circulating',
			'circulatingPrevDay',
			'circulatingPrevWeek',
			'circulatingPrevMonth',
			'chains',
			'price'
		],
		extractItems: (json) => json?.peggedAssets ?? extractArray(json)
	},
	{
		slug: 'hacks',
		name: 'Hacks',
		description: 'Historical exploits database with classification, technique, and amounts',
		category: 'Security',
		url: `${SERVER_URL}/hacks`,
		defaultSortField: 'amount',
		fields: [
			'date',
			'name',
			'classification',
			'technique',
			'amount',
			'chain',
			'bridgeHack',
			'targetType',
			'source',
			'returnedFunds',
			'language'
		],
		extractItems: extractArray
	},
	{
		slug: 'raises',
		name: 'Raises',
		description: 'Funding rounds database with investors, amounts, and categories',
		category: 'Fundraising',
		url: `${SERVER_URL}/raises`,
		defaultSortField: 'date',
		fields: [
			'date',
			'name',
			'round',
			'amount',
			'chains',
			'sector',
			'category',
			'categoryGroup',
			'source',
			'leadInvestors',
			'otherInvestors',
			'valuation'
		],
		extractItems: (json) => json?.raises ?? extractArray(json)
	},
	{
		slug: 'emissions',
		name: 'Token Emissions / Unlocks',
		description: 'Token unlock schedules with circulating supply and next unlock events',
		category: 'Token',
		url: `${SERVER_URL}/emissions`,
		defaultSortField: 'mcap',
		fields: [
			'name',
			'protocolSlug',
			'token',
			'circSupply',
			'circSupply30d',
			'totalLocked',
			'maxSupply',
			'mcap',
			'unlocksPerDay'
		],
		extractItems: extractArray
	},
	{
		slug: 'treasuries',
		name: 'Protocol Treasuries',
		description: 'Protocol treasury balances with token breakdowns by category',
		category: 'Treasury',
		url: `${SERVER_URL}/treasuries`,
		defaultSortField: 'tvl',
		fields: ['name', 'slug', 'chain', 'chains', 'tvl', 'change_1h', 'change_1d', 'change_7d', 'tokenBreakdowns'],
		extractItems: extractArray
	},
	{
		slug: 'etf-overview',
		name: 'ETF Overview',
		description: 'Crypto ETF data with AUM, flows, volume, and fee information',
		category: 'ETFs & DATs',
		url: `${ETF_SERVER_URL}/overview`,
		defaultSortField: 'aum',
		fields: ['ticker', 'asset', 'issuer', 'etf_name', 'custodian', 'pct_fee', 'flows', 'aum', 'volume'],
		extractItems: extractArray
	},
	{
		slug: 'etf-history',
		name: 'ETF History',
		description: 'Historical ETF flow and AUM data across all crypto ETFs',
		category: 'ETFs & DATs',
		url: `${ETF_SERVER_URL}/history`,
		defaultSortField: 'day',
		fields: ['gecko_id', 'day', 'total_flow_usd'],
		extractItems: extractArray
	},
	{
		slug: 'bridges',
		name: 'Bridges',
		description: 'All bridges with daily/weekly/monthly volume and chain data',
		category: 'Bridges',
		url: `${BRIDGES_SERVER_URL}/bridges?includeChains=true`,
		defaultSortField: 'monthlyVolume',
		fields: [
			'name',
			'displayName',
			'slug',
			'chains',
			'last24hVolume',
			'lastDailyVolume',
			'dayBeforeLastVolume',
			'weeklyVolume',
			'monthlyVolume',
			'url'
		],
		extractItems: (json) => json?.bridges ?? extractArray(json)
	},
	{
		slug: 'cex-transparency',
		name: 'CEX Transparency',
		description: 'Centralized exchange transparency data with TVL, inflows, spot/derivatives volume, and leverage',
		category: 'CEX',
		url: `${SERVER_URL}/cexs`,
		defaultSortField: 'currentTvl',
		fields: [
			'name',
			'coin',
			'coinSymbol',
			'currentTvl',
			'cleanAssetsTvl',
			'inflows_24h',
			'inflows_1w',
			'inflows_1m',
			'spotVolume',
			'oi',
			'derivVolume',
			'leverage',
			'lastAuditDate',
			'auditor'
		],
		extractItems: (json) => json?.cexs ?? extractArray(json)
	},
	{
		slug: 'dat-institutions',
		name: 'DAT Institutions',
		description: 'Digital Asset Treasury data for public companies holding crypto',
		category: 'ETFs & DATs',
		url: `${TRADFI_API}/institutions`,
		defaultSortField: 'totalUsdValue',
		fields: [
			'ticker',
			'name',
			'type',
			'price',
			'priceChange24h',
			'volume24h',
			'mcapRealized',
			'realized_mNAV',
			'totalUsdValue',
			'totalCost',
			'holdings'
		],
		extractItems: (json) => {
			const metadata = json?.institutionMetadata ?? {}
			return Object.values(metadata)
		}
	}
]

export const datasetsBySlug = new Map(datasets.map((d) => [d.slug, d]))

export const datasetCategories = [...new Set(datasets.map((d) => d.category))]
