import { primaryColor } from '~/constants/colors'

export interface Chain {
	gecko_id: string
	tvl: number
	tokenSymbol: string
	name: string
	chainId?: string
}

export interface MultiChartConfig {
	id: string
	kind: 'multi'
	name?: string
	items: ChartConfig[]
	grouping?: 'day' | 'week' | 'month'
	colSpan?: 1 | 2
}

export interface TextConfig {
	id: string
	kind: 'text'
	title?: string
	content: string
	colSpan?: 1 | 2
}

export type DashboardItemConfig = ChartConfig | ProtocolsTableConfig | MultiChartConfig | TextConfig

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
	grouping?: 'day' | 'week' | 'month'
	geckoId?: string | null
	colSpan?: 1 | 2
}

export interface TableFilters {
	protocols?: string[]
	categories?: string[]
	[key: string]: any // Allow for future filter types
}

export interface ProtocolsTableConfig {
	id: string
	kind: 'table'
	tableType: 'protocols' | 'dataset'
	chains: string[]
	colSpan?: 1 | 2
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
	datasetType?: 'stablecoins' | 'cex' | 'revenue' | 'holders-revenue' | 'earnings' | 'token-usage' | 'yields' | 'aggregators' | 'perps' | 'options' | 'dexs'
	datasetChain?: string
	tokenSymbols?: string[]
	includeCex?: boolean
}

export interface Protocol {
	id: string
	name: string
	logo?: string
	slug: string
	tvl: number
	geckoId?: string | null
}

export const CHART_TYPES = {
	tvl: { id: 'tvl', title: 'TVL', chartType: 'area', color: primaryColor },
	volume: { id: 'volume', title: 'Volume', chartType: 'bar', color: '#5CCA93', groupable: true },
	fees: { id: 'fees', title: 'Fees', chartType: 'bar', color: '#F2994A', groupable: true },
	users: { id: 'users', title: 'Users', chartType: 'bar', color: '#8A2BE2', groupable: true },
	txs: { id: 'txs', title: 'Transactions', chartType: 'bar', color: '#FF6347', groupable: true },
	options: { id: 'options', title: 'Options', chartType: 'bar', color: '#F472B6', groupable: true },
	revenue: { id: 'revenue', title: 'Revenue', chartType: 'bar', color: '#E59421', groupable: true },
	aggregators: { id: 'aggregators', title: 'DEX Aggregators', chartType: 'bar', color: '#FF9500', groupable: true },
	perps: { id: 'perps', title: 'Perps', chartType: 'bar', color: '#B91C1C', groupable: true },
	bridgeAggregators: {
		id: 'bridgeAggregators',
		title: 'Bridge Aggregators',
		chartType: 'bar',
		color: '#7C2D92',
		groupable: true
	},
	perpsAggregators: {
		id: 'perpsAggregators',
		title: 'Perps Aggregators',
		chartType: 'bar',
		color: '#DC2626',
		groupable: true
	},
	bribes: { id: 'bribes', title: 'Bribes Revenue', chartType: 'bar', color: '#059669', groupable: true },
	tokenTax: { id: 'tokenTax', title: 'Token Tax', chartType: 'bar', color: '#7C3AED', groupable: true },
	tokenPrice: { id: 'tokenPrice', title: 'Token Price', chartType: 'area', color: '#16A34A' },
	tokenMcap: { id: 'tokenMcap', title: 'Token Market Cap', chartType: 'area', color: '#2563EB' },
	tokenVolume: { id: 'tokenVolume', title: 'Token Volume', chartType: 'bar', color: '#F59E0B', groupable: true },
	activeUsers: { id: 'activeUsers', title: 'Active Users', chartType: 'bar', color: '#EC4899', groupable: true },
	newUsers: { id: 'newUsers', title: 'New Users', chartType: 'bar', color: '#8B5CF6', groupable: true },
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
	bridgedTvl: { id: 'bridgedTvl', title: 'Bridged TVL', chartType: 'area', color: '#9333EA' }
}

// Helper functions to extract chart types from CHART_TYPES
export const getProtocolChartTypes = (): string[] => {
	return ['tvl', 'volume', 'fees', 'revenue', 'tokenMcap', 'tokenPrice', 'tokenVolume', 'medianApy']
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
		'bridgedTvl'
	]
}

export const isMulti = (x: DashboardItemConfig): x is MultiChartConfig => x.kind === 'multi'
export const isText = (x: DashboardItemConfig): x is TextConfig => x.kind === 'text'
