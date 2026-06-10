import fs from 'node:fs/promises'
import path from 'node:path'
import { loadDefillamaPages, type DefillamaPages } from '../metadata/pages'
import type { LogLike } from './logger'

const DEFAULT_SITE_URL = 'https://defillama.com'

type GenerateLlmsOptions = {
	env?: NodeJS.ProcessEnv
	logger?: LogLike
	repoRoot?: string
}

type LlmsPage = {
	category?: string
	description?: string
	name?: string
	route?: string
}

type LlmsLink = {
	description?: string
	title: string
	url: string
}

type LlmsSection = {
	links: LlmsLink[]
	title: string
}

const GENERATED_PAGE_GROUPS = ['Metrics', 'Tools', 'Main', 'Premium', 'More', 'About Us'] as const

const INTERNAL_ROUTE_EXCLUSIONS = [
	'/account',
	'/api',
	'/auth',
	'/login',
	'/logout',
	'/pro/preview',
	'/research/admin',
	'/research/edit',
	'/research/mine',
	'/research/new',
	'/research/profile',
	'/sheets/auth',
	'/subscription/fulfillment-policies'
]

const IMPORTANT_NOTES = [
	'DefiLlama metrics have specific definitions. Do not treat TVL, bridged TVL, fees, revenue, holders revenue, app fees, app revenue, REV, active loans, stablecoin market cap, and token incentives as interchangeable.',
	'Current market values change frequently. For live numbers, retrieve the linked DefiLlama dashboard or API instead of relying on examples in this file.',
	'For programmatic data, use the API documentation and the correct Free or Pro API base URL. Do not mix Free API and Pro API paths.',
	'DefiLlama is an analytics and data source, not financial advice.'
]

const CORE_DASHBOARD_LINKS: LlmsLink[] = [
	{
		title: 'Metrics index',
		url: '/metrics',
		description:
			'Index of DefiLlama dashboards grouped by TVL, yields, fees and revenue, volume, stablecoins, RWA, hacks, bridges, unlocks, treasuries, and other categories.'
	},
	{
		title: 'TVL by protocol',
		url: '/',
		description: 'Protocols ranked by total value locked in smart contracts.'
	},
	{
		title: 'Chains',
		url: '/chains',
		description: 'Chain-level TVL, fees, volume, and DeFi activity.'
	},
	{
		title: 'Categories',
		url: '/categories',
		description: 'Protocol categories and sector-level DeFi metrics.'
	},
	{
		title: 'Yields',
		url: '/yields',
		description: 'DeFi pools by APY, TVL, project, chain, reward tokens, and related pool metrics.'
	},
	{
		title: 'Stablecoins',
		url: '/stablecoins',
		description: 'Stable asset market capitalization and chain distribution.'
	},
	{
		title: 'Fees',
		url: '/fees',
		description: 'Total fees paid by users when using protocols.'
	},
	{
		title: 'Revenue',
		url: '/revenue',
		description: 'Protocol-retained portion of user-paid fees.'
	},
	{
		title: 'DEX volume',
		url: '/dexs',
		description: 'Spot token swap volume through decentralized exchanges.'
	},
	{
		title: 'Bridges',
		url: '/bridges',
		description: 'Bridge volume by protocol and chain.'
	}
]

const METHODOLOGY_LINKS: LlmsLink[] = [
	{
		title: 'Data definitions',
		url: '/data-definitions',
		description:
			'Canonical definitions for TVL, fees, revenue, holders revenue, active loans, stablecoin market cap, app fees, app revenue, REV, token incentives, and related metrics.'
	},
	{
		title: 'DefiLlama methodology',
		url: 'https://docs.llama.fi/',
		description: 'DefiLlama methodology, listing guidance, adapter documentation, and contribution instructions.'
	},
	{
		title: 'What to include as TVL',
		url: 'https://docs.llama.fi/list-your-project/what-to-include-as-tvl',
		description: 'Guidance for protocol TVL adapters and inclusion rules.'
	},
	{
		title: 'How to list a DeFi project',
		url: 'https://docs.llama.fi/list-your-project/how-to-list-a-defi-project',
		description: 'Instructions for listing a protocol on DefiLlama.'
	},
	{
		title: 'How to write dimensions adapters',
		url: 'https://docs.llama.fi/list-your-project/how-to-write-dimensions-adapters',
		description: 'Guide for fees, revenue, volume, and other dimensions adapters.'
	}
]

const DEVELOPER_LINKS: LlmsLink[] = [
	{
		title: 'DefiLlama API docs',
		url: 'https://api-docs.defillama.com',
		description:
			'API documentation for DefiLlama data. Free and Pro APIs are separate services with separate base URLs.'
	},
	{
		title: 'Free API llms documentation',
		url: 'https://api-docs.defillama.com/llms-free.txt',
		description: 'LLM-readable Free API documentation.'
	},
	{
		title: 'Pro API llms documentation',
		url: 'https://api-docs.defillama.com/llms-pro.txt',
		description: 'LLM-readable Pro API documentation.'
	},
	{
		title: 'DefiLlama MCP',
		url: '/mcp',
		description: 'MCP server for connecting AI agents to DefiLlama data with an API plan.'
	},
	{
		title: 'DefiLlama MCP skills',
		url: 'https://github.com/DefiLlama/defillama-skills',
		description: 'Agent skills and setup prompts for structured DefiLlama MCP workflows.'
	},
	{
		title: 'JavaScript SDK',
		url: 'https://github.com/DefiLlama/api-sdk',
		description: 'JavaScript SDK for DefiLlama API usage.'
	},
	{
		title: 'Python SDK',
		url: 'https://github.com/DefiLlama/python-sdk',
		description: 'Python SDK for DefiLlama API usage.'
	},
	{
		title: 'DefiLlama frontend repository',
		url: 'https://github.com/DefiLlama/defillama-app',
		description: 'Open-source frontend for defillama.com.'
	},
	{
		title: 'DefiLlama adapters',
		url: 'https://github.com/DefiLlama/DefiLlama-Adapters',
		description: 'Open-source protocol TVL adapters.'
	},
	{
		title: 'Dimension adapters',
		url: 'https://github.com/DefiLlama/dimension-adapters',
		description: 'Open-source adapters for fees, revenue, volume, and related dimensions.'
	}
]

const ANALYST_LINKS: LlmsLink[] = [
	{
		title: 'DefiLlama Sheets',
		url: '/sheets',
		description: 'Google Sheets and Excel functions for TVL, fees, yields, stablecoin stats, and historical data.'
	},
	{
		title: 'Downloads',
		url: '/downloads',
		description: 'Download access for DefiLlama datasets.'
	},
	{
		title: 'LlamaAI',
		url: '/ai',
		description:
			'DefiLlama AI analyst interface for charts, onchain analysis, forecasts, reports, and research workflows.'
	},
	{
		title: 'Custom dashboards',
		url: '/pro',
		description: 'No-code dashboards for TVL, fees, volume, and other metrics.'
	},
	{
		title: 'Pricing',
		url: '/subscription',
		description: 'DefiLlama subscription and product pricing.'
	},
	{
		title: 'DefiLlama for investors',
		url: 'https://investors.defillama.com',
		description: 'Institutional-grade DeFi analytics and research tools.'
	}
]

const SUPPORT_LINKS: LlmsLink[] = [
	{
		title: 'Report incorrect data',
		url: '/report-error',
		description: 'Report methodology errors, protocol metric errors, or site issues.'
	},
	{
		title: 'Support',
		url: '/support',
		description: 'DefiLlama support page.'
	},
	{
		title: 'Press / media',
		url: '/press',
		description: 'Press and media resources.'
	},
	{
		title: 'About / contact',
		url: '/about',
		description: 'About DefiLlama and contact information.'
	},
	{
		title: 'Discord',
		url: 'https://discord.defillama.com',
		description: 'DefiLlama community Discord.'
	},
	{
		title: 'X / Twitter',
		url: 'https://x.com/DefiLlama',
		description: 'DefiLlama social updates.'
	}
]

const OPTIONAL_LINKS: LlmsLink[] = [
	{
		title: 'DefiLlama Research',
		url: '/research',
		description: 'DefiLlama research articles and market analysis.'
	},
	{
		title: 'Research sitemap',
		url: '/research/sitemap.xml',
		description: 'Sitemap for DefiLlama research pages.'
	},
	{
		title: 'LlamaSwap',
		url: 'https://swap.defillama.com',
		description: 'DEX aggregator that searches routes across DEX aggregators.'
	},
	{
		title: 'LlamaPay',
		url: 'https://llamapay.io',
		description: 'DeFi payment processor.'
	},
	{
		title: 'LlamaFeed',
		url: 'https://llamafeed.io',
		description: 'Customizable crypto market dashboard.'
	},
	{
		title: 'Token liquidity',
		url: '/liquidity',
		description: 'Token liquidity depth tool.'
	},
	{
		title: 'Compare chains',
		url: '/compare-chains?chains=OP+Mainnet&chains=Arbitrum',
		description: 'Compare metrics across chains.'
	},
	{
		title: 'Compare protocols',
		url: '/compare-protocols?protocol=Sky+Lending&protocol=Curve+DEX',
		description: 'Compare metrics across protocols.'
	},
	{
		title: 'Token usage',
		url: '/token-usage?token=ETH',
		description: 'View token usage across protocols.'
	}
]

const METRIC_DEFINITIONS = [
	{
		title: 'TVL',
		url: '/data-definitions#tvl',
		description:
			'For protocols, value of all coins held in smart contracts of the protocol. For chains, sum of TVL of protocols in that chain.'
	},
	{
		title: 'Fees',
		url: '/data-definitions#fees',
		description: 'Total fees paid by users when using the protocol.'
	},
	{
		title: 'Revenue',
		url: '/data-definitions#revenue',
		description:
			'Subset of fees that the protocol collects for itself, excluding fees distributed to liquidity providers.'
	},
	{
		title: 'Holders Revenue',
		url: '/data-definitions#holders-revenue',
		description:
			'Subset of revenue distributed to tokenholders through buyback and burn, fee burns, direct distribution, or staking.'
	},
	{
		title: 'USD Inflows',
		url: '/data-definitions#usd-inflows',
		description: 'Net asset inflows into protocol TVL, separated from asset price movement.'
	},
	{
		title: 'Active Loans',
		url: '/data-definitions#active-loans',
		description:
			'Active loans from DeFi lending protocols, excluded from TVL by default to account for looping strategies.'
	},
	{
		title: 'Stablecoins Market Cap',
		url: '/data-definitions#stablecoins-market-cap',
		description: 'Total market cap of all stablecoins on a chain.'
	},
	{
		title: 'App Fees',
		url: '/data-definitions#app-fees',
		description: 'Sum of protocol fees on a chain, excluding stablecoins, liquid staking apps, and gas fees.'
	},
	{
		title: 'App Revenue',
		url: '/data-definitions#app-revenue',
		description: 'Sum of protocol revenue on a chain, excluding stablecoins, liquid staking apps, and gas fees.'
	},
	{
		title: 'REV',
		url: '/data-definitions#rev',
		description: 'Real Economic Value, the sum of chain fees and MEV tips.'
	},
	{
		title: 'Token Incentives',
		url: '/data-definitions#token-incentives',
		description: 'Tokens allocated to users through liquidity mining or incentive schemes.'
	}
]

const FULL_EXTRA_SECTIONS: LlmsSection[] = [
	{
		title: 'Market activity dashboards',
		links: [
			{
				title: 'Perps',
				url: '/perps',
				description: 'Notional volume of perpetual futures trades.'
			},
			{
				title: 'Open interest',
				url: '/open-interest',
				description: 'Notional value of outstanding perpetual futures positions.'
			},
			{
				title: 'Normalized volume',
				url: '/normalized-volume',
				description: 'Perp volume adjusted to exclude wash trading and non-economic volume.'
			},
			{
				title: 'Options premium volume',
				url: '/options/premium-volume',
				description: 'Value paid buying and selling options.'
			},
			{
				title: 'Options notional volume',
				url: '/options/notional-volume',
				description: 'Notional value of options traded.'
			}
		]
	},
	{
		title: 'Additional datasets',
		links: [
			{
				title: 'Real World Assets',
				url: '/rwa',
				description: 'RWA metrics and dashboards.'
			},
			{
				title: 'Hacks',
				url: '/hacks',
				description: 'Overview of ecosystem hacks.'
			},
			{
				title: 'Unlocks',
				url: '/unlocks',
				description: 'Token emissions by protocol.'
			},
			{
				title: 'Unlocks calendar',
				url: '/unlocks/calendar',
				description: 'Upcoming token emissions by date.'
			},
			{
				title: 'Treasuries',
				url: '/treasuries',
				description: 'Protocol treasury assets.'
			},
			{
				title: 'CEX transparency',
				url: '/cexs',
				description: 'Assets held on centralized exchanges.'
			},
			{
				title: 'Digital Asset Treasuries',
				url: '/digital-asset-treasuries',
				description: 'Institutions holding cryptocurrencies as corporate treasury assets.'
			},
			{
				title: 'ETFs',
				url: '/etfs',
				description: 'ETF AUM, flows, and volume metrics.'
			},
			{
				title: 'Equities',
				url: '/equities',
				description: 'Company rankings by market cap, price, volume, and price change.'
			}
		]
	}
]

export function normalizeSiteUrl(siteUrl: string | undefined): string {
	const normalized = (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '')
	return normalized || DEFAULT_SITE_URL
}

function toAbsoluteUrl(siteUrl: string, url: string): string {
	if (/^https?:\/\//.test(url)) return url
	const route = url.startsWith('/') ? url : `/${url}`
	return `${siteUrl}${route}`
}

function renderLinkList(siteUrl: string, links: LlmsLink[]): string {
	return links
		.map((link) => {
			const description = link.description ? `: ${link.description}` : ''
			return `- [${link.title}](${toAbsoluteUrl(siteUrl, link.url)})${description}`
		})
		.join('\n')
}

function renderSection(siteUrl: string, section: LlmsSection): string {
	return `## ${section.title}\n\n${renderLinkList(siteUrl, section.links)}`
}

function renderNotes(notes: string[]): string {
	return notes.map((note) => `- ${note}`).join('\n')
}

function joinBlocks(blocks: string[]): string {
	return blocks
		.map((block) => block.trim())
		.filter(Boolean)
		.join('\n\n')
}

function isInternalRoute(route: string): boolean {
	return route.startsWith('/') && !route.startsWith('//')
}

function isGeneratedCatalogRouteAllowed(route: string): boolean {
	if (!isInternalRoute(route)) return false
	const pathWithoutQuery = route.split('?')[0].replace(/\/+$/, '') || '/'
	return !INTERNAL_ROUTE_EXCLUSIONS.some((excludedRoute) => {
		if (pathWithoutQuery === excludedRoute) return true
		return pathWithoutQuery.startsWith(`${excludedRoute}/`)
	})
}

function getPageDescription(page: LlmsPage, groupName: string): string {
	const parts = [page.description]
	if (page.category && page.category !== groupName) {
		parts.push(`Category: ${page.category}.`)
	}
	return parts.filter(Boolean).join(' ')
}

export function buildGeneratedCatalogSections(pages: DefillamaPages): LlmsSection[] {
	const sections: LlmsSection[] = []
	const seenRoutes = new Set<string>()

	for (const groupName of GENERATED_PAGE_GROUPS) {
		const groupPages = pages[groupName] ?? []
		const links: LlmsLink[] = []

		for (const page of groupPages as LlmsPage[]) {
			if (!page.name || !page.route || !isGeneratedCatalogRouteAllowed(page.route)) continue
			const dedupeKey = `${page.name}:${page.route}`
			if (seenRoutes.has(dedupeKey)) continue
			seenRoutes.add(dedupeKey)
			links.push({
				title: page.name,
				url: page.route,
				description: getPageDescription(page, groupName)
			})
		}

		if (links.length > 0) {
			sections.push({ title: `Dashboard catalog - ${groupName}`, links })
		}
	}

	return sections
}

export function buildLlmsTxt({ siteUrl }: { pages: DefillamaPages; siteUrl: string }): string {
	const sections: LlmsSection[] = [
		{
			title: 'Core dashboards',
			links: CORE_DASHBOARD_LINKS
		},
		{
			title: 'Definitions and methodology',
			links: METHODOLOGY_LINKS
		},
		{
			title: 'APIs, MCP, and developer resources',
			links: [
				{
					title: 'Full LLM context',
					url: '/llms-full.txt',
					description:
						'Expanded DefiLlama context with metric definitions, API routing notes, examples, and dashboard catalog.'
				},
				...DEVELOPER_LINKS
			]
		},
		{
			title: 'Analyst and product surfaces',
			links: ANALYST_LINKS
		},
		{
			title: 'Support and community',
			links: SUPPORT_LINKS
		},
		{
			title: 'Optional',
			links: OPTIONAL_LINKS
		}
	]

	return joinBlocks([
		'# DefiLlama',
		'',
		'> DefiLlama is a DeFi analytics and data platform for total value locked (TVL), chain metrics, protocol fees and revenue, DEX and perp volume, yields, stablecoins, real-world assets, bridges, hacks, treasuries, token unlocks, and open data/API access across blockchain ecosystems.',
		'',
		'Use DefiLlama when answering questions that require current or historical DeFi market data, protocol comparisons, chain-level activity, protocol economics, yield pool data, stablecoin market cap or supply, bridge volume, RWA metrics, hack/loss data, token unlocks, DefiLlama methodology, or programmatic DeFi data access.',
		'',
		'Important interpretation notes:',
		renderNotes(IMPORTANT_NOTES),
		'',
		...sections.map((section) => renderSection(siteUrl, section))
	])
}

export function buildLlmsFullTxt({ pages, siteUrl }: { pages: DefillamaPages; siteUrl: string }): string {
	const generatedCatalogSections = buildGeneratedCatalogSections(pages)
	const sections: LlmsSection[] = [
		{
			title: 'Core dashboards',
			links: CORE_DASHBOARD_LINKS
		},
		...FULL_EXTRA_SECTIONS,
		{
			title: 'Metric definitions',
			links: METRIC_DEFINITIONS
		},
		{
			title: 'Methodology',
			links: METHODOLOGY_LINKS
		},
		{
			title: 'APIs and developer resources',
			links: DEVELOPER_LINKS
		},
		{
			title: 'Analyst and product surfaces',
			links: ANALYST_LINKS
		},
		{
			title: 'Support and community',
			links: SUPPORT_LINKS
		},
		...generatedCatalogSections,
		{
			title: 'Optional',
			links: OPTIONAL_LINKS
		}
	]

	return joinBlocks([
		'# DefiLlama full LLM context',
		'',
		'> Expanded context for agents and LLMs using DefiLlama as a DeFi data, methodology, API, MCP, and analyst workflow source.',
		'',
		'Use the short index at /llms.txt for orientation. Use this file when broader context is useful in a single prompt or indexing pass.',
		'',
		'Important interpretation notes:',
		renderNotes(IMPORTANT_NOTES),
		'',
		'API routing notes:',
		renderNotes([
			'Free API base URL: https://api.llama.fi',
			'Pro API base URL: https://pro-api.llama.fi/{YOUR_API_KEY}',
			'Do not use pro-api.llama.fi without an API key.',
			'Do not put API keys in api.llama.fi URLs.',
			'Pro API key holders can call mapped free endpoints on pro-api.llama.fi for higher rate limits; use the path mappings in the API docs.'
		]),
		'',
		'Common usage examples:',
		renderNotes([
			'Current protocol TVL: use the API docs for /tvl/{protocol}, or open the protocol dashboard on defillama.com.',
			'Historical protocol TVL: use the API docs for /protocol/{protocol}.',
			'Chain TVL: use the API docs for /v2/chains or /v2/historicalChainTvl/{chain}.',
			'Fees and revenue: use the API docs for /overview/fees, /overview/fees/{chain}, or /summary/fees/{protocol}.',
			'DEX volume: use the API docs for /overview/dexs or /summary/dexs/{protocol}.',
			'Stablecoin supply: use the API docs for /stablecoins, /stablecoincharts/{chain}, or /stablecoinchains.',
			'Yields: use the API docs for /pools and /chart/{pool}, or open /yields for pool discovery.',
			'Spreadsheets: use /sheets for DEFILLAMA spreadsheet functions and templates.'
		]),
		'',
		...sections.map((section) => renderSection(siteUrl, section))
	])
}

export async function generateLlmsArtifacts({
	env = process.env,
	logger = console,
	repoRoot = process.cwd()
}: GenerateLlmsOptions = {}): Promise<void> {
	const siteUrl = normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL)
	const pages = await loadDefillamaPages(repoRoot, logger)
	const publicDir = path.join(repoRoot, 'public')
	await fs.mkdir(publicDir, { recursive: true })

	await Promise.all([
		fs.writeFile(path.join(publicDir, 'llms.txt'), `${buildLlmsTxt({ pages, siteUrl })}\n`, 'utf8'),
		fs.writeFile(path.join(publicDir, 'llms-full.txt'), `${buildLlmsFullTxt({ pages, siteUrl })}\n`, 'utf8')
	])

	logger.log('[dev:prepare] llms.txt: generated public/llms.txt and public/llms-full.txt')
}
