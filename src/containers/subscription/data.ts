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
		api: { title: 'API', price: '$3000/year', action: 'Get Started' },
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
					{ label: 'Overview of chains & protocol metrics', availability: 'check' },
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
					{ label: 'LlamaAI: Conversational Analytics', availability: 'check', highlightText: true },
					{ label: 'Custom DefiLlama Pro Dashboards', availability: 'check' },
					{ label: 'Access to DefiLlama Sheets', availability: 'check' },
					{ label: 'CSV data downloads', availability: 'check' },
					{ label: 'Full access to LlamaFeed', availability: 'check' },
					{ label: 'Upcoming premium products', availability: 'check' }
				]
			}
		],
		primaryCta: 'Pay with Card',
		secondaryCta: 'Pay with Crypto',
		highlighted: true,
		recommendedLabel: 'Recommended'
	},
	{
		key: 'api',
		title: 'API',
		priceMain: '$300',
		priceUnit: '/month',
		priceSecondary: '$3,600 /year',
		includedTierText: 'Includes all Pro tier features',
		sections: [
			{
				title: 'API Access',
				items: [
					{ label: 'Access to TVL, revenue/fees and prices API endpoints', availability: 'check' },
					{ label: 'Access to all data (unlocks, active users, token liq...)', availability: 'check' },
					{ label: 'Priority support', availability: 'check' },
					{ label: '1000 requests/minute', availability: 'check' },
					{ label: '1M calls/month', availability: 'check' },
					{ label: '$0.60 per 1,000 additional calls after 1M limit', availability: 'check' }
				]
			}
		],
		primaryCta: 'Pay with Card',
		secondaryCta: 'Pay with Crypto'
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
					{ label: 'Custom bespoke solutions that fit your needs', availability: 'check' },
					{ label: 'Hourly data', availability: 'check' },
					{ label: 'Access to non-public data, such as TVL breakdowns by token address', availability: 'check' },
					{ label: '1M calls/month', availability: 'check' },
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
					{ label: 'Overview of chains & protocol metrics', availability: 'check' },
					{ label: 'Yields and stablecoins dashboards', availability: 'check' },
					{ label: 'Token unlock schedules', availability: 'check' },
					{ label: 'Funding rounds & raises', availability: 'check' }
				]
			},
			{
				title: 'Analysis & AI Tools',
				items: [
					{ label: 'LlamaAI: Conversational Analytics', availability: 'dash' },
					{ label: 'Custom DefiLlama Pro Dashboards', availability: 'dash' },
					{ label: 'Access to DefiLlama Sheets', availability: 'dash' },
					{ label: 'CSV data downloads', availability: 'dash' },
					{ label: 'Full access to LlamaFeed', availability: 'dash' },
					{ label: 'Upcoming premium products', availability: 'dash' }
				]
			},
			{
				title: 'API Access',
				items: [{ label: 'API access not included', availability: 'dash' }]
			}
		],
		primaryCta: 'Get Started for Free'
	},
	{
		key: 'pro',
		title: 'Pro',
		priceMain: '$490',
		priceUnit: '/year',
		priceSecondary: '$40.83 /month',
		sections: [
			{
				title: 'Core Data & Dashboards',
				items: [
					{ label: 'Overview of chains & protocol metrics', availability: 'check' },
					{ label: 'Yields and stablecoins dashboards', availability: 'check' },
					{ label: 'Token unlock schedules', availability: 'check' },
					{ label: 'Funding rounds & raises', availability: 'check' }
				]
			},
			{
				title: 'Analysis & AI Tools',
				items: [
					{ label: 'LlamaAI: Conversational Analytics', availability: 'check', highlightText: true },
					{ label: 'Custom DefiLlama Pro Dashboards', availability: 'check' },
					{ label: 'Access to DefiLlama Sheets', availability: 'check' },
					{ label: 'CSV data downloads', availability: 'check' },
					{ label: 'Full access to LlamaFeed', availability: 'check' },
					{ label: 'Upcoming premium products', availability: 'check' }
				]
			},
			{
				title: 'API Access',
				items: [{ label: 'API access not included', availability: 'dash' }]
			}
		],
		primaryCta: 'Pay with Card',
		highlighted: true,
		recommendedLabel: 'Recommended'
	},
	{
		key: 'api',
		title: 'API',
		priceMain: '$3,000',
		priceUnit: '/year',
		priceSecondary: '$300 /month',
		includedTierText: 'Includes all Pro tier features',
		sections: [
			{
				title: 'API Access',
				items: [
					{ label: 'Access to TVL, revenue/fees and prices API endpoints', availability: 'check' },
					{ label: 'Access to all data (unlocks, active users, token liq...)', availability: 'check' },
					{ label: 'Priority support', availability: 'check' },
					{ label: '1000 requests/minute', availability: 'check' },
					{ label: '1M calls/month', availability: 'check' },
					{ label: '$0.60 per 1,000 additional calls after 1M limit', availability: 'check' }
				]
			}
		],
		primaryCta: 'Pay with Card'
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
					{ label: 'Custom bespoke solutions that fit your needs', availability: 'check' },
					{ label: 'Hourly data', availability: 'check' },
					{ label: 'Access to non-public data, such as TVL breakdowns by token address', availability: 'check' },
					{ label: '1M calls/month', availability: 'check' },
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
				values: { free: 'check', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Yields and stablecoins dashboards',
				values: { free: 'check', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Token unlock schedules',
				values: { free: 'check', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Funding rounds & raises',
				values: { free: 'check', pro: 'check', api: 'check', enterprise: 'check' }
			}
		]
	},
	{
		title: 'Analysis & AI Tools',
		rows: [
			{
				label: 'LlamaAI: Conversational Analytics',
				values: { free: 'dash', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Custom DefiLlama Pro Dashboards',
				values: { free: 'dash', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Access to DefiLlama Sheets',
				values: { free: 'dash', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'CSV data downloads',
				values: { free: 'dash', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Full access to LlamaFeed',
				values: { free: 'dash', pro: 'check', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Upcoming premium products',
				values: { free: 'dash', pro: 'check', api: 'check', enterprise: 'check' }
			}
		]
	},
	{
		title: 'API Access',
		rows: [
			{
				label: 'Access to TVL, revenue/fees and prices API endpoints',
				values: { free: 'dash', pro: 'dash', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Access to all data (unlocks, active users, token liq...)',
				values: { free: 'dash', pro: 'dash', api: 'check', enterprise: 'check' }
			},
			{
				label: 'Priority support',
				values: { free: 'dash', pro: 'dash', api: 'check', enterprise: 'check' }
			},
			{
				label: '1000 requests/minute',
				values: { free: 'dash', pro: 'dash', api: 'check', enterprise: 'check' }
			},
			{
				label: '1M calls/month',
				values: { free: 'dash', pro: 'dash', api: 'check', enterprise: 'check' }
			},
			{
				label: '$0.60 per 1,000 additional calls after 1M limit',
				values: { free: 'dash', pro: 'dash', api: 'check', enterprise: 'check' }
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
				label: 'Exclusive data, such as TVL breakdowns by token address',
				values: { free: 'dash', pro: 'dash', api: 'dash', enterprise: 'check' }
			},
			{
				label: 'Custom data licensing agreements',
				values: { free: 'dash', pro: 'dash', api: 'dash', enterprise: 'check' }
			}
		]
	}
]

export const TRUST_LOGOS = [
	'/assets/trusts-llama/okx.svg',
	'/assets/trusts-llama/coinbase.svg',
	'/assets/trusts-llama/binance.svg',
	'/assets/trusts-llama/chainlink.svg',
	'/assets/trusts-llama/bis.svg',
	'/assets/trusts-llama/boc.svg',
	'/assets/trusts-llama/us-treasury.svg',
	'/assets/trusts-llama/mas.svg',
	'/assets/trusts-llama/boe.svg',
	'/assets/trusts-llama/imf.svg',
	'/assets/trusts-llama/nber.svg',
	'/assets/trusts-llama/ecb-2.svg'
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
		question: 'Do you offer refunds?',
		answer:
			'No, we do not offer refunds for subscription payments. We recommend starting with a monthly subscription to ensure the Pro plan fits your needs before committing to a yearly plan.'
	},
	{
		question: 'What happens if I hit my API rate limit?',
		answer: 'Pending answer'
	}
]
