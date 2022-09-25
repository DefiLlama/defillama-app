import {
	BarChart2,
	Bookmark,
	Clock,
	CloudDrizzle,
	Code,
	DollarSign,
	Icon,
	Link,
	List,
	Map,
	Percent,
	PieChart,
	PlusCircle,
	Pocket,
	RefreshCcw,
	Share2,
	Shield,
	TrendingUp,
	Droplet,
	BarChart,
	Award
} from 'react-feather'

export interface IMainLink {
	name: string
	path: string
	icon: Icon
	newTag?: boolean
	subMenuHeader?: boolean
	hideOnMobile?: boolean
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
	}
}

export const navLinks: ILinks = {
	defi: {
		main: [
			{ name: 'Yields', path: '/yields', icon: Percent, subMenuHeader: true },
			{ name: 'Stablecoins', path: '/stablecoins/chains', icon: DollarSign, subMenuHeader: true },
			{ name: 'DEXs', path: '/dexs', icon: BarChart, subMenuHeader: true },
			{ name: 'Fees', path: '/fees', icon: PieChart, subMenuHeader: true },
			{ name: 'Overview', path: '/', icon: TrendingUp, hideOnMobile: true },
			{ name: 'Chains', path: '/chains', icon: Link },

			{ name: 'Liquidations', path: '/liquidations/eth', icon: Droplet, newTag: true },
			{ name: 'Airdrops', path: '/airdrops', icon: CloudDrizzle },
			{ name: 'Oracles', path: '/oracles', icon: Shield },
			{ name: 'Forks', path: '/forks', icon: Share2 },
			{ name: 'Watchlist', path: '/watchlist', icon: Bookmark },
			{ name: 'Top Protocols', path: '/top-protocols', icon: Map },
			{ name: 'Categories', path: '/categories', icon: RefreshCcw },
			{ name: 'Recent', path: '/recent', icon: Clock },
			{ name: 'Languages', path: '/languages', icon: Code }
		],
		tools: [
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
	},
	yields: {
		main: [
			{ name: 'DeFi', path: '/', icon: BarChart2, subMenuHeader: true, hideOnMobile: true },
			{ name: 'Stablecoins', path: '/stablecoins/chains', icon: DollarSign, subMenuHeader: true, hideOnMobile: true },
			{ name: 'DEXs', path: '/dexs', icon: BarChart, subMenuHeader: true, hideOnMobile: true },
			{ name: 'Fees', path: '/fees', icon: PieChart, subMenuHeader: true, hideOnMobile: true },
			{ name: 'Overview', path: '/yields/overview', icon: PieChart },
			{ name: 'Pools', path: '/yields', icon: TrendingUp },
			{ name: 'Stablecoin Pools', path: '/yields/stablecoins', icon: Pocket },
			{ name: 'Projects', path: '/yields/projects', icon: List },
			{ name: 'Watchlist', path: '/yields/watchlist', icon: Bookmark },
			{ name: 'List your protocol', path: 'https://github.com/DefiLlama/yield-server#readme', icon: PlusCircle },
			{ name: 'Halal', path: '/yields/halal', icon: Award }
		],
		tools: [
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
		]
	},
	stablecoins: {
		main: [
			{ name: 'DeFi', path: '/', icon: BarChart2, subMenuHeader: true, hideOnMobile: true },
			{ name: 'Yields', path: '/yields', icon: Percent, subMenuHeader: true, hideOnMobile: true },
			{ name: 'DEXs', path: '/dexs', icon: BarChart, subMenuHeader: true, hideOnMobile: true },
			{ name: 'Fees', path: '/fees', icon: PieChart, subMenuHeader: true, hideOnMobile: true },
			{ name: 'Overview', path: '/stablecoins', icon: PieChart },
			{ name: 'Chains', path: '/stablecoins/chains', icon: Link }
		],
		tools: [
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
}

function downloadDefiDataset() {
	if (
		confirm(`This data export contains a lot of data and is not well suited for most types of analysis.
We heavily recommend to use the csv exports available on other pages through the ".csv" buttons, since this export is hard to analyze unless you make heavy use of code.

Do you still wish to download it?`)
	) {
		window.open('https://datasets.llama.fi/all.csv', '_blank')
	}
}

// nfts: {
// 	main: [
// 		{ name: 'DeFi', path: '/', icon: BarChart2, subMenuHeader: true, hideOnMobile: true },
// 		{ name: 'Overview', path: '/nfts', icon: TrendingUp },
// 		{ name: 'Chains', path: '/nfts/chains', icon: Link },
// 		{ name: 'Marketplaces', path: '/nfts/marketplaces', icon: ShoppingCart },
// 		{ name: 'About', path: '/nfts/about', icon: HelpCircle }
// 	],
// 	tools: [
// 		{
// 			name: 'Roundup',
// 			path: '/roundup'
// 		},
// 		{
// 			name: 'Wiki',
// 			path: 'https://wiki.defillama.com/wiki/Main_Page',
// 			external: true
// 		},
// 		{
// 			name: 'Press / Media',
// 			path: '/press'
// 		},
// 		{
// 			name: 'API Docs',
// 			path: '/docs/api'
// 		},
// 		{
// 			name: 'List Your Project',
// 			path: 'https://docs.llama.fi/list-your-project/submit-a-project',
// 			external: true
// 		},
// 		{
// 			name: 'Download Data',
// 			onClick: downloadDefiDataset
// 		}
// 	],
// 	footer: [
// 		{ name: 'About DefiLlama', path: '/about' },
// 		{
// 			name: 'Twitter',
// 			path: 'https://twitter.com/DefiLlama',
// 			external: true
// 		},
// 		{
// 			name: 'Discord',
// 			path: 'https://discord.gg/buPFYXzDDd',
// 			external: true
// 		},
// 		{
// 			name: 'Donate',
// 			path: '/donations'
// 		}
// 	]
// }
