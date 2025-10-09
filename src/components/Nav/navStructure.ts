export type NavItemType = 'link' | 'group' | 'separator'

export type NavLink = {
	type: 'link'
	label: string
	route: string
	icon?: string
	emoji?: string
	badge?: 'new' | 'pro'
	attention?: boolean
	external?: boolean
	description?: string
}

export type NavGroup = {
	type: 'group'
	label: string
	icon?: string
	emoji?: string
	defaultOpen?: boolean
	children: Array<NavLink | NavGroup>
}

export type NavSeparator = {
	type: 'separator'
	label?: string
}

export type NavItem = NavLink | NavGroup | NavSeparator

// Main navigation structure
export const primaryNavigation: NavItem[] = [
	{ type: 'link', label: 'Overview', route: '/', icon: 'house' },
	{ type: 'link', label: 'Metrics', route: '/metrics', icon: 'bar-chart-2' },
	{ type: 'link', label: 'Account', route: '/subscription', icon: 'user' },
	{ type: 'link', label: 'Custom Dashboards', route: '/pro', icon: 'blocks' }
]

// Secondary navigation - reserved for pinned routes (dynamically populated)
export const secondaryNavigation: NavItem[] = []

// Footer navigation for ecosystem and resources
export const footerNavigation: NavItem[] = [
	{
		type: 'group',
		label: 'Llama Ecosystem',
		children: [
			{ type: 'link', label: 'LlamaSwap', route: 'https://swap.defillama.com', external: true },
			{ type: 'link', label: 'LlamaPay', route: 'https://llamapay.io', external: true },
			{ type: 'link', label: 'LlamaFeed', route: 'https://llamafeed.io', external: true },
			{ type: 'link', label: 'Llama News', route: '/roundup' }
		]
	},
	{
		type: 'group',
		label: 'Extensions',
		children: [
			{
				type: 'link',
				label: 'DefiLlama Extension',
				route: 'https://chromewebstore.google.com/detail/defillama/phgiabfbjodhgckcffppiboooeiecgeg',
				external: true
			},
			{
				type: 'link',
				label: 'LlamaSearch',
				route: 'https://chromewebstore.google.com/detail/llamasearch/iophmfgnjmfjdkodekdffgckoloooaci',
				external: true
			}
		]
	}
]

export const resourcesNavigation: NavItem[] = [
	{
		type: 'group',
		label: 'Help & Support',
		icon: 'help-circle',
		children: [
			{ type: 'link', label: 'Support', route: '/support', icon: 'help-circle' },
			{ type: 'link', label: 'Documentation', route: 'https://api-docs.defillama.com', icon: 'code', external: true },
			{ type: 'link', label: 'Contact us', route: '/about', icon: 'chat' }
		]
	},
	{
		type: 'group',
		label: 'Contribute',
		icon: 'flag',
		children: [
			{ type: 'link', label: 'Report Incorrect Data', route: '/report-error' },
			{
				type: 'link',
				label: 'List your project',
				route: 'https://docs.llama.fi/list-your-project/submit-a-project',
				external: true
			},
			{
				type: 'link',
				label: 'Careers',
				route: 'https://github.com/DefiLlama/careers/blob/master/README.md',
				external: true
			}
		]
	},
	{
		type: 'group',
		label: 'Community',
		icon: 'twitter',
		children: [
			{ type: 'link', label: 'Twitter', route: 'https://x.com/DefiLlama', icon: 'twitter', external: true },
			{ type: 'link', label: 'Discord', route: 'https://discord.defillama.com', icon: 'discord', external: true },
			{ type: 'link', label: 'Press / Media', route: '/press' },
			{ type: 'link', label: 'Donate', route: '/donations' }
		]
	}
]
