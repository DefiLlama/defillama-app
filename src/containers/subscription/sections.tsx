import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '~/components/Nav/ThemeSwitch'
import {
	ComparisonCellDesktop,
	ComparisonCellMobile,
	getPlanMeta,
	PricingCardDesktop,
	PricingCardMobile
} from '~/containers/subscription/components'
import type { ComparisonSection, FaqItem, PlanKey, PricingCardData } from '~/containers/subscription/types'

export function SubscriptionBackground() {
	return (
		<div className="absolute inset-x-0 top-0 h-[625px] overflow-hidden md:h-[476px]">
			<div className="absolute inset-0 opacity-55 [background-image:var(--sub-grid-image-light)] [background-size:52px_52px] dark:opacity-30 dark:[background-image:var(--sub-grid-image-dark)]" />
			<div className="absolute top-0 left-1/2 h-[624px] w-[468px] -translate-x-1/2 rounded-full [background-image:var(--sub-radial-mobile-light)] md:top-[-580px] md:h-[1056px] md:w-[1282px] md:[background-image:var(--sub-radial-desktop-light)] dark:[background-image:var(--sub-radial-mobile-dark)] dark:md:[background-image:var(--sub-radial-desktop-dark)]" />
			<div className="absolute inset-0 [background-image:var(--sub-top-gradient-light)] dark:[background-image:var(--sub-top-gradient-dark)]" />
		</div>
	)
}

export function SubscriptionMobileHeader() {
	return (
		<header className="relative z-20 flex h-16 items-center justify-between bg-(--sub-c-fbfbfbcc) px-4 backdrop-blur-[12px] md:hidden dark:bg-(--sub-c-090b0ccc)">
			<BasicLink href="/" className="flex h-10 w-10 items-center justify-center rounded-full">
				<Icon name="chevron-left" height={28} width={28} />
			</BasicLink>

			<div className="flex items-center gap-4">
				<ThemeSwitch variant="pill" />
				<button type="button" className="h-10 rounded-lg bg-(--sub-c-1f67d2) px-4 text-[14px] leading-[17px] font-medium text-white">
					Sign-in
				</button>
			</div>
		</header>
	)
}

export function SubscriptionDesktopHeader() {
	return (
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
	)
}

export function SubscriptionMobilePricingSection({ pricingCards }: { pricingCards: PricingCardData[] }) {
	return (
		<section className="mx-auto flex max-w-[393px] flex-col items-center px-4 pt-14">
			<div className="flex w-full flex-col items-center gap-9 text-center">
				<div className="flex flex-col items-center">
					<img src="/assets/defillama-dark-neutral.webp" alt="DefiLlama" className="h-14 w-auto dark:hidden" />
					<img src="/assets/defillama.webp" alt="DefiLlama" className="hidden h-14 w-auto dark:block" />
				</div>
				<div className="flex w-full flex-col items-center gap-7">
					<h1 className="text-[32px] leading-[42px] font-semibold text-(--sub-c-090b0c) dark:text-(--sub-c-f5f7fb)">
						The Smartest Way to Navigate On-Chain Data
					</h1>
					<p className="text-[16px] leading-6 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6)">
						Upgrade now for access to LlamaAI, Pro dashboard builder, increased API limits, premium API endpoints and more.
					</p>
				</div>
			</div>

			<div className="mt-9 flex flex-col items-center gap-3">
				<div className="flex w-[268px] rounded-full bg-(--sub-c-e3ebf6) p-1 dark:bg-(--sub-c-131516)">
					<button type="button" className="h-14 w-32 rounded-full bg-(--sub-c-1f67d2) text-[16px] leading-5 font-medium text-white">
						Monthly
					</button>
					<button
						type="button"
						className="flex h-14 w-32 flex-col items-center justify-center text-[16px] leading-5 font-medium text-(--sub-c-25364e) dark:text-white"
					>
						<span>Yearly</span>
						<span className="text-[12px] leading-4 text-(--sub-c-4b86db) dark:text-(--sub-c-a5c3ed)">2 months free</span>
					</button>
				</div>
				<p className="text-[12px] leading-4 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6)">Cancel Anytime, Crypto &amp; Card Payments</p>
			</div>

			<div className="mt-9 flex w-full flex-col gap-6">
				{pricingCards.map((card) => (
					<PricingCardMobile key={`mobile-${card.key}`} card={card} />
				))}
			</div>
		</section>
	)
}

export function SubscriptionDesktopPricingSection({ pricingCards }: { pricingCards: PricingCardData[] }) {
	return (
		<section className="mx-auto flex max-w-[1440px] flex-col items-center px-[128px] pt-[80px] pb-[128px]">
			<div className="flex w-[533px] flex-col items-center gap-9 text-center">
				<div className="flex flex-col items-center">
					<img src="/assets/defillama-dark.webp" alt="DefiLlama" className="h-10 w-auto dark:hidden" />
					<img src="/assets/defillama.webp" alt="DefiLlama" className="hidden h-10 w-auto dark:block" />
				</div>
				<div className="flex flex-col items-center gap-7">
					<h1 className="text-[32px] leading-[42px] font-semibold text-(--sub-c-090b0c) dark:text-(--sub-c-f5f7fb)">
						The Smartest Way to Navigate
						<br />
						On-Chain Data
					</h1>
					<p className="w-[485px] text-[14px] leading-[21px] text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6)">
						Upgrade now for access to LlamaAI, Pro dashboard builder, increased API limits, premium API endpoints and more.
					</p>
				</div>
			</div>

			<div className="mt-12 flex flex-col items-center gap-5">
				<div className="flex w-[236px] rounded-full bg-(--sub-c-e3ebf6) p-1 dark:bg-(--sub-c-131516)">
					<button type="button" className="h-12 w-28 rounded-full bg-(--sub-c-1f67d2) text-sm font-medium text-white">
						Monthly
					</button>
					<button type="button" className="flex h-12 w-28 flex-col items-center justify-center text-sm font-medium text-(--sub-c-090b0c) dark:text-white">
						<span>Yearly</span>
						<span className="text-[10px] leading-3 text-(--sub-c-4b86db) dark:text-(--sub-c-a5c3ed)">2 months free</span>
					</button>
				</div>
				<p className="text-xs text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6)">Cancel Anytime, Crypto &amp; Card Payments</p>
			</div>

			<div className="mt-9 flex items-start justify-center gap-4">
				{pricingCards.map((card) => (
					<PricingCardDesktop key={card.key} card={card} />
				))}
			</div>
		</section>
	)
}

export function SubscriptionMobileComparisonSection({
	planOrder,
	comparisonSections
}: {
	planOrder: PlanKey[]
	comparisonSections: ComparisonSection[]
}) {
	return (
		<section className="mt-12 py-12 bg-(--sub-mobile-table-section-bg)">
			<div className="mx-auto max-w-[393px] px-4">
				<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<div className="min-w-[761px]">
						<div className="flex">
							<div className="flex h-[132px] w-[233px] items-center px-2">
								<h2 className="text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white">Compare Plans and Features</h2>
							</div>

							<div className="flex h-[132px] w-[528px] rounded-t-[16px] border-t border-(--sub-mobile-table-border)">
								{planOrder.map((plan, index) => {
									const meta = getPlanMeta(plan)
									const isPro = plan === 'pro'
									const roundedStart = index === 0 ? 'rounded-tl-[16px]' : ''
									const roundedEnd = index === planOrder.length - 1 ? 'rounded-tr-[16px]' : ''

									return (
										<div
											key={`mobile-plan-head-${plan}`}
											className={`w-[132px] border-t ${
												isPro
													? 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)'
													: 'border-(--sub-mobile-table-border)'
											} ${roundedStart} ${roundedEnd}`}
										>
											<div className="flex h-full flex-col justify-between p-3">
												<div>
													<p className="text-[14px] leading-4 font-medium text-(--sub-c-111f34) dark:text-white">{meta.title}</p>
													<p className={`mt-1 text-[12px] leading-4 ${plan === 'enterprise' ? 'text-(--sub-c-4b86db)' : 'text-(--sub-mobile-text-muted)'}`}>
														{meta.price}
													</p>
												</div>
												<button
													type="button"
													className={`h-7 rounded-[6px] border px-2 text-[10px] leading-3 ${
														isPro
															? 'border-(--sub-c-1f67d2) bg-(--sub-c-1f67d2) text-white'
															: 'border-(--sub-c-c8d4e4) bg-white text-(--sub-c-1e293b) dark:border-(--sub-c-2f3336) dark:bg-transparent dark:text-white'
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

						<div className="overflow-hidden rounded-b-[16px] border-x border-b border-(--sub-mobile-table-border)">
							{comparisonSections.map((section) => (
								<div key={`mobile-${section.title}`}>
									<div className="flex h-10 bg-(--sub-mobile-table-header-bg)">
										<div className="flex w-[233px] items-center px-2 text-[14px] leading-[21px] font-medium text-(--sub-c-111f34) dark:text-white">
											{section.title}
										</div>
										{planOrder.map((plan) => (
											<div
												key={`mobile-${section.title}-header-${plan}`}
												className={`w-[132px] border-l border-(--sub-mobile-table-border) ${
													plan === 'pro' ? 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)' : ''
												} ${plan === 'enterprise' ? 'border-r' : ''}`}
											/>
										))}
									</div>

									{section.rows.map((row) => {
										const rowHeight = row.label.length > 40 ? 'min-h-[62px]' : 'h-[41px]'
										return (
											<div key={`mobile-${section.title}-${row.label}`} className={`flex ${rowHeight} border-b border-(--sub-mobile-table-border)`}>
												<div className="flex w-[233px] items-center px-2 text-[14px] leading-[21px] text-(--sub-mobile-text-muted)">{row.label}</div>
												{planOrder.map((plan) => (
													<ComparisonCellMobile
														key={`mobile-${section.title}-${row.label}-${plan}`}
														value={row.values[plan]}
														plan={plan}
													/>
												))}
											</div>
										)
									})}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

export function SubscriptionDesktopComparisonSection({
	planOrder,
	comparisonSections
}: {
	planOrder: PlanKey[]
	comparisonSections: ComparisonSection[]
}) {
	return (
		<section className="py-20 bg-(--sub-desktop-table-section-bg)">
			<div className="mx-auto w-[984px]">
				<div className="flex">
					<div className="flex h-[129px] w-[400px] items-center rounded-tl-[24px] px-4">
						<h2 className="w-[220px] text-[24px] leading-[34px] font-semibold text-(--sub-c-090b0c) dark:text-white">Compare Plans and Features</h2>
					</div>

					<div className="flex h-[129px] w-[584px] rounded-t-[24px] border-t border-(--sub-desktop-table-border)">
						{planOrder.map((plan, index) => {
							const meta = getPlanMeta(plan)
							const isPro = plan === 'pro'
							const roundedStart = index === 0 ? 'rounded-tl-[24px]' : ''
							const roundedEnd = index === planOrder.length - 1 ? 'rounded-tr-[24px]' : ''

							return (
								<div
									key={`plan-head-${plan}`}
									className={`w-[146px] border-t ${
										isPro
											? 'rounded-t-[16px] border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)'
											: 'border-(--sub-desktop-table-border) bg-white'
									} ${roundedStart} ${roundedEnd}`}
								>
									<div className="flex h-full flex-col justify-between p-5">
										<div>
											<p className="text-lg leading-5 font-medium text-(--sub-c-090b0c) dark:text-white">{meta.title}</p>
											<p className={`text-sm ${plan === 'enterprise' ? 'text-(--sub-c-4b86db)' : 'text-(--sub-desktop-text-muted)'}`}>{meta.price}</p>
										</div>
										<button
											type="button"
											className={`h-8 rounded-lg border text-xs ${
												isPro
													? 'border-(--sub-c-1f67d2) bg-(--sub-c-1f67d2) text-white'
													: 'border-(--sub-c-dedede) bg-white text-(--sub-c-090b0c) dark:border-(--sub-c-2f3336) dark:bg-transparent dark:text-white'
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

				<div className="overflow-hidden rounded-b-[24px] border-x border-b border-(--sub-desktop-table-border)">
					{comparisonSections.map((section) => (
						<div key={section.title}>
							<div className="flex h-9 bg-(--sub-desktop-table-header-bg)">
								<div className="flex w-[400px] items-center px-4 text-[16px] leading-5 font-medium text-(--sub-c-090b0c) dark:text-white">
									{section.title}
								</div>
								{planOrder.map((plan) => (
									<div
										key={`${section.title}-header-${plan}`}
										className={`w-[146px] border-l border-(--sub-desktop-table-border) ${
											plan === 'pro' ? 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)' : ''
										} ${plan === 'enterprise' ? 'border-r' : ''}`}
									/>
								))}
							</div>

							{section.rows.map((row) => (
								<div key={`${section.title}-${row.label}`} className="flex h-9 border-b border-(--sub-desktop-table-border)">
									<div className="flex w-[400px] items-center px-4 text-xs text-(--sub-desktop-text-muted)">{row.label}</div>
									{planOrder.map((plan) => (
										<ComparisonCellDesktop key={`${section.title}-${row.label}-${plan}`} value={row.values[plan]} plan={plan} />
									))}
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

export function SubscriptionMobileTrustedBlock({ trustLogos }: { trustLogos: string[] }) {
	return (
		<div className="flex w-full flex-col items-center">
			<div className="flex w-full flex-col items-center gap-2 text-center">
				<h2 className="text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white">Trusted by DeFi Natives and Global Regulators</h2>
				<p className="text-[12px] leading-4 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6)">From top crypto exchanges to global central banks</p>
			</div>

			<div className="mt-6 grid w-full grid-cols-2 gap-x-4 gap-y-4">
				{trustLogos.map((src) => (
					<div key={`mobile-logo-${src}`} className="flex h-[56px] items-center justify-center">
						<img src={src} alt="" className="max-h-[28px] max-w-[150px] object-contain opacity-90 dark:opacity-80" />
					</div>
				))}
			</div>
			<div className="mt-2 flex h-[56px] w-full items-center justify-center">
				<img src="/assets/trusts-llama/cftc.svg" alt="" className="max-h-[30px] object-contain opacity-90 dark:opacity-80" />
			</div>
		</div>
	)
}

export function SubscriptionDesktopTrustedBlock({ trustLogos }: { trustLogos: string[] }) {
	return (
		<div className="flex flex-col items-center">
			<div className="flex w-[448px] flex-col items-center gap-4 text-center">
				<h2 className="text-[20px] leading-7 font-semibold text-(--sub-c-090b0c) dark:text-white">Trusted by DeFi Natives and Global Regulators</h2>
				<p className="text-[14px] leading-[21px] text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6)">From top crypto exchanges to global central banks</p>
			</div>

			<div className="mt-9 grid w-[1184px] grid-cols-4 gap-4">
				{trustLogos.map((src) => (
					<div key={src} className="flex h-[68px] items-center justify-center">
						<img src={src} alt="" className="max-h-[40px] max-w-[210px] object-contain opacity-90 dark:opacity-80" />
					</div>
				))}
			</div>
			<div className="mt-4 flex h-[68px] w-[284px] items-center justify-center">
				<img src="/assets/trusts-llama/cftc.svg" alt="" className="max-h-[41px] object-contain opacity-90 dark:opacity-80" />
			</div>
		</div>
	)
}

export function SubscriptionMobileFaqBlock({ faqItems }: { faqItems: FaqItem[] }) {
	return (
		<div className="mt-16 w-full">
			<h2 className="text-center text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white">Frequently Asked Questions</h2>
			<div className="mt-7">
				{faqItems.map((item) => (
					<div key={`mobile-faq-${item.question}`} className="border-b border-(--sub-mobile-table-border) py-4">
						<div className="flex items-center justify-between gap-4">
							<p className="text-[12px] leading-4 text-(--sub-c-111f34) dark:text-white">{item.question}</p>
							<Icon name="plus" height={16} width={16} className="text-(--sub-c-111f34) dark:text-white" />
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export function SubscriptionDesktopFaqBlock({ faqItems }: { faqItems: FaqItem[] }) {
	return (
		<div className="mt-32 w-[384px]">
			<h2 className="text-center text-[20px] leading-7 font-semibold text-(--sub-c-090b0c) dark:text-white">Frequently Asked Questions</h2>
			<div className="mt-9 flex flex-col gap-4">
				{faqItems.map((item) => (
					<div key={item.question} className="border-b border-(--sub-desktop-table-border) pb-4">
						<div className="flex items-center justify-between gap-4">
							<p className="text-xs leading-4 text-(--sub-c-090b0c) dark:text-white">{item.question}</p>
							<Icon name="x" height={16} width={16} className="text-(--sub-c-090b0c) dark:text-white" />
						</div>
						<p className="mt-2 text-xs leading-4 text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6)">{item.answer}</p>
					</div>
				))}
			</div>
		</div>
	)
}

export function SubscriptionMobileFooter() {
	return (
		<footer className="px-4 pb-6 md:hidden">
			<div className="h-px w-full bg-(--sub-desktop-table-border)" />
			<div className="mt-6 flex items-center justify-between">
				<div className="flex flex-col items-start">
					<img src="/assets/defillama-dark-neutral.webp" alt="DefiLlama" className="h-7 w-auto object-contain object-left dark:hidden" />
					<img src="/assets/defillama.webp" alt="DefiLlama" className="hidden h-7 w-auto object-contain object-left dark:block" />
				</div>
				<div className="flex items-center gap-2">
					<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
						<Icon name="chat" height={18} width={18} />
					</button>
					<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
						<Icon name="twitter" height={18} width={18} />
					</button>
					<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
						<Icon name="github" height={18} width={18} />
					</button>
				</div>
			</div>
			<div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] leading-3 text-(--sub-footer-text)">
				<a href="mailto:support@defillama.com">Contact Us</a>
				<BasicLink href="/privacy-policy">Privacy Policy</BasicLink>
				<BasicLink href="/subscription/fulfillment-policies">Fulfillment Policies</BasicLink>
				<BasicLink href="/terms">Terms of Service</BasicLink>
			</div>
			<p className="mt-4 text-[10px] leading-3 text-(--sub-footer-text)">© 2025 DefiLlama. All rights reserved.</p>
		</footer>
	)
}

export function SubscriptionDesktopFooter() {
	return (
		<footer className="hidden px-[128px] pb-8 md:block">
			<div className="h-px w-full bg-(--sub-desktop-table-border)" />
			<div className="mt-8 flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<div className="flex flex-col items-start">
						<img src="/assets/defillama-dark.webp" alt="DefiLlama" className="h-7 w-[83px] object-contain object-left dark:hidden" />
						<img src="/assets/defillama.webp" alt="DefiLlama" className="hidden h-7 w-[83px] object-contain object-left dark:block" />
					</div>
					<div className="flex items-center gap-2">
						<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
							<Icon name="chat" height={20} width={20} />
						</button>
						<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
							<Icon name="twitter" height={20} width={20} />
						</button>
						<button type="button" className="rounded-full p-1 text-(--sub-social-icon)">
							<Icon name="github" height={20} width={20} />
						</button>
					</div>
				</div>
				<div className="flex items-center justify-between text-xs text-(--sub-footer-text)">
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
	)
}
