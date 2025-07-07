import { oldBlue } from '~/constants/colors'

export const chainCharts = {
	TVL: 'tvl',
	'Stablecoins Mcap': 'stablecoinsMcap',
	'Chain Fees': 'chainFees',
	'Chain Revenue': 'chainRevenue',
	'DEXs Volume': 'dexsVolume',
	'Perps Volume': 'perpsVolume',
	'Token Incentives': 'tokenIncentives',
	'App Revenue': 'appRevenue',
	'App Fees': 'appFees',
	'Bridged TVL': 'bridgedTVL',
	'Active Addresses': 'activeAddresses',
	'New Addresses': 'newAddresses',
	Transactions: 'transactions',
	Raises: 'raises',
	'Net Inflows': 'netInflows',
	'Core Developers': 'devsMetrics',
	'Devs Commits': 'devsCommits',
	'Token Mcap': 'chainTokenMcap',
	'Token Price': 'chainTokenPrice',
	'Token Volume': 'chainTokenVolume'
} as const

export type ChainChartLabels = keyof typeof chainCharts
export const allCharts = Object.keys(chainCharts) as ChainChartLabels[]
export type ChainChartByQueryParams = typeof chainCharts[keyof typeof chainCharts]

export const yAxisByChart: {
	[K in keyof typeof chainCharts]: ChainChartLabels
} = {
	TVL: 'TVL',
	'Stablecoins Mcap': 'Stablecoins Mcap',
	'Chain Fees': 'Chain Fees',
	'Chain Revenue': 'Chain Revenue',
	'DEXs Volume': 'DEXs Volume',
	'Perps Volume': 'Perps Volume',
	'Token Incentives': 'Token Incentives',
	'App Revenue': 'App Revenue',
	'App Fees': 'App Fees',
	'Bridged TVL': 'Bridged TVL',
	'Active Addresses': 'Active Addresses',
	'New Addresses': 'New Addresses',
	Transactions: 'Transactions',
	Raises: 'Raises',
	'Net Inflows': 'Net Inflows',
	'Core Developers': 'Core Developers',
	'Devs Commits': 'Devs Commits',
	'Token Mcap': 'Token Mcap',
	'Token Price': 'Token Price',
	'Token Volume': 'Token Volume'
}

export const BAR_CHARTS: ChainChartLabels[] = [
	'Chain Fees',
	'Chain Revenue',
	'DEXs Volume',
	'Perps Volume',
	'Token Incentives',
	'App Revenue',
	'App Fees',
	'Active Addresses',
	'New Addresses',
	'Transactions',
	'Raises',
	'Net Inflows',
	'Core Developers',
	'Devs Commits',
	'Token Volume'
]

export const DISABLED_CUMULATIVE_CHARTS: ChainChartLabels[] = ['Core Developers', 'Devs Commits']

export const chainOverviewChartColors: Record<ChainChartByQueryParams, string> = {
	tvl: oldBlue,
	stablecoinsMcap: '#00a09d',
	chainFees: '#f150f4',
	chainRevenue: '#b4b625',
	dexsVolume: '#19ab17',
	perpsVolume: '#8b5cf6',
	tokenIncentives: '#ff7b00',
	appFees: '#A020F0',
	appRevenue: '#6366f1',
	bridgedTVL: '#ffb12b',
	activeAddresses: '#fa4646',
	newAddresses: '#46faf2',
	transactions: '#06b6d4',
	raises: '#7700ff',
	netInflows: '#f59e0b',
	devsMetrics: '#ff6969',
	devsCommits: '#39601f',
	chainTokenMcap: '#e11d48',
	chainTokenPrice: '#7c2d12',
	chainTokenVolume: '#0891b2'
} as const
