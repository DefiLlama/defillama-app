import type { IIcon } from '~/components/Icon'

export interface Capability {
	key: string
	name: string
	icon: IIcon['name']
	description: string
	prompts: string[]
	badge?: string
}

export const CAPABILITIES: Capability[] = [
	{
		key: 'price_forecast',
		name: 'Price Forecast',
		icon: 'trending-up',
		description: 'Run Monte Carlo simulations, momentum signals, and prediction market analysis.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'wallet_xray',
		name: 'Wallet X-Ray',
		icon: 'wallet',
		description: 'Analyze wallet holdings, track whale movements, and decode transaction history.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'onchain',
		name: 'On-Chain',
		icon: 'chain',
		description: 'Explore on-chain activity, TVL flows, chain comparisons, and protocol metrics.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'trade_thesis',
		name: 'Trade Thesis',
		icon: 'activity',
		description: 'Build and validate investment theses with fundamental and valuation analysis.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'alerts',
		name: 'Alerts',
		icon: 'calendar-plus',
		badge: 'NEW',
		description: 'Set up daily or weekly scheduled reports delivered to your email.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'governance',
		name: 'Governance',
		icon: 'graduation-cap',
		description: 'Track DAO proposals, voting data, fee switches, and governance activity.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'yields',
		name: 'Yields',
		icon: 'percent',
		description: 'Discover the best yields, build strategies, and compare lending rates across protocols.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'research',
		name: 'Research',
		icon: 'sparkles',
		description: 'Run multi-agent deep research with web search, producing in-depth reports.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'risk',
		name: 'Risk',
		icon: 'alert-triangle',
		description: 'Analyze protocol risks, token unlock schedules, and smart contract vulnerabilities.',
		prompts: ['Q1', 'Q2', 'Q3']
	},
	{
		key: 'charts',
		name: 'Charts',
		icon: 'bar-chart-2',
		description: 'Generate interactive charts, candlestick patterns with indicators, and visual comparisons.',
		prompts: ['Q1', 'Q2', 'Q3']
	}
]
