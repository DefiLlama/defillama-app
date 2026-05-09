import type { ProtocolChartsLabels } from './constants'

interface IBuildAvailableChartsParams {
	isCEX: boolean
	hasTvlChart: boolean
	hasTvsChart: boolean
	hasGeckoId: boolean
	hasLiquidity: boolean
	hasFees: boolean
	hasRevenue: boolean
	hasHoldersRevenue: boolean
	hasDexVolume: boolean
	hasDexNotionalVolume: boolean
	hasPerpVolume: boolean
	hasOpenInterest: boolean
	hasOptionsPremiumVolume: boolean
	hasOptionsNotionalVolume: boolean
	hasDexAggregatorVolume: boolean
	hasPerpAggregatorVolume: boolean
	hasBridgeAggregatorVolume: boolean
	hasBridgeVolume: boolean
	hasUnlocks: boolean
	hasIncentives: boolean
	hasStaking: boolean
	hasBorrowed: boolean
	hasUsdInflows: boolean
	hasTreasury: boolean
	hasMedianApy: boolean
	hasGovernance: boolean
	hasNfts: boolean
	hasActiveAddresses: boolean
	hasNewAddresses: boolean
	hasTransactions: boolean
	hasGasUsed: boolean
}

export function buildAvailableCharts(params: IBuildAvailableChartsParams): ProtocolChartsLabels[] {
	const charts: ProtocolChartsLabels[] = []
	if (params.hasTvlChart) charts.push(params.isCEX ? 'Total Assets' : 'TVL')
	if (params.hasTvsChart) charts.push('TVS')
	if (params.hasGeckoId) {
		charts.push('Mcap', 'Token Price', 'Token Volume')
		if (params.hasLiquidity) charts.push('Token Liquidity')
		charts.push('FDV')
	}
	if (params.hasFees) charts.push('Fees')
	if (params.hasRevenue) charts.push('Revenue')
	if (params.hasHoldersRevenue) charts.push('Holders Revenue')
	if (params.hasDexVolume) charts.push('DEX Volume')
	if (params.hasDexNotionalVolume) charts.push('DEX Notional Volume')
	if (params.hasPerpVolume) charts.push('Perp Volume')
	if (params.hasOpenInterest) charts.push('Open Interest')
	if (params.hasOptionsPremiumVolume) charts.push('Options Premium Volume')
	if (params.hasOptionsNotionalVolume) charts.push('Options Notional Volume')
	if (params.hasDexAggregatorVolume) charts.push('DEX Aggregator Volume')
	if (params.hasPerpAggregatorVolume) charts.push('Perp Aggregator Volume')
	if (params.hasBridgeAggregatorVolume) charts.push('Bridge Aggregator Volume')
	if (params.hasBridgeVolume) charts.push('Bridge Volume')
	if (params.hasUnlocks) charts.push('Unlocks')
	if (params.hasIncentives) charts.push('Incentives')
	if (params.hasStaking) charts.push('Staking')
	if (params.hasBorrowed) charts.push('Active Loans')
	if (params.hasUsdInflows) charts.push('USD Inflows')
	if (params.hasTreasury) charts.push('Treasury')
	if (params.hasMedianApy) charts.push('Median APY')
	if (params.hasGovernance) charts.push('Total Proposals', 'Successful Proposals', 'Max Votes')
	if (params.hasNfts) charts.push('NFT Volume')
	if (params.hasActiveAddresses) charts.push('Active Addresses')
	if (params.hasNewAddresses) charts.push('New Addresses')
	if (params.hasTransactions) charts.push('Transactions')
	if (params.hasGasUsed) charts.push('Gas Used')
	return charts
}
