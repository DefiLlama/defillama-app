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
	Shuffle,
	Search,
	BookOpen,
	Repeat
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
	}
}

const defaultToolsAndFooterLinks = {
	tools: [
		{
				name: 'LlamaNodes',
				path: 'https://llamanodes.com/',
				newTag: true,
				external: true
		},
		{
				name: 'DLNews',
				path: 'https://dlnews.com/',
				newTag: true,
				external: true
		},
		{ name: 'Watchlist', path: '/watchlist' },
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
		},
		{
			name: 'Download Data',
			onClick: downloadDefiDataset
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
			{ name: 'Airdrops', path: '/airdrops' },
			{ name: 'Oracles', path: '/oracles' },
			{ name: 'Forks', path: '/forks' },
			{ name: 'Top Protocols', path: '/top-protocols' },
			{ name: 'Comparison', path: '/comparison?protocol=MakerDAO&protocol=Curve' },
			{ name: 'Token Usage', path: '/tokenUsage?token=ETH', newTag: true },
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
			{ name: 'Delta Neutral', path: '/yields/strategy', newTag: true },
			{ name: 'Leveraged Lending', path: '/yields/loop' },
			{ name: 'Borrow', path: '/yields/borrow' },
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
	'DEX Meta-Aggregator': {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Repeat size={16} />
	},
	'Borrow Aggregator': {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Search size={16} />
	},
	'CEX Transparency': {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <BookOpen size={16} />
	},
	Liquidations: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Droplet size={16} />
	},
	Volumes: {
		main: [
			{ name: 'Overview', path: '/dexs' },
			{ name: 'Chains', path: '/dexs/chains' }
		],
		...defaultToolsAndFooterLinks,
		icon: <BarChart size={16} />
	},
	'Fees/Revenue': {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <PieChart size={16} />
	},
	Raises: {
		main: [],
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
	}
}

export const linksWithNoSubMenu = [
	{ name: 'Liquidations', url: '/liquidations/eth' },
	{ name: 'Fees/Revenue', url: '/fees' },
	{ name: 'Raises', url: '/raises' },
	{ name: 'Hacks', url: '/hacks' },
	{ name: 'Borrow Aggregator', url: '/borrow' },
	{ name: 'CEX Transparency', url: '/cexs' },
	{ name: 'DEX Meta-Aggregator', url: 'https://swap.defillama.com/' },
]

function downloadDefiDataset() {
	if (
		confirm(`This data export contains a lot of data and is not well suited for most types of analysis.
We heavily recommend to use the csv exports available on other pages through the ".csv" buttons, since this export is hard to analyze unless you make heavy use of code.

Do you still wish to download it?`)
	) {
		window.open('https://datasets.llama.fi/all.csv', '_blank')
	}
}
