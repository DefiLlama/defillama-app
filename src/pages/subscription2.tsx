import Head from 'next/head'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

type PlanKey = 'free' | 'pro' | 'api' | 'enterprise'
type Availability = 'check' | 'dash'

interface FeatureItem {
	label: string
	availability: Availability
	highlightText?: boolean
}

interface FeatureSection {
	title: string
	items: FeatureItem[]
}

interface PricingCardData {
	key: PlanKey
	title: string
	priceMain?: string
	priceUnit?: string
	priceSecondary?: string
	description?: string
	sections: FeatureSection[]
	primaryCta: string
	secondaryCta?: string
	highlighted?: boolean
	recommendedLabel?: string
}

interface ComparisonRow {
	label: string
	values: Record<PlanKey, Availability>
}

interface ComparisonSection {
	title: string
	rows: ComparisonRow[]
}

const PLAN_ORDER: PlanKey[] = ['free', 'pro', 'api', 'enterprise']

const PRICING_CARDS: PricingCardData[] = [
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
		priceMain: '$49',
		priceUnit: '/month',
		priceSecondary: '$588 /year',
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
		description: 'Includes all Pro tier features',
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
		sections: [
			{
				title: 'Custom Solutions & Data',
				items: [
					{ label: 'Includes all Pro & API tier features', availability: 'check' },
					{ label: 'Direct raw access to our database', availability: 'check' },
					{ label: 'Custom bespoke solutions that fit your needs', availability: 'check' },
					{ label: 'Hourly data', availability: 'check' },
					{ label: 'Access to non-public data, such as TVL breakdowns by token address', availability: 'check' },
					{ label: 'Custom data licensing agreements', availability: 'check' }
				]
			}
		],
		primaryCta: 'Contact Us'
	}
]

const COMPARISON_SECTIONS: ComparisonSection[] = [
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

const TRUST_LOGOS = [
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

const FAQ_ITEMS = [
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

function FeatureBullet({ item }: { item: FeatureItem }) {
	return (
		<li className="flex items-start gap-2">
			<span className="shrink-0">
				{item.availability === 'check' ? (
					<Icon name="check" height={20} width={20} className="text-[#4B86DB]" />
				) : (
					<Icon name="minus" height={20} width={20} className="text-[#5F6369]" />
				)}
			</span>
			<span className={`pt-0.5 text-[12px] leading-4 ${item.highlightText ? 'text-[#5EA2FF] underline' : item.availability === 'check' ? 'text-[#F6F7F9]' : 'text-[#71757C]'}`}>
				{item.label}
			</span>
		</li>
	)
}

function PricingCard({ card }: { card: PricingCardData }) {
	const isHighlighted = card.highlighted === true
	const cardBorder = isHighlighted ? 'border-[#1F67D2] border-2' : 'border border-[#2F3336]'
	const cardWidth = card.key === 'pro' ? 'w-[284px]' : 'w-[284px]'
	const cardInnerWidth = card.key === 'pro' ? 'w-[248px]' : 'w-[252px]'

	return (
		<div className={`relative h-[706px] ${cardWidth}`}>
			<div className={`flex h-full flex-col justify-between overflow-hidden rounded-[24px] bg-[#131516] px-4 py-6 ${cardBorder}`}>
				<div className={`mx-auto flex flex-col gap-5 ${cardInnerWidth}`}>
					<div className="flex min-h-[104px] flex-col gap-3">
						<h3 className="text-[18px] leading-[22px] font-semibold text-white">{card.title}</h3>
						{card.priceMain ? (
							<div className="flex items-end gap-0.5">
								<p className="bg-linear-to-r from-[#4B86DB] to-[#A5C3ED] bg-clip-text text-[42px] leading-[42px] font-semibold text-transparent">
									{card.priceMain}
								</p>
								<p className="text-base leading-6 text-[#C6C6C6]">{card.priceUnit}</p>
							</div>
						) : null}
						{card.priceSecondary ? <p className="text-[24px] leading-6 text-[#878787]">{card.priceSecondary}</p> : null}
						{card.description ? <p className="text-[12px] leading-4 text-[#F6F7F9]">{card.description}</p> : null}
					</div>

					{card.sections.map((section) => (
						<div key={`${card.key}-${section.title}`} className="flex flex-col gap-3">
							<h4 className="text-[16px] leading-5 font-medium text-white">{section.title}</h4>
							<ul className="flex flex-col gap-2">
								{section.items.map((item) => (
									<FeatureBullet key={`${card.key}-${section.title}-${item.label}`} item={item} />
								))}
							</ul>
						</div>
					))}
				</div>

				<div className={`mx-auto flex w-full flex-col gap-3 ${cardInnerWidth}`}>
					{card.secondaryCta ? (
						<button className="h-10 w-full rounded-lg border border-[#2F3336] text-sm font-medium text-white">
							{card.secondaryCta}
						</button>
					) : null}
					<button className="h-10 w-full rounded-lg bg-[#1F67D2] text-sm font-medium text-white">{card.primaryCta}</button>
				</div>
			</div>

			{card.recommendedLabel ? (
				<div className="absolute right-0 bottom-[-39px] left-0 h-[39px] rounded-b-[16px] bg-[#1F67D2] text-center text-[14px] leading-[39px] text-[#9FC8FF]">
					{card.recommendedLabel}
				</div>
			) : null}
		</div>
	)
}

function ComparisonCell({ value, plan }: { value: Availability; plan: PlanKey }) {
	const isPro = plan === 'pro'
	const cellBase =
		'flex h-full w-[146px] items-center justify-center border-l border-[#232628] text-center'

	return (
		<div
			className={`${cellBase} ${isPro ? 'border-x border-[#1F67D2] bg-[#1F67D20D]' : ''} ${plan === 'enterprise' ? 'border-r' : ''}`}
		>
			{value === 'check' ? (
				<Icon name="check" height={16} width={16} className="text-[#4B86DB]" />
			) : (
				<Icon name="minus" height={16} width={16} className="text-[#4D5158]" />
			)}
		</div>
	)
}

export default function Subscription2() {
	return (
		<>
			<Head>
				<title>Subscribe v2 - DefiLlama</title>
			</Head>

			<div className="relative min-h-screen overflow-x-hidden bg-[#02070B] text-white">
				<div className="absolute inset-x-0 top-0 h-[476px] overflow-hidden">
					<div
						className="absolute inset-0 opacity-30"
						style={{
							backgroundImage:
								'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
							backgroundSize: '53px 53px'
						}}
					/>
					<div className="absolute top-[-580px] left-1/2 h-[1056px] w-[1282px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,55,84,0.8)_0%,rgba(8,16,25,0.55)_38%,rgba(2,7,11,0)_70%)]" />
					<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,11,0)_0%,#02070B_100%)]" />
				</div>

				<header className="relative z-20 flex h-12 items-center justify-between bg-[#090B0CCC] px-[42px] backdrop-blur-[6px]">
					<BasicLink href="/" className="flex items-center gap-2 text-xs text-white">
						<Icon name="chevron-left" height={16} width={16} />
						Back
					</BasicLink>

					<div className="flex items-center gap-5">
						<div className="flex items-center rounded-full bg-[#131516] p-0.5">
							<button className="flex h-7 w-7 items-center justify-center rounded-full text-[#8C8F95]">
								<Icon name="sun" height={16} width={16} />
							</button>
							<button className="flex h-7 w-7 items-center justify-center rounded-full bg-[#232628] text-white">
								<Icon name="moon" height={16} width={16} />
							</button>
						</div>
						<button className="h-8 rounded-lg bg-[#1F67D2] px-3 text-xs text-white">Sign-in</button>
					</div>
				</header>

				<main className="relative z-10">
					<section className="mx-auto flex max-w-[1440px] flex-col items-center px-[128px] pt-[80px] pb-[128px]">
						<div className="flex w-[533px] flex-col items-center gap-9 text-center">
							<img src="/assets/defillama-dark.webp" alt="DefiLlama" className="h-10 w-auto" />
							<div className="flex flex-col items-center gap-7">
								<h1 className="text-[32px] leading-[42px] font-semibold text-[#F5F7FB]">
									The Smartest Way to Navigate
									<br />
									On-Chain Data
								</h1>
								<p className="w-[485px] text-[14px] leading-[21px] text-[#C6C6C6]">
									Upgrade now for access to LlamaAI, Pro dashboard builder, increased API limits, premium API endpoints
									and more.
								</p>
							</div>
						</div>

						<div className="mt-12 flex flex-col items-center gap-5">
							<div className="flex w-[236px] rounded-full bg-[#131516] p-1">
								<button className="h-12 w-28 rounded-full bg-[#1F67D2] text-sm font-medium text-white">Monthly</button>
								<button className="flex h-12 w-28 flex-col items-center justify-center text-sm font-medium text-white">
									<span>Yearly</span>
									<span className="text-[10px] leading-3 text-[#A5C3ED]">2 months free</span>
								</button>
							</div>
							<p className="text-xs text-[#C6C6C6]">Cancel Anytime, Crypto &amp; Card Payments</p>
						</div>

						<div className="mt-9 flex items-start justify-center gap-4">
							{PRICING_CARDS.map((card) => (
								<PricingCard key={card.key} card={card} />
							))}
						</div>
					</section>

					<section className="bg-[#090E13] py-20">
						<div className="mx-auto w-[984px]">
							<div className="flex">
								<div className="flex h-[129px] w-[400px] items-center rounded-tl-[24px] px-4">
									<h2 className="w-[220px] text-[24px] leading-[34px] font-semibold text-white">Compare Plans and Features</h2>
								</div>

								<div className="flex h-[129px] w-[584px] rounded-t-[24px] border-t border-[#232628]">
									{PLAN_ORDER.map((plan, index) => {
										const meta =
											plan === 'free'
												? { title: 'Free', price: '$0/month', action: 'Get Started' }
												: plan === 'pro'
													? { title: 'Pro', price: '$49/month', action: 'Get Started' }
													: plan === 'api'
														? { title: 'API', price: '$300/month', action: 'Get Started' }
														: { title: 'Enterprise', price: 'Custom', action: 'Contact us' }

										const isPro = plan === 'pro'
										const roundedStart = index === 0 ? 'rounded-tl-[24px]' : ''
										const roundedEnd = index === PLAN_ORDER.length - 1 ? 'rounded-tr-[24px]' : ''

										return (
											<div
												key={`plan-head-${plan}`}
												className={`w-[146px] border-t ${isPro ? 'border-x border-[#1F67D2] bg-[#1F67D20D] rounded-t-[16px]' : 'border-[#232628]'} ${roundedStart} ${roundedEnd}`}
											>
												<div className="flex h-full flex-col justify-between p-5">
													<div>
														<p className="text-lg leading-5 font-medium text-white">{meta.title}</p>
														<p className={`text-sm ${plan === 'enterprise' ? 'text-[#4B86DB]' : 'text-[#C6C6C6]'}`}>{meta.price}</p>
													</div>
													<button
														className={`h-8 rounded-lg border text-xs ${
															isPro
																? 'border-[#1F67D2] bg-[#1F67D2] text-white'
																: 'border-[#2F3336] bg-transparent text-white'
														}`}
													>
														{meta.action}
													</button>
												</div>
											</div>
										)
									})}
								</div>
							</div>

							<div className="overflow-hidden rounded-b-[24px]">
								{COMPARISON_SECTIONS.map((section) => (
									<div key={section.title}>
										<div className="flex h-9 bg-[#181A1B]">
											<div className="flex w-[400px] items-center px-4 text-[16px] leading-5 font-medium text-white">
												{section.title}
											</div>
											{PLAN_ORDER.map((plan) => (
												<div
													key={`${section.title}-header-${plan}`}
													className={`w-[146px] border-l border-[#232628] ${plan === 'pro' ? 'border-x border-[#1F67D2] bg-[#1F67D20D]' : ''} ${plan === 'enterprise' ? 'border-r' : ''}`}
												/>
											))}
										</div>

										{section.rows.map((row) => (
											<div key={`${section.title}-${row.label}`} className="flex h-9 border-b border-[#232628]">
												<div className="flex w-[400px] items-center px-4 text-xs text-[#C6C6C6]">{row.label}</div>
												{PLAN_ORDER.map((plan) => (
													<ComparisonCell key={`${section.title}-${row.label}-${plan}`} value={row.values[plan]} plan={plan} />
												))}
											</div>
										))}
									</div>
								))}
							</div>
						</div>
					</section>

					<section className="mx-auto flex max-w-[1440px] flex-col items-center px-[128px] py-20">
						<div className="flex w-[448px] flex-col items-center gap-4 text-center">
							<h2 className="text-[20px] leading-7 font-semibold text-white">Trusted by DeFi Natives and Global Regulators</h2>
							<p className="text-[14px] leading-[21px] text-[#C6C6C6]">From top crypto exchanges to global central banks</p>
						</div>

						<div className="mt-9 grid w-[1184px] grid-cols-4 gap-4">
							{TRUST_LOGOS.map((logoSrc) => (
								<div key={logoSrc} className="flex h-[68px] items-center justify-center">
									<img src={logoSrc} alt="" className="max-h-[40px] max-w-[210px] object-contain opacity-80" />
								</div>
							))}
						</div>
						<div className="mt-4 flex h-[68px] w-[284px] items-center justify-center">
							<img src="/assets/trusts-llama/cftc.svg" alt="" className="max-h-[41px] object-contain opacity-80" />
						</div>

						<div className="mt-32 w-[384px]">
							<h2 className="text-center text-[20px] leading-7 font-semibold text-white">Frequently Asked Questions</h2>
							<div className="mt-9 flex flex-col gap-4">
								{FAQ_ITEMS.map((item) => (
									<div key={item.question} className="border-b border-[#232628] pb-4">
										<div className="flex items-center justify-between gap-4">
											<p className="text-xs leading-4 text-white">{item.question}</p>
											<Icon name="x" height={16} width={16} className="text-white" />
										</div>
										<p className="mt-2 text-xs leading-4 text-[#C6C6C6]">{item.answer}</p>
									</div>
								))}
							</div>
						</div>
					</section>
				</main>

				<footer className="px-[128px] pb-8">
					<div className="h-px w-full bg-[#232628]" />
					<div className="mt-8 flex flex-col gap-6">
						<div className="flex items-center justify-between">
							<img src="/assets/defillama-dark.webp" alt="DefiLlama" className="h-7 w-[83px] object-contain object-left" />
							<div className="flex items-center gap-2">
								<button className="rounded-full p-1 text-[#878787]">
									<Icon name="chat" height={20} width={20} />
								</button>
								<button className="rounded-full p-1 text-[#878787]">
									<Icon name="twitter" height={20} width={20} />
								</button>
								<button className="rounded-full p-1 text-[#878787]">
									<Icon name="github" height={20} width={20} />
								</button>
							</div>
						</div>
						<div className="flex items-center justify-between text-xs text-[#878787]">
							<p>© 2025 DefiLlama. All rights reserved.</p>
							<div className="flex items-center gap-8">
								<a href="mailto:support@defillama.com">Contact Us</a>
								<BasicLink href="/privacy-policy">Privacy Policy</BasicLink>
								<BasicLink href="/subscription/fulfillment-policies">Fulfillment Policies</BasicLink>
								<BasicLink href="/terms">Terms of Service</BasicLink>
							</div>
						</div>
					</div>
				</footer>
			</div>
		</>
	)
}
