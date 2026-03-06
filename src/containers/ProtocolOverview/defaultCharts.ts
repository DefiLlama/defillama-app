import { protocolCategories } from '~/containers/ProtocolsByCategoryOrTag/constants'
import { protocolCharts, type ProtocolChartsLabels } from './constants'

const isProtocolChartsLabel = (value: string): value is ProtocolChartsLabels => value in protocolCharts

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
	if (params.hasBorrowed) charts.push('Borrowed')
	if (params.hasUsdInflows) charts.push('USD Inflows')
	if (params.hasTreasury) charts.push('Treasury')
	if (params.hasMedianApy) charts.push('Median APY')
	if (params.hasGovernance) charts.push('Total Proposals', 'Successful Proposals', 'Max Votes')
	if (params.hasNfts) charts.push('NFT Volume')
	return charts
}

interface IBuildDefaultToggledChartsParams {
	isCEX: boolean
	isOracleProtocol: boolean
	protocolMetricsTvl: boolean
	protocolTvlChartData: Array<[number, number]>
	currentChainTvls?: Record<string, number>
	availableCharts: ProtocolChartsLabels[]
	category?: string | null
}

export function buildDefaultToggledCharts({
	isCEX,
	isOracleProtocol,
	protocolMetricsTvl,
	protocolTvlChartData,
	currentChainTvls,
	availableCharts,
	category
}: IBuildDefaultToggledChartsParams): ProtocolChartsLabels[] {
	const defaultToggledCharts: ProtocolChartsLabels[] = []
	const pushUniqueIfAvailable = (label: ProtocolChartsLabels) => {
		if (!availableCharts.includes(label)) return
		if (defaultToggledCharts.includes(label)) return
		defaultToggledCharts.push(label)
	}

	if (isOracleProtocol) {
		pushUniqueIfAvailable('TVS')
	}

	if (protocolMetricsTvl) {
		if (protocolTvlChartData.length === 0 || protocolTvlChartData.every(([, value]) => value === 0)) {
			const hasStaking = (currentChainTvls?.staking ?? 0) > 0
			if (hasStaking) pushUniqueIfAvailable('Staking')
			const hasBorrowed = (currentChainTvls?.borrowed ?? 0) > 0
			if (!hasStaking && hasBorrowed) pushUniqueIfAvailable('Borrowed')
		} else {
			pushUniqueIfAvailable(isCEX ? 'Total Assets' : 'TVL')
		}
	}

	const protocolCategoriesMap = protocolCategories as Record<string, { description: string; defaultChart?: string }>
	const protocolChartsMap = protocolCharts as Record<string, string>
	const categoryDefaultChart = category ? protocolCategoriesMap[category]?.defaultChart : null
	const isCategoryDefaultChartValue =
		typeof categoryDefaultChart === 'string' &&
		(Object.values(protocolCharts) as Array<string>).includes(categoryDefaultChart)

	if (
		categoryDefaultChart &&
		isCategoryDefaultChartValue &&
		availableCharts.some((chartLabel) => protocolChartsMap[chartLabel] === categoryDefaultChart)
	) {
		let defaultChartLabel = null
		for (const chartLabel in protocolCharts) {
			if (protocolChartsMap[chartLabel] === categoryDefaultChart) {
				defaultChartLabel = chartLabel
				break
			}
		}
		if (defaultChartLabel && isProtocolChartsLabel(defaultChartLabel) && availableCharts.includes(defaultChartLabel)) {
			pushUniqueIfAvailable(defaultChartLabel)
		}
	} else if (!isCEX) {
		const cannotShowAsDefault = new Set<ProtocolChartsLabels>([
			'TVL',
			'Total Assets',
			'TVS',
			'Mcap',
			'Token Price',
			'Token Volume',
			'Token Liquidity',
			'FDV',
			'Total Proposals',
			'Successful Proposals',
			'Max Votes'
		])
		const fallbackLabel = availableCharts.find((chart) => !cannotShowAsDefault.has(chart))
		if (fallbackLabel) defaultToggledCharts.push(fallbackLabel)
	}

	return defaultToggledCharts
}
