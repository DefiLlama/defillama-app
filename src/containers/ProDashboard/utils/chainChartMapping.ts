import { ChainChartLabels } from '~/containers/ChainOverview/constants'

export const CHAIN_TO_DASHBOARD_CHART_TYPE: Record<ChainChartLabels, string | null> = {
	TVL: 'tvl',
	'Stablecoins Mcap': 'stablecoins',
	'Chain Fees': 'chainFees',
	'Chain Revenue': 'chainRevenue',
	'DEXs Volume': 'volume',
	'Perps Volume': 'perps',
	'Token Incentives': null,
	'App Revenue': 'revenue',
	'App Fees': 'fees',
	'Bridged TVL': 'bridgedTvl',
	'Active Addresses': 'activeUsers',
	'New Addresses': 'newUsers',
	Transactions: 'txs',
	Raises: null,
	'Net Inflows': 'stablecoinInflows',
	'Core Developers': null,
	'Devs Commits': null,
	'Token Mcap': 'chainMcap',
	'Token Price': 'chainPrice',
	'Token Volume': null
}

export function getSupportedChainCharts(labels: ChainChartLabels[]) {
	return labels
		.map((label) => ({ label, dashboardType: CHAIN_TO_DASHBOARD_CHART_TYPE[label] }))
		.filter((x): x is { label: ChainChartLabels; dashboardType: string } => x.dashboardType !== null)
}

export function getUnsupportedChainCharts(labels: ChainChartLabels[]): ChainChartLabels[] {
	return labels.filter((label) => CHAIN_TO_DASHBOARD_CHART_TYPE[label] === null)
}
