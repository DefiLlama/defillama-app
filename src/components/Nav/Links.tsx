import { ReactNode } from 'react'
import {
	PieChart,
	Droplet,
	BarChart,
	DollarSign,
	Percent,
	BarChart2,
	Book,
	ShieldOff,
	Search,
	BookOpen,
	Repeat,
	Layers,
	Unlock,
	Image as ImageIcon,
	Shuffle,
	FileText
} from 'react-feather'

export interface IMainLink {
	name: string
	path: string
	newTag?: boolean
}

interface IFooterLink {
	name: string
	path: string
	external?: boolean
	newTag?: boolean
	referrer?: boolean
}

interface IButtonLink {
	name: string
	onClick: () => void
}

interface ILinks {
	[key: string]: {
		main: Array<IMainLink>
		tools: Array<IFooterLink | IButtonLink>
		footer: Array<IFooterLink | IButtonLink>
		icon: ReactNode
		newTag?: boolean
	}
}

const defaultToolsAndFooterLinks = {
	tools: [
		{
			name: 'DefiLlama Extension',
			path: 'https://chrome.google.com/webstore/detail/defillama/phgiabfbjodhgckcffppiboooeiecgeg',
			external: true
		},
		{
			name: 'LlamaNodes',
			path: 'https://llamanodes.com/',
			external: true,
			referrer: true
		},
		{
			name: 'LlamaFolio',
			path: 'https://llamafolio.com/',
			external: true,
			referrer: true
		},
		{
			name: 'DL News',
			path: 'https://dlnews.com/',
			external: true,
			referrer: true
		},
		{
			name: 'Llama U',
			path: 'https://www.dlnews.com/articles/llama-u',
			external: true,
			referrer: true
		},
		{ name: 'Watchlist', path: '/watchlist' },
		{ name: 'Directory', path: '/directory' },
		{
			name: 'Roundup',
			path: '/roundup'
		},
		{ name: 'Trending Contracts', path: '/trending-contracts' },
		{
			name: 'Token Liquidity',
			path: '/liquidity',
			external: true
		},
		{ name: 'Correlation', path: '/correlation', newTag: true },
		{
			name: 'Wiki',
			path: 'https://wiki.defillama.com/wiki/Main_Page',
			external: true
		},
		{
			name: 'Press / Media',
			path: '/press'
		},
		{
			name: 'API Docs',
			path: '/docs/api'
		},
		{
			name: 'List Your Project',
			path: 'https://docs.llama.fi/list-your-project/submit-a-project',
			external: true
		}
	],
	footer: [
		{
			name: 'Reports',
			path: '/reports',
			newTag: true
		},
		{ name: 'About / Contact', path: '/about' },
		{
			name: 'Twitter',
			path: 'https://twitter.com/DefiLlama',
			external: true
		},
		{
			name: 'Discord',
			path: 'https://discord.defillama.com',
			external: true
		},
		{
			name: 'Donate',
			path: '/donations'
		}
	]
}

export const navLinks: ILinks = {
	DeFi: {
		main: [
			{ name: 'Overview', path: '/' },
			{ name: 'Chains', path: '/chains' },
			{ name: 'Compare Chains', path: '/compare?chains=Optimism&chains=Arbitrum' },
			{ name: 'Airdrops', path: '/airdrops' },
			{ name: 'Treasuries', path: '/treasuries', newTag: true },
			{ name: 'Oracles', path: '/oracles' },
			{ name: 'Forks', path: '/forks' },
			{ name: 'Top Protocols', path: '/top-protocols' },
			{ name: 'Comparison', path: '/comparison?protocol=MakerDAO&protocol=Curve+DEX' },
			{ name: 'Protocol Expenses', path: '/expenses', newTag: true },
			{ name: 'Token Usage', path: '/tokenUsage?token=ETH' },
			{ name: 'Categories', path: '/categories' },
			{ name: 'Recent', path: '/recent' },
			{ name: 'Languages', path: '/languages' }
		],
		...defaultToolsAndFooterLinks,
		icon: <BarChart2 size={16} />
	},
	Yields: {
		main: [
			{ name: 'Pools', path: '/yields' },
			{ name: 'Delta Neutral', path: '/yields/strategy' },
			{ name: 'Long-Short Strats', path: '/yields/strategyLongShort' },
			{ name: 'Leveraged Lending', path: '/yields/loop' },
			{ name: 'Overview', path: '/yields/overview' },
			{ name: 'Stablecoin Pools', path: '/yields/stablecoins' },
			{ name: 'Projects', path: '/yields/projects' },
			{ name: 'Halal', path: '/yields/halal' }
		],
		tools: [
			{ name: 'Watchlist', path: '/yields/watchlist' },
			{ name: 'Directory', path: '/directory' },
			{
				name: 'Roundup',
				path: '/roundup'
			},
			{ name: 'Trending Contracts', path: '/trending-contracts', newTag: true },
			{
				name: 'Token Liquidity',
				path: '/liquidity',
				newTag: true,
				external: true
			},
			{ name: 'Correlation', path: '/correlation', newTag: true },
			{
				name: 'Wiki',
				path: 'https://wiki.defillama.com/wiki/Main_Page',
				external: true
			},
			{
				name: 'Press / Media',
				path: '/press'
			},
			{
				name: 'API Docs',
				path: '/docs/api'
			},
			{ name: 'List your protocol', path: 'https://github.com/DefiLlama/yield-server#readme', external: true },
			{
				name: 'Download Data',
				path: 'https://datasets.llama.fi/yields/yield_rankings.csv'
			}
		],
		footer: [
			{ name: 'About DefiLlama', path: '/about' },
			{
				name: 'Twitter',
				path: 'https://twitter.com/DefiLlama',
				external: true
			},
			{
				name: 'Discord',
				path: 'https://discord.defillama.com',
				external: true
			},
			{
				name: 'Donate',
				path: '/donations'
			}
		],
		icon: <Percent size={16} />
	},
	'DefiLlama Swap': {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Repeat size={16} />
	},
	NFT: {
		main: [
			{ name: 'Collections', path: '/nfts' },
			{ name: 'Marketplaces', path: '/nfts/marketplaces' },
			{ name: 'Earnings', path: '/nfts/earnings' }
		],
		...defaultToolsAndFooterLinks,
		icon: <ImageIcon size={16} />,
		newTag: true
	},
	Unlocks: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Unlock size={16} />,
		newTag: true
	},
	'Borrow Aggregator': {
		main: [
			{ name: 'Basic', path: '/borrow', newTag: true },
			{ name: 'Advanced', path: '/borrow/advanced' }
		],
		...defaultToolsAndFooterLinks,
		icon: <Search size={16} />
	},
	'CEX Transparency': {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <BookOpen size={16} />
	},
	Bridges: {
		main: [
			{ name: 'Overview', path: '/bridges' },
			{ name: 'Chains', path: '/bridges/chains' },
			{ name: 'Transactions', path: '/bridge-transactions', newTag: true }
		],
		...defaultToolsAndFooterLinks,
		icon: <Shuffle size={16} />
	},
	Governance: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <FileText size={16} />,
		newTag: true
	},
	Liquidations: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Droplet size={16} />
	},
	Volumes: {
		main: [
			{ name: 'Overview', path: '/dexs' },
			{ name: 'Chains', path: '/dexs/chains' },
			{ name: 'Aggregators', path: '/aggregators', newTag: true },
			{ name: 'Derivatives', path: '/derivatives' },
			{ name: 'Options', path: '/options' }
		],
		...defaultToolsAndFooterLinks,
		icon: <BarChart size={16} />
	},
	'Fees/Revenue': {
		main: [
			{ name: 'Simple', path: '/fees/simple' },
			{ name: 'Advanced', path: '/fees' }
		],
		...defaultToolsAndFooterLinks,
		icon: <PieChart size={16} />
	},
	Raises: {
		main: [
			{ name: 'Overview', path: '/raises' },
			{ name: 'Investors', path: '/raises/investors' }
		],
		...defaultToolsAndFooterLinks,
		icon: <Book size={16} />
	},
	Stables: {
		main: [
			{ name: 'Overview', path: '/stablecoins' },
			{ name: 'Chains', path: '/stablecoins/chains' }
		],
		...defaultToolsAndFooterLinks,
		icon: <DollarSign size={16} />
	},
	Hacks: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <ShieldOff size={16} />
	},
	'ETH Liquid Staking': {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Layers size={16} />
	}
	// NFTs: {
	// 	main: [],
	// 	...defaultToolsAndFooterLinks,
	// 	icon: <FeatherImage size={16} />
	// }
}

export const linksWithNoSubMenu = [
	{ name: 'Liquidations', url: '/liquidations/eth' },
	{ name: 'Hacks', url: '/hacks' },
	{ name: 'Unlocks', url: '/unlocks' },
	{ name: 'Governance', url: '/governance' },
	{ name: 'CEX Transparency', url: '/cexs' },
	{ name: 'DefiLlama Swap', url: 'https://swap.defillama.com/', external: true },
	{ name: 'ETH Liquid Staking', url: '/lsd' },
	{ name: 'BTC ETF', url: '/etfs' }
]
