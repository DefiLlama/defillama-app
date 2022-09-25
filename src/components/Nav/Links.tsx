import { ReactNode } from 'react'
import {
	Clock,
	CloudDrizzle,
	Code,
	Icon,
	Link,
	List,
	Map,
	PieChart,
	Pocket,
	RefreshCcw,
	Share2,
	Shield,
	TrendingUp,
	Droplet,
	BarChart,
	Award,
	DollarSign,
	Percent,
	BarChart2
} from 'react-feather'

export interface IMainLink {
	name: string
	path: string
	icon: Icon
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
		{ name: 'Watchlist', path: '/watchlist' },
		{ name: 'Directory', path: '/directory', newTag: true },
		{
			name: 'Roundup',
			path: '/roundup'
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
		{ name: 'About DefiLlama', path: '/about' },
		{
			name: 'Twitter',
			path: 'https://twitter.com/DefiLlama',
			external: true
		},
		{
			name: 'Discord',
			path: 'https://discord.gg/buPFYXzDDd',
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
			{ name: 'Overview', path: '/', icon: TrendingUp },
			{ name: 'Chains', path: '/chains', icon: Link },
			{ name: 'Airdrops', path: '/airdrops', icon: CloudDrizzle },
			{ name: 'Oracles', path: '/oracles', icon: Shield },
			{ name: 'Forks', path: '/forks', icon: Share2 },
			{ name: 'Top Protocols', path: '/top-protocols', icon: Map },
			{ name: 'Categories', path: '/categories', icon: RefreshCcw },
			{ name: 'Recent', path: '/recent', icon: Clock },
			{ name: 'Languages', path: '/languages', icon: Code }
		],
		...defaultToolsAndFooterLinks,
		icon: <BarChart2 size={16} />
	},
	Yields: {
		main: [
			{ name: 'Overview', path: '/yields/overview', icon: PieChart },
			{ name: 'Pools', path: '/yields', icon: TrendingUp },
			{ name: 'Stablecoin Pools', path: '/yields/stablecoins', icon: Pocket },
			{ name: 'Projects', path: '/yields/projects', icon: List },
			{ name: 'Halal', path: '/yields/halal', icon: Award }
		],
		tools: [
			{ name: 'Watchlist', path: '/yields/watchlist' },
			{ name: 'Directory', path: '/directory', newTag: true },
			{
				name: 'Roundup',
				path: '/roundup'
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
				path: 'https://discord.gg/buPFYXzDDd',
				external: true
			},
			{
				name: 'Donate',
				path: '/donations'
			}
		],
		icon: <Percent size={16} />
	},
	Stables: {
		main: [
			{ name: 'Overview', path: '/stablecoins', icon: PieChart },
			{ name: 'Chains', path: '/stablecoins/chains', icon: Link }
		],
		...defaultToolsAndFooterLinks,
		icon: <DollarSign size={16} />
	},
	Liquidations: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <Droplet size={16} />
	},
	DEXs: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <BarChart size={16} />
	},
	Fees: {
		main: [],
		...defaultToolsAndFooterLinks,
		icon: <PieChart size={16} />
	}
}

export const linksWithNoSubMenu = [
	{ name: 'Liquidations', url: '/liquidations/eth' },
	{ name: 'DEXs', url: '/dexs' },
	{ name: 'Fees', url: '/fees' }
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
