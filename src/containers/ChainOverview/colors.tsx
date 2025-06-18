import { transparentize } from 'polished'
import { oldBlue } from '~/constants/colors'

export const chainOverviewChartColors = {
	tvl: oldBlue,
	dexs: '#19ab17',
	chainFees: '#f150f4',
	chainRevenue: '#b4b625',
	price: '#da1f73',
	returningUsers: '#fa4646',
	newUsers: '#46faf2',
	raises: '#7700ff',
	stablecoins: '#00a09d',
	transactions: '#307622',
	bridges: '#ffb12b',
	developers: '#ff6969',
	devsCommits: '#39601f',
	tokenPrice: '#c7da1f',
	tokenMcap: '#1fda38',
	perps: '#305a00',
	aggregators: '#ff7b00',
	chainAssets: '#fa7b00',
	tokenVolume: '#ff008c',
	appRevenue: '#A020F0',
	appFees: '#FF4500',
	addresses: '#FF9800',
	txs: '#2d4a8c',
	stables: '#8c2d4a',
	inflows: '#4a8c2d',
	chainIncentives: '#8c4a2d',
	chainTokenPrice: '#2d8c4a',
	chainTokenMcap: '#4a2d8c',
	chainTokenVolume: '#8c2d8c'
} as const

export const chainOverviewChartSwitchColors = Object.fromEntries(
	Object.entries(chainOverviewChartColors).map(([key, value]) => [
		key,
		{
			'--primary-color': value,
			'--btn-bg': transparentize(0.9, value),
			'--btn-hover-bg': transparentize(0.8, value)
		}
	])
)
