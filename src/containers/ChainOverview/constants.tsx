import { CHART_COLORS } from '~/constants/colors'

// MAKE SURE TO UPDATE ON SERVER TOO https://github.com/DefiLlama/defillama-server/blob/master/defi/src/updateSearch.ts
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
export type ChainChartByQueryParams = (typeof chainCharts)[keyof typeof chainCharts]

export const yAxisByChart: {
	[K in keyof typeof chainCharts]: ChainChartLabels
} = {
	TVL: 'TVL',
	'Stablecoins Mcap': 'Stablecoins Mcap',
	'Chain Fees': 'Chain Fees',
	'Chain Revenue': 'Chain Fees',
	'DEXs Volume': 'DEXs Volume',
	'Perps Volume': 'Perps Volume',
	'Token Incentives': 'Token Incentives',
	'App Revenue': 'Chain Fees',
	'App Fees': 'Chain Fees',
	'Bridged TVL': 'Bridged TVL',
	'Active Addresses': 'Active Addresses',
	'New Addresses': 'Active Addresses',
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

export const chainOverviewChartColors = Object.fromEntries(
	Object.keys(chainCharts).map((chart, index) => [chart as ChainChartLabels, CHART_COLORS[index]])
) as {
	[K in keyof typeof chainCharts]: string
}
