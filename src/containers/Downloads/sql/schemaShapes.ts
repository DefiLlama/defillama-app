export type ColumnShape = readonly string[] | 'dynamic'

export const CHART_COLUMN_SHAPES: Record<string, ColumnShape> = {
	'bridge-volume-chart': ['date', 'depositUSD', 'withdrawUSD', 'depositTxs', 'withdrawTxs'],
	'yield-pool-chart': ['date', 'tvlUsd', 'apy', 'apyBase', 'apyReward'],
	'stablecoin-mcap-chart': ['date', 'circulating'],
	'stablecoin-chain-mcap-chart': ['date', 'totalCirculatingUSD'],
	'cex-inflows-chart': ['date', 'inflow'],
	'rwa-category-chart': 'dynamic',
	'chain-tvl-chart': 'dynamic',
	'category-tvl-chart': 'dynamic'
}

export function columnShapeFor(slug: string): ColumnShape {
	return CHART_COLUMN_SHAPES[slug] ?? ['date', 'value']
}
