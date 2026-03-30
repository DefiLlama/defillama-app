import type {
	BillingCycle,
	ComparisonSection,
	FaqItem,
	PlanKey,
	PlanMeta,
	PricingCardData
} from '~/containers/subscription/types'

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

export const MONTHLY_PRICING_CARDS: PricingCardData[] = [
	{
		key: 'free',
		title: 'Free',
		priceMain: '$0',
		priceUnit: '/month',
		sections: [
			{
				title: 'Core Data & Dashboards',
				items: [
					{
						label: 'Overview of chains & protocol metrics',
						availability: 'check'
					},
					{ label: 'Yields and stablecoins dashboards', availability: 'check' },
					{ label: 'Token unlock schedules', availability: 'check' },
					{ label: 'Funding rounds & raises', availability: 'check' }
				]
			}
		],
		primaryCta: 'Get Started for Free'
	},
	{
		key: 'pro',
		title: 'Pro',
		priceMain: '$49',
		priceUnit: '/month',
		priceSecondary: '$588 /year',
		includedTierText: 'Includes all Free tier features',
		sections: [
			{
				title: 'Analysis & AI Tools',
				items: [
					{
						label: 'LlamaAI: Conversational Analytics',
						link: '/ai',
						availability: 'check',
						highlightText: true
					},
					{ label: 'Deep research: 5/day', availability: 'check' },
					{ label: 'Custom DefiLlama Pro Dashboards', availability: 'check' },
					{
						label: 'Custom Columns for personalized analysis',
						availability: 'check'
					},
					{ label: 'Access to DefiLlama Sheets', link: '/sheets', availability: 'check' },
					{ label: 'CSV data downloads', availability: 'check' },
					{ label: 'Full access to LlamaFeed', availability: 'check' }
				]
			}
		],
		primaryCta: 'Pay with Card',
		secondaryCta: 'Pay with Crypto'
	},
	{
		key: 'api',
		title: 'API',
		priceMain: '$300',
		priceUnit: '/month',
		priceSecondary: '$3,000 /year',
		includedTierText: 'Includes all Pro tier features',
		sections: [
			{
				title: 'API Access',
				items: [
					{
						label: 'Access to all data (unlocks, active users, token liq...)',
						availability: 'check'
					},
					{
						label: 'Access to TVL, revenue/fees and prices API endpoints',
						availability: 'check'
					},
					{
						label: 'Access to DefiLlama MCP Server for AI agents',
						link: '/mcp',
						availability: 'check'
					},
					{ label: 'Priority support', availability: 'check' },
					{ label: '1000 requests/minute', availability: 'check' },
					{ label: '1M calls/month', availability: 'check' },
					{
						label: '$0.60 per 1,000 additional calls after 1M limit',
						availability: 'check'
					}
				]
			}
		],
		primaryCta: 'Pay with Card',
		secondaryCta: 'Pay with Crypto',
		highlighted: true,
		recommendedLabel: 'Recommended'
	},
	{
		key: 'enterprise',
		title: 'Enterprise',
		description: 'Contact for pricing',
		includedTierText: 'Includes all Pro & API tier features',
		sections: [
			{
				title: 'Custom Solutions & Data',
				items: [
					{ label: 'Direct raw access to our database', availability: 'check' },
					{
						label: 'Custom bespoke solutions that fit your needs',
						availability: 'check'
					},
					{ label: 'Hourly data', availability: 'check' },
					{
						label: 'Access to non-public data, such as TVL breakdowns by token address',
						availability: 'check'
					},
					{ label: 'Increased API limits', availability: 'check' },
					{ label: 'Custom data licensing agreements', availability: 'check' }
				]
			}
		],
		primaryCta: 'Contact Us'
	}
]

export const YEARLY_PRICING_CARDS: PricingCardData[] = [
	{
		key: 'free',
		title: 'Free',
		priceMain: '$0',
		priceUnit: '/month',
		sections: [
			{
				title: 'Core Data & Dashboards',
				items: [
					{
						label: 'Overview of chains & protocol metrics',
						availability: 'check'
					},
					{ label: 'Yields and stablecoins dashboards', availability: 'check' },
					{ label: 'Token unlock schedules', availability: 'check' },
					{ label: 'Funding rounds & raises', availability: 'check' }
				]
			}
		],
		primaryCta: 'Get Started for Free'
	},
	{
		key: 'pro',
		title: 'Pro',
		priceMain: '$40.83',
		priceUnit: '/month',
		priceSecondary: '$490 /year',
		includedTierText: 'Includes all Free tier features',
		sections: [
			{
				title: 'Analysis & AI Tools',
				items: [
					{
						label: 'LlamaAI: Conversational Analytics',
						link: '/ai',
						availability: 'check',
						highlightText: true
					},
					{ label: 'Deep research: 5/day', availability: 'check' },
					{ label: 'Custom DefiLlama Pro Dashboards', availability: 'check' },
					{
						label: 'Custom Columns for personalized analysis',
						availability: 'check'
					},
					{ label: 'Access to DefiLlama Sheets', link: '/sheets', availability: 'check' },
					{ label: 'CSV data downloads', availability: 'check' },
					{ label: 'Full access to LlamaFeed', availability: 'check' }
				]
			}
		],
		primaryCta: 'Pay with Card',
		secondaryCta: 'Pay with Crypto'
	},
	{
		key: 'api',
		title: 'API',
		priceMain: '$250',
		priceUnit: '/month',
		priceSecondary: '$3,000 /year',
		includedTierText: 'Includes all Pro tier features',
		sections: [
			{
				title: 'API Access',
				items: [
					{
						label: 'Access to TVL, revenue/fees and prices API endpoints',
						availability: 'check'
					},
					{
						label: 'Access to all data (unlocks, active users, token liq...)',
						availability: 'check'
					},
					{ label: 'Priority support', availability: 'check' },
					{
						label: 'Access to DefiLlama MCP Server for AI agents',
						link: '/mcp',
						availability: 'check'
					},
					{ label: '1000 requests/minute', availability: 'check' },
					{ label: '1M calls/month', availability: 'check' },
					{
						label: '$0.60 per 1,000 additional calls after 1M limit',
						availability: 'check'
					}
				]
			}
		],
		primaryCta: 'Pay with Card',
		secondaryCta: 'Pay with Crypto',
		highlighted: true,
		recommendedLabel: 'Recommended'
	},
	{
		key: 'enterprise',
		title: 'Enterprise',
		description: 'Contact for pricing',
		includedTierText: 'Includes all Pro & API tier features',
		sections: [
			{
				title: 'Custom Solutions & Data',
				items: [
					{ label: 'Direct raw access to our database', availability: 'check' },
					{
						label: 'Custom bespoke solutions that fit your needs',
						availability: 'check'
					},
					{ label: 'Hourly data', availability: 'check' },
					{
						label: 'Access to non-public data, such as TVL breakdowns by token address',
						availability: 'check'
					},
					{ label: 'Increased API limits', availability: 'check' },
					{ label: 'Custom data licensing agreements', availability: 'check' }
				]
			}
		],
		primaryCta: 'Contact Us'
	}
]

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
					free: 'dash',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Deep research: 5/day',
				values: {
					free: 'dash',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Custom DefiLlama Pro Dashboards',
				values: {
					free: 'dash',
					pro: 'check',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Custom Columns for personalized analysis',
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
				label: 'Access to TVL, revenue/fees and prices API endpoints',
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: 'Access to all data (unlocks, active users, token liq...)',
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
			},
			{
				label: 'Access to DefiLlama MCP Server for AI agents',
				link: '/mcp',
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: '1000 requests/minute',
				values: {
					free: 'dash',
					pro: 'dash',
					api: 'check',
					enterprise: 'check'
				}
			},
			{
				label: '1M calls/month',
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
		answer: 'Yes, crypto payment is available for monthly subscriptions via stablecoins on most major EVM chains.'
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
