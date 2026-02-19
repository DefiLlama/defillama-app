import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '~/components/Nav/ThemeSwitch'
import { ComparisonCell, PricingCard } from '~/containers/subscription/components'
import { PLAN_META_BY_CYCLE } from '~/containers/subscription/data'
import type { BillingCycle, ComparisonSection, FaqItem, PlanKey, PricingCardData } from '~/containers/subscription/types'

/* ── Style maps ─────────────────────────────────────────────────────── */

const planHeadStyles = {
	pro: 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d) md:rounded-t-[16px]',
	default: 'border-(--sub-mobile-table-border) md:border-(--sub-desktop-table-border) md:bg-white'
}

const planHeadButtonStyles = {
	pro: 'border-(--sub-c-1f67d2) bg-(--sub-c-1f67d2) text-white',
	default:
		'border-(--sub-c-c8d4e4) bg-white text-(--sub-c-1e293b) dark:border-(--sub-c-2f3336) dark:bg-transparent dark:text-white md:border-(--sub-c-dedede) md:text-(--sub-c-090b0c)'
}

const proColumnHighlight = 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)'

/* ── Background ─────────────────────────────────────────────────────── */

export function SubscriptionBackground() {
	return (
		<div className="absolute inset-x-0 top-0 h-[625px] overflow-hidden md:h-[476px]">
			<div className="absolute inset-0 opacity-55 [background-image:var(--sub-grid-image-light)] [background-size:52px_52px] dark:opacity-30 dark:[background-image:var(--sub-grid-image-dark)]" />
			<div className="absolute top-0 left-1/2 h-[624px] w-[468px] -translate-x-1/2 rounded-full [background-image:var(--sub-radial-mobile-light)] md:top-[-580px] md:h-[1056px] md:w-[1282px] md:[background-image:var(--sub-radial-desktop-light)] dark:[background-image:var(--sub-radial-mobile-dark)] dark:md:[background-image:var(--sub-radial-desktop-dark)]" />
			<div className="absolute inset-0 [background-image:var(--sub-top-gradient-light)] dark:[background-image:var(--sub-top-gradient-dark)]" />
		</div>
	)
}

/* ── Header (responsive) ────────────────────────────────────────────── */

export function SubscriptionHeader() {
	return (
		<>
			{/* Mobile */}
			<header className="relative z-20 flex h-16 items-center justify-between bg-(--sub-c-fbfbfbcc) px-4 backdrop-blur-[12px] md:hidden dark:bg-(--sub-c-090b0ccc)">
				<BasicLink href="/" className="flex h-10 w-10 items-center justify-center rounded-full">
					<Icon name="chevron-left" height={28} width={28} />
				</BasicLink>
				<div className="flex items-center gap-4">
					<ThemeSwitch variant="pill" />
					<button
						type="button"
						className="h-10 rounded-lg bg-(--sub-c-1f67d2) px-4 text-[14px] leading-[17px] font-medium text-white"
					>
						Sign-in
					</button>
				</div>
			</header>

			{/* Desktop */}
			<header className="relative z-20 hidden h-12 items-center justify-between bg-(--sub-c-fbfbfbcc) px-[42px] backdrop-blur-[12px] md:flex dark:bg-(--sub-c-090b0ccc)">
				<BasicLink href="/" className="flex items-center gap-2 text-xs text-(--sub-c-090b0c) dark:text-white">
					<Icon name="chevron-left" height={16} width={16} />
					Back
				</BasicLink>
				<div className="flex items-center gap-5">
					<ThemeSwitch variant="pill" size="sm" />
					<button type="button" className="h-8 rounded-lg bg-(--sub-c-1f67d2) px-3 text-xs text-white">
						Sign-in
					</button>
				</div>
			</header>
		</>
	)
}

/* ── Pricing Section (responsive) ───────────────────────────────────── */

export function SubscriptionPricingSection({
	pricingCards,
	billingCycle,
	onBillingCycleChange
}: {
	pricingCards: PricingCardData[]
	billingCycle: BillingCycle
	onBillingCycleChange: (nextBillingCycle: BillingCycle) => void
}) {
	const isMonthly = billingCycle === 'monthly'
	const isYearly = billingCycle === 'yearly'

	return (
		<section className="mx-auto flex max-w-[393px] flex-col items-center px-4 pt-14 md:max-w-[1440px] md:px-[128px] md:pt-[80px] md:pb-[128px]">
			<div className="flex w-full flex-col items-center gap-9 text-center md:w-[533px]">
				<div className="flex flex-col items-center">
					<div className="dark:hidden">
						<img src="/assets/defillama-dark-neutral.webp" alt="DefiLlama" className="h-14 w-auto md:hidden" />
						<img src="/assets/defillama-dark.webp" alt="DefiLlama" className="hidden h-10 w-auto md:block" />
					</div>
					<img src="/assets/defillama.webp" alt="DefiLlama" className="hidden h-14 w-auto dark:block md:h-10" />
				</div>
				<div className="flex w-full flex-col items-center gap-7">
					<h1 className="text-[32px] leading-[42px] font-semibold text-(--sub-c-090b0c) dark:text-(--sub-c-f5f7fb)">
						The Smartest Way to Navigate{' '}
						<br className="hidden md:inline" />
						On-Chain Data
					</h1>
					<p className="text-[16px] leading-6 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6) md:w-[485px] md:text-[14px] md:leading-[21px] md:text-(--sub-c-484848)">
						Upgrade now for access to LlamaAI, Pro dashboard builder, increased API limits, premium API endpoints and
						more.
					</p>
				</div>
			</div>

			<div className="mt-9 flex flex-col items-center gap-3 md:mt-12 md:gap-5">
				<div className="flex w-[268px] rounded-full bg-(--sub-c-e3ebf6) p-1 dark:bg-(--sub-c-131516) md:w-[236px]">
					<button
						type="button"
						onClick={() => onBillingCycleChange('monthly')}
						className={`h-14 w-32 rounded-full text-[16px] leading-5 font-medium md:h-12 md:w-28 md:text-sm ${
							isMonthly ? 'bg-(--sub-c-1f67d2) text-white' : 'text-(--sub-c-25364e) dark:text-white md:text-(--sub-c-090b0c)'
						}`}
					>
						Monthly
					</button>
					<button
						type="button"
						onClick={() => onBillingCycleChange('yearly')}
						className={`flex h-14 w-32 flex-col items-center justify-center rounded-full text-[16px] leading-5 font-medium md:h-12 md:w-28 md:text-sm ${
							isYearly ? 'bg-(--sub-c-1f67d2) text-white' : 'text-(--sub-c-25364e) dark:text-white md:text-(--sub-c-090b0c)'
						}`}
					>
						<span>Yearly</span>
						<span
							className={`text-[12px] leading-4 md:text-[10px] md:leading-3 ${isYearly ? 'text-(--sub-c-a5c3ed)' : 'text-(--sub-c-4b86db) dark:text-(--sub-c-a5c3ed)'}`}
						>
							2 months free
						</span>
					</button>
				</div>
				<p className="text-[12px] leading-4 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6) md:text-(--sub-c-484848)">
					Cancel Anytime, Crypto &amp; Card Payments
				</p>
			</div>

			<div className="mt-9 flex w-full flex-col gap-6 md:w-auto md:flex-row md:items-start md:justify-center md:gap-4">
				{pricingCards.map((card) => (
					<PricingCard key={card.key} card={card} />
				))}
			</div>
		</section>
	)
}

/* ── Comparison Plan Header ──────────────────────────────────────────── */

function ComparisonPlanHead({
	plan,
	billingCycle,
	isFirst,
	isLast
}: {
	plan: PlanKey
	billingCycle: BillingCycle
	isFirst: boolean
	isLast: boolean
}) {
	const meta = PLAN_META_BY_CYCLE[billingCycle][plan]
	const isPro = plan === 'pro'
	const colStyle = isPro ? planHeadStyles.pro : planHeadStyles.default
	const btnStyle = isPro ? planHeadButtonStyles.pro : planHeadButtonStyles.default

	return (
		<div
			className={`w-[132px] border-t md:w-[146px] ${colStyle} ${isFirst ? 'rounded-tl-[16px] md:rounded-tl-[24px]' : ''} ${isLast ? 'rounded-tr-[16px] md:rounded-tr-[24px]' : ''}`}
		>
			<div className="flex h-full flex-col justify-between p-3 md:p-5">
				<div>
					<p className="text-[14px] leading-4 font-medium text-(--sub-c-111f34) dark:text-white md:text-lg md:leading-5 md:text-(--sub-c-090b0c)">
						{meta.title}
					</p>
					<p
						className={`mt-1 text-[12px] leading-4 md:text-sm ${plan === 'enterprise' ? 'text-(--sub-c-4b86db)' : 'text-(--sub-mobile-text-muted) md:text-(--sub-desktop-text-muted)'}`}
					>
						{meta.price}
					</p>
				</div>
				<button
					type="button"
					className={`h-7 rounded-[6px] border px-2 text-[10px] leading-3 md:h-8 md:rounded-lg md:text-xs ${btnStyle}`}
				>
					{meta.action}
				</button>
			</div>
		</div>
	)
}

/* ── Comparison Section (responsive) ────────────────────────────────── */

export function SubscriptionComparisonSection({
	planOrder,
	comparisonSections,
	billingCycle
}: {
	planOrder: PlanKey[]
	comparisonSections: ComparisonSection[]
	billingCycle: BillingCycle
}) {
	return (
		<section className="mt-12 py-12 bg-(--sub-mobile-table-section-bg) md:mt-0 md:py-20 md:bg-(--sub-desktop-table-section-bg)">
			<div className="mx-auto max-w-[393px] px-4 md:max-w-none md:w-[984px] md:px-0">
				<div className="overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<div className="min-w-[761px] md:min-w-0">
						<div className="flex">
							<div className="flex h-[132px] w-[233px] items-center px-2 md:h-[129px] md:w-[400px] md:rounded-tl-[24px] md:px-4">
								<h2 className="text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white md:w-[220px] md:text-[24px] md:leading-[34px] md:text-(--sub-c-090b0c)">
									Compare Plans and Features
								</h2>
							</div>

							<div className="flex h-[132px] w-[528px] rounded-t-[16px] border-t border-(--sub-mobile-table-border) md:h-[129px] md:w-[584px] md:rounded-t-[24px] md:border-(--sub-desktop-table-border)">
								{planOrder.map((plan, index) => (
									<ComparisonPlanHead
										key={`plan-head-${plan}`}
										plan={plan}
										billingCycle={billingCycle}
										isFirst={index === 0}
										isLast={index === planOrder.length - 1}
									/>
								))}
							</div>
						</div>

						<div className="overflow-hidden rounded-b-[16px] border-x border-b border-(--sub-mobile-table-border) md:rounded-b-[24px] md:border-(--sub-desktop-table-border)">
							{comparisonSections.map((section) => (
								<div key={section.title}>
									<div className="flex h-10 bg-(--sub-mobile-table-header-bg) md:h-9 md:bg-(--sub-desktop-table-header-bg)">
										<div className="flex w-[233px] items-center px-2 text-[14px] leading-[21px] font-medium text-(--sub-c-111f34) dark:text-white md:w-[400px] md:px-4 md:text-[16px] md:leading-5 md:text-(--sub-c-090b0c)">
											{section.title}
										</div>
										{planOrder.map((plan) => (
											<div
												key={`${section.title}-header-${plan}`}
												className={`w-[132px] border-l border-(--sub-mobile-table-border) md:w-[146px] md:border-(--sub-desktop-table-border) ${plan === 'pro' ? proColumnHighlight : ''} ${plan === 'enterprise' ? 'border-r' : ''}`}
											/>
										))}
									</div>

									{section.rows.map((row) => (
										<div
											key={`${section.title}-${row.label}`}
											className={`flex border-b border-(--sub-mobile-table-border) md:h-9 md:border-(--sub-desktop-table-border) ${
												row.label.length > 40 ? 'min-h-[62px] md:min-h-0' : 'h-[41px]'
											}`}
										>
											<div className="flex w-[233px] items-center px-2 text-[14px] leading-[21px] text-(--sub-mobile-text-muted) md:w-[400px] md:px-4 md:text-xs md:text-(--sub-desktop-text-muted)">
												{row.label}
											</div>
											{planOrder.map((plan) => (
												<ComparisonCell
													key={`${section.title}-${row.label}-${plan}`}
													value={row.values[plan]}
													plan={plan}
												/>
											))}
										</div>
									))}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

/* ── Trusted Block (responsive) ─────────────────────────────────────── */

export function SubscriptionTrustedBlock({ trustLogos }: { trustLogos: string[] }) {
	return (
		<div className="flex w-full flex-col items-center md:w-auto">
			<div className="flex w-full flex-col items-center gap-2 text-center md:w-[448px] md:gap-4">
				<h2 className="text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c)">
					Trusted by DeFi Natives and Global Regulators
				</h2>
				<p className="text-[12px] leading-4 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6) md:text-[14px] md:leading-[21px] md:text-(--sub-c-484848)">
					From top crypto exchanges to global central banks
				</p>
			</div>

			<div className="mt-6 grid w-full grid-cols-2 gap-x-4 gap-y-4 md:mt-9 md:w-[1184px] md:grid-cols-4">
				{trustLogos.map((src) => (
					<div
						key={src}
						className="flex h-[56px] items-center justify-center md:h-[68px]"
					>
						<img
							src={src}
							alt=""
							className="max-h-[28px] max-w-[150px] object-contain opacity-90 dark:opacity-80 md:max-h-[40px] md:max-w-[210px]"
						/>
					</div>
				))}
			</div>
			<div className="mt-2 flex h-[56px] w-full items-center justify-center md:mt-4 md:h-[68px] md:w-[284px]">
				<img
					src="/assets/trusts-llama/cftc.svg"
					alt=""
					className="max-h-[30px] object-contain opacity-90 dark:opacity-80 md:max-h-[41px]"
				/>
			</div>
		</div>
	)
}

/* ── FAQ Block (responsive) ─────────────────────────────────────────── */

export function SubscriptionFaqBlock({ faqItems }: { faqItems: FaqItem[] }) {
	const [expandedQuestion, setExpandedQuestion] = useState<string | null>(faqItems[0]?.question ?? null)

	return (
		<div className="mt-16 w-full md:mt-32 md:w-[384px]">
			<h2 className="text-center text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c)">
				Frequently Asked Questions
			</h2>
			<div className="mt-7 md:mt-9 md:flex md:flex-col md:gap-4">
				{faqItems.map((item, index) => {
					const answerId = `subscription-faq-answer-${index}`
					const isExpanded = expandedQuestion === item.question

					return (
						<div
							key={item.question}
							className="border-b border-(--sub-mobile-table-border) py-4 md:border-(--sub-desktop-table-border) md:py-0 md:pb-4"
						>
							<button
								type="button"
								aria-expanded={isExpanded}
								aria-controls={answerId}
								onClick={() => setExpandedQuestion(isExpanded ? null : item.question)}
								className="flex w-full items-center justify-between gap-4 text-left"
							>
								<p className="text-[12px] leading-4 text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c)">
									{item.question}
								</p>
								<Icon
									name={isExpanded ? 'minus' : 'plus'}
									height={16}
									width={16}
									className="text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c)"
								/>
							</button>
							{isExpanded ? (
								<p id={answerId} className="mt-2 text-xs leading-4 text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6)">
									{item.answer}
								</p>
							) : null}
						</div>
					)
				})}
			</div>
		</div>
	)
}

/* ── Footer (responsive) ────────────────────────────────────────────── */

export function SubscriptionFooter() {
	return (
		<>
			{/* Mobile */}
			<footer className="px-4 pb-6 md:hidden">
				<div className="h-px w-full bg-(--sub-desktop-table-border)" />
				<div className="mt-6 flex items-center justify-between">
					<div className="flex flex-col items-start">
						<img
							src="/assets/defillama-dark-neutral.webp"
							alt="DefiLlama"
							className="h-7 w-auto object-contain object-left dark:hidden"
						/>
						<img
							src="/assets/defillama.webp"
							alt="DefiLlama"
							className="hidden h-7 w-auto object-contain object-left dark:block"
						/>
					</div>
					<SocialIcons size={18} />
				</div>
				<div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] leading-3 text-(--sub-footer-text)">
					<FooterLinks />
				</div>
				<p className="mt-4 text-[10px] leading-3 text-(--sub-footer-text)">&copy; 2025 DefiLlama. All rights reserved.</p>
			</footer>

			{/* Desktop */}
			<footer className="hidden px-[128px] pb-8 md:block">
				<div className="h-px w-full bg-(--sub-desktop-table-border)" />
				<div className="mt-8 flex flex-col gap-6">
					<div className="flex items-center justify-between">
						<div className="flex flex-col items-start">
							<img
								src="/assets/defillama-dark.webp"
								alt="DefiLlama"
								className="h-7 w-[83px] object-contain object-left dark:hidden"
							/>
							<img
								src="/assets/defillama.webp"
								alt="DefiLlama"
								className="hidden h-7 w-[83px] object-contain object-left dark:block"
							/>
						</div>
						<SocialIcons size={20} />
					</div>
					<div className="flex items-center justify-between text-xs text-(--sub-footer-text)">
						<p>&copy; 2025 DefiLlama. All rights reserved.</p>
						<div className="flex items-center gap-8">
							<FooterLinks />
						</div>
					</div>
				</div>
			</footer>
		</>
	)
}

/* ── Footer sub-components ──────────────────────────────────────────── */

function SocialIcons({ size }: { size: number }) {
	return (
		<div className="flex items-center gap-2">
			<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
				<Icon name="chat" height={size} width={size} />
			</button>
			<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
				<Icon name="twitter" height={size} width={size} />
			</button>
			<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
				<Icon name="github" height={size} width={size} />
			</button>
		</div>
	)
}

function FooterLinks() {
	return (
		<>
			<a href="mailto:support@defillama.com">Contact Us</a>
			<BasicLink href="/privacy-policy">Privacy Policy</BasicLink>
			<BasicLink href="/subscription/fulfillment-policies">Fulfillment Policies</BasicLink>
			<BasicLink href="/terms">Terms of Service</BasicLink>
		</>
	)
}
