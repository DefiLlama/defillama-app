import type {
	BillingCycle,
	ComparisonSection,
	FaqItem,
	PlanKey,
	PlanMeta,
	PricingCardData
} from '~/containers/Subscription/types'

export const PLAN_ORDER: PlanKey[] = ['free', 'pro', 'api', 'enterprise']

export const PLAN_META_BY_CYCLE: Record<BillingCycle, Record<PlanKey, PlanMeta>> = {
	monthly: {
		free: { title: 'Free', price: '$0/month', action: 'Get Started' },
		pro: { title: 'Pro', price: '$49/month', action: 'Get Started' },
		api: { title: 'API', price: '$300/month', action: 'Get Started' },
		enterprise: { title: 'Enterprise', price: 'Custom', action: 'Contact us' }
	},
	yearly: {
		free: { title: 'Free', price: '$0/month', action: 'Get Started' },
		pro: { title: 'Pro', price: '$490/year', action: 'Get Started' },
		api: { title: 'API', price: '$3,000/year', action: 'Get Started' },
		enterprise: { title: 'Enterprise', price: 'Custom', action: 'Contact us' }
	}
}

const CARD_CONTENT: Omit<PricingCardData, 'priceMain' | 'priceUnit' | 'priceSecondary'>[] = [
	{
		key: 'free',
		title: 'Free',
		subtitle: 'Understand what\u2019s happening onchain',
		sections: [
			{
				title: 'Core Data & Dashboards',
				items: [
					{ label: 'Track TVL, volume, and key metrics across every major chain and protocol', availability: 'check' },
					{ label: 'Find & compare yield opportunities and stablecoin data', availability: 'check' },
					{ label: 'See upcoming token unlocks before they hit the market', availability: 'check' },
					{ label: 'Stay on top of who\u2019s raising, and how much', availability: 'check' },
					{ label: 'View custom dashboards built by analysts', availability: 'check' },
					{
						label: 'Try LlamaAI free: one daily query and one deep research report every two weeks',
						link: '/ai',
						linkText: 'LlamaAI free',
						availability: 'check',
						highlightText: false
					},
					{
						label: 'Access to free API endpoints',
						link: 'https://api-docs.defillama.com/',
						linkText: 'API endpoints',
						availability: 'check'
					}
				]
			}
		],
		primaryCta: 'Start for Free',
		ctaSubtext: 'No card required'
	},
	{
		key: 'pro',
		title: 'Pro',
		subtitle: 'The full research suite',
		includedTierText: 'Includes all Free tier features',
		sections: [
			{
				title: 'Analysis & AI Tools',
				items: [
					{
						label: 'Ask LlamaAI anything: it does the analysis',
						link: '/ai',
						linkText: 'LlamaAI',
						availability: 'check',
						highlightText: false
					},
					{ label: 'Five LlamaAI deep research reports per day', availability: 'check', isSubItem: true },
					{ label: 'Build your own custom dashboards', availability: 'check' },
					{ label: 'Add custom data columns to track exactly what you care about', availability: 'check' },
					{
						label: 'Live data in your spreadsheets via DefiLlama Sheets',
						link: '/sheets',
						linkText: 'DefiLlama Sheets',
						availability: 'check'
					},
					{ label: 'CSV data downloads', availability: 'check' },
					{ label: 'Full access to LlamaFeed', availability: 'check' }
				]
			}
		],
		primaryCta: 'Get Pro Access',
		secondaryCta: 'Pay with Crypto'
	},
	{
		key: 'api',
		title: 'API',
		subtitle: 'Your complete DeFi terminal',
		includedTierText: 'Includes all Pro tier features',
		sections: [
			{
				title: 'API Access',
				items: [
					{ label: 'Premium endpoints: prices, inflows, token unlocks, and more', availability: 'check' },
					{ label: 'Increased rate limit: 1,000 requests / minute, 1M calls / month', availability: 'check' },
					{ label: '$0.60 per 1,000 calls beyond the 1M limit', availability: 'check' },
					{
						label: 'Connect DefiLlama data directly to your AI agents via MCP',
						link: '/mcp',
						linkText: 'MCP',
						availability: 'check'
					},
					{ label: 'Priority support', availability: 'check' }
				]
			}
		],
		primaryCta: 'Get API Access',
		secondaryCta: 'Pay with Crypto',
		highlighted: true,
		recommendedLabel: 'Recommended'
	},
	{
		key: 'enterprise',
		title: 'Enterprise',
		subtitle: 'Custom data solutions',
		description: 'Contact for pricing',
		includedTierText: 'Includes all Pro & API tier features',
		sections: [
			{
				title: 'Custom Solutions & Data',
				items: [
					{ label: 'Direct raw access to our database', availability: 'check' },
					{ label: 'Bespoke data solutions built around your use case', availability: 'check' },
					{
						label: 'Non-public data access, including TVL broken down by individual token address',
						availability: 'check'
					},
					{ label: 'Hourly data', availability: 'check' },
					{
						label: 'Licensing agreements structured for your organization\u2019s requirements',
						availability: 'check'
					},
					{ label: 'Increased API limits', availability: 'check' }
				]
			}
		],
		primaryCta: 'Talk to Our Team'
	}
]

const CYCLE_PRICING: Record<
	BillingCycle,
	Record<PlanKey, { priceMain?: string; priceUnit?: string; priceSecondary?: string }>
> = {
	monthly: {
		free: { priceMain: '$0', priceUnit: '/month' },
		pro: { priceMain: '$49', priceUnit: '/month', priceSecondary: '$588 /year' },
		api: { priceMain: '$300', priceUnit: '/month', priceSecondary: '$3,600 /year' },
		enterprise: {}
	},
	yearly: {
		free: { priceMain: '$0', priceUnit: '/month' },
		pro: { priceMain: '$40.83', priceUnit: '/month', priceSecondary: '$490 /year' },
		api: { priceMain: '$250', priceUnit: '/month', priceSecondary: '$3,000 /year' },
		enterprise: {}
	}
}

function buildPricingCards(cycle: BillingCycle): PricingCardData[] {
	return CARD_CONTENT.map((card) => ({ ...card, ...CYCLE_PRICING[cycle][card.key] }))
}

export const MONTHLY_PRICING_CARDS = buildPricingCards('monthly')
export const YEARLY_PRICING_CARDS = buildPricingCards('yearly')

export const PRICING_CARDS_BY_CYCLE: Record<BillingCycle, PricingCardData[]> = {
	monthly: MONTHLY_PRICING_CARDS,
	yearly: YEARLY_PRICING_CARDS
}

export const COMPARISON_SECTIONS: ComparisonSection[] = [
	{
		title: 'Core Data & Dashboards',
		rows: [
			{
				label: 'Overview of chains & protocol metrics',
				values: {
					free: 'check',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Yields and stablecoins dashboards',
				values: {
					free: 'check',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Token unlock schedules',
				values: {
					free: 'check',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Funding rounds & raises',
				values: {
					free: 'check',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			}
		]
	},
	{
		title: 'Analysis & AI Tools',
		rows: [
			{
				label: 'LlamaAI: Conversational Analytics',
				link: '/ai',
				values: {
					free: 'limited',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				},
				tooltips: {
					free: '1 question per day'
				}
			},
			{
				label: 'Deep research',
				values: {
					free: 'limited',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				},
				tooltips: {
					free: '1 report every 2 weeks'
				}
			},
			{
				label: 'Custom DefiLlama Pro Dashboards',
				values: {
					free: 'limited',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				},
				tooltips: {
					free: '1 public dashboard'
				}
			},
			{
				label: 'Custom Columns for personalized analysis',
				wrapLabel: true,
				values: {
					free: 'dash',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Access to DefiLlama Sheets',
				link: '/sheets',
				values: {
					free: 'dash',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'CSV data downloads',
				values: {
					free: 'dash',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Full access to LlamaFeed',
				values: {
					free: 'dash',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			}
		]
	},
	{
		title: 'API Access',
		rows: [
			{
				label: 'Access to free API endpoints',
				link: 'https://api-docs.defillama.com/',
				wrapLabel: true,
				values: {
					free: 'check',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Premium endpoints: prices, inflows, token unlocks, and more',
				link: 'https://api-docs.defillama.com/',
				wrapLabel: true,
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Increased rate limits (1000 requests/minute)',
				wrapLabel: true,
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Increased monthly call volume (1M calls/month)',
				wrapLabel: true,
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: '$0.60 per 1,000 additional calls after 1M limit',
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Access to DefiLlama MCP Server for AI agents',
				link: '/mcp',
				wrapLabel: true,
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Priority support',
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			}
		]
	},
	{
		title: 'Custom Solutions & Data',
		rows: [
			{
				label: 'Direct raw access to our database',
				values: { free: 'dash', pro: 'dash', api: 'dash', enterprise: 'check' }
			},
			{
				label: 'Custom bespoke solutions that fit your needs',
				wrapLabel: true,
				values: { free: 'dash', pro: 'dash', api: 'dash', enterprise: 'check' }
			},
			{
				label: 'Hourly data',
				values: { free: 'dash', pro: 'dash', api: 'dash', enterprise: 'check' }
			},
			{
				label: 'Access to non-public data',
				values: { free: 'dash', pro: 'dash', api: 'dash', enterprise: 'check' }
			},
			{
				label: 'Custom data licensing agreements',
				values: { free: 'dash', pro: 'dash', api: 'dash', enterprise: 'check' }
			}
		]
	}
]

export const TRUST_LOGOS: { src: string; alt: string }[] = [
	{ src: '/assets/trusts-llama/okx.svg', alt: 'OKX' },
	{ src: '/assets/trusts-llama/coinbase.svg', alt: 'Coinbase' },
	{ src: '/assets/trusts-llama/binance.svg', alt: 'Binance' },
	{ src: '/assets/trusts-llama/chainlink.svg', alt: 'Chainlink' },
	{
		src: '/assets/trusts-llama/bis.svg',
		alt: 'Bank of International Settlements'
	},
	{ src: '/assets/trusts-llama/boc.svg', alt: 'Bank of Canada' },
	{
		src: '/assets/trusts-llama/us-treasury.svg',
		alt: 'U.S. Department of the Treasury'
	},
	{
		src: '/assets/trusts-llama/mas.svg',
		alt: 'Monetary Authority of Singapore'
	},
	{ src: '/assets/trusts-llama/boe.svg', alt: 'Bank of England' },
	{ src: '/assets/trusts-llama/imf.svg', alt: 'International Monetary Fund' },
	{
		src: '/assets/trusts-llama/nber.svg',
		alt: 'National Bureau of Economic Research'
	},
	{ src: '/assets/trusts-llama/ecb-1.svg', alt: '' },
	{ src: '/assets/trusts-llama/ecb-2.svg', alt: 'European Central Bank' }
]

export const FAQ_ITEMS: FaqItem[] = [
	{
		question: 'Can I cancel my subscription at any time?',
		answer:
			'Yes, you can cancel anytime from your account settings. Your access will remain active until the end of your billing period.'
	},
	{
		question: 'Can I pay with Crypto?',
		answer: 'Yes, crypto payment is available for monthly and yearly subscriptions on most major EVM chains.'
	},
	{
		question: 'Is there a way to try the service first?',
		answer:
			'Yes, we offer 7-day free trials for the Pro plan. You can sign up for a trial to explore the features and see if it fits your needs before committing to a subscription.'
	},
	{
		question: 'What happens if I hit my API rate limit?',
		answer:
			'You can continue to use the API, but additional calls beyond your plan’s limits will be charged at $0.60 per 1,000 calls.'
	}
]
