import { oldBlue } from '~/constants/colors'

export interface Chain {
	gecko_id: string
	tvl: number
	tokenSymbol: string
	name: string
	chainId?: string
}

export type StoredColSpan = 0.5 | 1 | 1.5 | 2

export interface MultiChartConfig {
	id: string
	kind: 'multi'
	name?: string
	items: ChartConfig[]
	grouping?: 'day' | 'week' | 'month' | 'quarter'
	colSpan?: StoredColSpan
	showCumulative?: boolean
	showPercentage?: boolean
	showStacked?: boolean
}

export interface TextConfig {
	id: string
	kind: 'text'
	title?: string
	content: string
	colSpan?: StoredColSpan
}

export type MetricAggregator =
	| 'latest'
	| 'avg'
	| 'max'
	| 'min'
	| 'sum'
	| 'median'
	| 'stddev'
	| 'first'
	| 'growth'
	| 'movingavg'
export type MetricWindow = '7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all'

export interface MetricConfig {
	id: string
	kind: 'metric'
	subject: {
		itemType: 'chain' | 'protocol'
		chain?: string
		protocol?: string
		geckoId?: string | null
	}
	type: string
	aggregator: MetricAggregator
	window: MetricWindow
	compare?: {
		mode: 'previous_window' | 'previous_value' | 'none'
		format?: 'percent' | 'absolute'
	}
	showSparkline?: boolean
	label?: string
	format?: {
		value?: 'currency' | 'number' | 'percent' | 'auto'
		decimals?: number
		compact?: boolean
	}
	colSpan?: StoredColSpan
}

export interface ChartBuilderConfig {
	id: string
	kind: 'builder'
	name?: string
	config: {
		metric:
			| 'fees'
			| 'revenue'
			| 'volume'
			| 'perps'
			| 'options-notional'
			| 'options-premium'
			| 'bridge-aggregators'
			| 'dex-aggregators'
			| 'perps-aggregators'
			| 'user-fees'
			| 'holders-revenue'
			| 'protocol-revenue'
			| 'supply-side-revenue'
			| 'tvl'
		mode: 'chains' | 'protocol'
		filterMode?: 'include' | 'exclude'
		protocol?: string
		chains: string[]
		categories: string[]
		groupBy: 'protocol'
		limit: number
		chartType: 'stackedBar' | 'stackedArea' | 'line'
		displayAs: 'timeSeries' | 'percentage'
		hideOthers?: boolean
		groupByParent?: boolean
		additionalFilters?: Record<string, any>
	}
	grouping?: 'day' | 'week' | 'month' | 'quarter'
	colSpan?: StoredColSpan
}

export interface YieldsChartConfig {
	id: string
	kind: 'yields'
	poolConfigId: string
	poolName: string
	project: string
	chain: string
	colSpan?: StoredColSpan
}

export type DashboardItemConfig =
	| ChartConfig
	| ProtocolsTableConfig
	| MultiChartConfig
	| TextConfig
	| MetricConfig
	| ChartBuilderConfig
	| YieldsChartConfig

export interface ChartConfig {
	id: string
	kind: 'chart'
	chain: string
	protocol?: string
	type: string
	data?: [string, number][]
	isLoading?: boolean
	hasError?: boolean
	refetch?: () => void
	grouping?: 'day' | 'week' | 'month' | 'quarter'
	geckoId?: string | null
	colSpan?: StoredColSpan
	showCumulative?: boolean
}

export interface TableFilters {
	protocols?: string[]
	categories?: string[]
	excludedCategories?: string[]
	oracles?: string[]
	apyMin?: number
	apyMax?: number
	tvlMin?: number
	tvlMax?: number
	baseApyMin?: number
	baseApyMax?: number
	chains?: string[]
	hasRewards?: boolean
	stablesOnly?: boolean
	activeLending?: boolean
	poolTypes?: string[]
	[key: string]: any // Allow for future filter types
}

export interface CustomView {
	id: string
	name: string
	columnOrder: string[]
	columnVisibility: Record<string, boolean>
	customColumns?: Array<{
		id: string
		name: string
		expression: string
		isValid: boolean
		errorMessage?: string
	}>
	createdAt: number
}

export interface ProtocolsTableConfig {
	id: string
	kind: 'table'
	tableType: 'protocols' | 'dataset'
	chains: string[]
	colSpan?: StoredColSpan
	filters?: TableFilters
	columnOrder?: string[]
	columnVisibility?: Record<string, boolean>
	customColumns?: Array<{
		id: string
		name: string
		expression: string
		isValid: boolean
		errorMessage?: string
	}>
	activeViewId?: string
	datasetType?:
		| 'stablecoins'
		| 'cex'
		| 'revenue'
		| 'holders-revenue'
		| 'earnings'
		| 'fees'
		| 'token-usage'
		| 'yields'
		| 'aggregators'
		| 'perps'
		| 'options'
		| 'dexs'
		| 'bridge-aggregators'
		| 'trending-contracts'
		| 'chains'
	datasetChain?: string
	tokenSymbols?: string[]
	includeCex?: boolean
	datasetTimeframe?: string
}

export interface Protocol {
	id: string
	name: string
	logo?: string
	slug: string
	tvl: number
	geckoId?: string | null
	parentProtocol?: string | null
}

export const CHART_TYPES = {
	tvl: { id: 'tvl', title: 'TVL', chartType: 'area', color: oldBlue },
	volume: { id: 'volume', title: 'Volume', chartType: 'bar', color: '#5CCA93', groupable: true },
	fees: { id: 'fees', title: 'Fees', chartType: 'bar', color: '#F2994A', groupable: true },
	users: { id: 'users', title: 'Users', chartType: 'bar', color: '#8A2BE2', groupable: true },
	txs: { id: 'txs', title: 'Transactions', chartType: 'bar', color: '#FF6347', groupable: true },
	options: { id: 'options', title: 'Options', chartType: 'bar', color: '#F472B6', groupable: true },
	revenue: { id: 'revenue', title: 'Revenue', chartType: 'bar', color: '#E59421', groupable: true },
	incentives: { id: 'incentives', title: 'Incentives', chartType: 'bar', color: '#10B981', groupable: true },
	liquidity: { id: 'liquidity', title: 'Liquidity', chartType: 'area', color: '#0EA5E9' },
	treasury: { id: 'treasury', title: 'Treasury', chartType: 'area', color: '#64748B' },
	aggregators: {
		id: 'aggregators',
		title: 'DEX Aggregators Volume',
		chartType: 'bar',
		color: '#FF9500',
		groupable: true
	},
	perps: { id: 'perps', title: 'Perps Volume', chartType: 'bar', color: '#B91C1C', groupable: true },
	bridgeAggregators: {
		id: 'bridgeAggregators',
		title: 'Bridge Aggregators Volume',
		chartType: 'bar',
		color: '#7C2D92',
		groupable: true
	},
	perpsAggregators: {
		id: 'perpsAggregators',
		title: 'Perps Aggregators Volume',
		chartType: 'bar',
		color: '#DC2626',
		groupable: true
	},
	bribes: { id: 'bribes', title: 'Bribes Revenue', chartType: 'bar', color: '#059669', groupable: true },
	tokenTax: { id: 'tokenTax', title: 'Token Tax', chartType: 'bar', color: '#7C3AED', groupable: true },
	holdersRevenue: {
		id: 'holdersRevenue',
		title: 'Holders Revenue',
		chartType: 'bar',
		color: '#9CA3AF',
		groupable: true
	},
	openInterest: { id: 'openInterest', title: 'Open Interest', chartType: 'area', color: '#0EA5E9' },
	optionsPremium: {
		id: 'optionsPremium',
		title: 'Options Premium Volume',
		chartType: 'bar',
		color: '#F472B6',
		groupable: true
	},
	optionsNotional: {
		id: 'optionsNotional',
		title: 'Options Notional Volume',
		chartType: 'bar',
		color: '#FB7185',
		groupable: true
	},
	tokenPrice: { id: 'tokenPrice', title: 'Token Price', chartType: 'area', color: '#16A34A' },
	tokenMcap: { id: 'tokenMcap', title: 'Token Market Cap', chartType: 'area', color: '#2563EB' },
	tokenVolume: { id: 'tokenVolume', title: 'Token Volume', chartType: 'bar', color: '#F59E0B', groupable: true },
	activeUsers: { id: 'activeUsers', title: 'Active Addresses', chartType: 'bar', color: '#EC4899', groupable: true },
	newUsers: { id: 'newUsers', title: 'New Addresses', chartType: 'bar', color: '#8B5CF6', groupable: true },
	gasUsed: { id: 'gasUsed', title: 'Gas Used', chartType: 'bar', color: '#F59E0B', groupable: true },
	medianApy: { id: 'medianApy', title: 'Median APY', chartType: 'area', color: '#059669' },
	stablecoins: { id: 'stablecoins', title: 'Stablecoins', chartType: 'area', color: '#06B6D4' },
	stablecoinInflows: {
		id: 'stablecoinInflows',
		title: 'Stablecoin Inflows',
		chartType: 'bar',
		color: '#F59E0B',
		groupable: true
	},
	chainFees: { id: 'chainFees', title: 'Chain Fees', chartType: 'bar', color: '#F59E0B', groupable: true },
	chainRevenue: { id: 'chainRevenue', title: 'Chain Revenue', chartType: 'bar', color: '#F59E0B', groupable: true },
	bridgedTvl: { id: 'bridgedTvl', title: 'Bridged TVL', chartType: 'area', color: '#9333EA' },
	chainMcap: { id: 'chainMcap', title: 'Token MCap', chartType: 'area', color: '#2563EB' },
	chainPrice: { id: 'chainPrice', title: 'Token Price', chartType: 'area', color: '#16A34A' }
}

// Helper functions to extract chart types from CHART_TYPES
export const getProtocolChartTypes = (): string[] => {
	return [
		'tvl',
		'volume',
		'fees',
		'revenue',
		'incentives',
		'liquidity',
		'treasury',
		'holdersRevenue',
		'bribes',
		'tokenTax',
		'perps',
		'openInterest',
		'aggregators',
		'perpsAggregators',
		'bridgeAggregators',
		'optionsPremium',
		'optionsNotional',
		'tokenMcap',
		'tokenPrice',
		'tokenVolume',
		'medianApy'
	]
}

export const getChainChartTypes = (): string[] => {
	return [
		'tvl',
		'volume',
		'fees',
		'users',
		'txs',
		'aggregators',
		'perps',
		'bridgeAggregators',
		'perpsAggregators',
		'options',
		'revenue',
		'bribes',
		'tokenTax',
		'activeUsers',
		'newUsers',
		'gasUsed',
		'stablecoins',
		'stablecoinInflows',
		'chainFees',
		'chainRevenue',
		'bridgedTvl',
		'chainMcap',
		'chainPrice'
	]
}

export interface BaseDatasetItem {
	id: string
	name: string
	slug?: string
	logo?: string
	category?: string
	chains?: string[]
	total24h?: number
	total7d?: number
	total30d?: number
	totalAllTime?: number
	change_1d?: number
	change_7d?: number
}

export interface DexItem extends BaseDatasetItem {
	childProtocols?: Array<{
		name: string
		slug: string
		logo?: string
		chains?: string[]
		category?: string
		total24h?: number
		total7d?: number
		total30d?: number
		total1y?: number
		totalAllTime?: number
		mcap?: number | null
	}>
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AggregatorItem extends BaseDatasetItem {}

export const isMulti = (x: DashboardItemConfig): x is MultiChartConfig => x.kind === 'multi'
export const isText = (x: DashboardItemConfig): x is TextConfig => x.kind === 'text'
export const isMetric = (x: DashboardItemConfig): x is MetricConfig => x.kind === 'metric'
