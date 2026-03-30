import { PricingCard } from '~/containers/subscription/components'
import type { BillingCycle, PlanKey, PricingCardCallbacks, PricingCardData } from '~/containers/subscription/types'

export function SubscriptionPricingSection({
	pricingCards,
	billingCycle,
	onBillingCycleChange,
	currentPlan = null,
	isAuthenticated = false,
	isTrial = false,
	isCancelPending = false,
	userBillingCycle = null,
	...callbacks
}: {
	pricingCards: PricingCardData[]
	billingCycle: BillingCycle
	onBillingCycleChange: (nextBillingCycle: BillingCycle) => void
	currentPlan?: PlanKey | null
	isAuthenticated?: boolean
	isTrial?: boolean
	isCancelPending?: boolean
	userBillingCycle?: BillingCycle | null
} & PricingCardCallbacks) {
	const isMonthly = billingCycle === 'monthly'
	const isYearly = billingCycle === 'yearly'

	return (
		<section className="mx-auto flex max-w-[1440px] flex-col items-center px-4 pt-14 md:px-10 md:pt-[80px] md:pb-[128px] 2xl:px-[128px]">
			<div className="flex w-full flex-col items-center gap-9 text-center md:w-[533px]">
				<div className="flex items-center gap-2">
					<img src="/assets/defillama-dark.webp" alt="DefiLlama" className="h-14 w-auto md:h-10 dark:hidden" />
					<img src="/assets/logo_white.webp" alt="" className="hidden h-14 w-14 md:h-10 md:w-10 dark:block" />
					<span className="hidden text-2xl font-bold text-white md:text-xl dark:inline">DefiLlama</span>
				</div>
				<div className="flex w-full flex-col items-center gap-7">
					<h1 className="text-[32px] leading-[42px] font-semibold text-(--sub-c-090b0c) dark:text-(--sub-c-f5f7fb)">
						The Smartest Way to Navigate <br className="hidden md:inline" />
						On-Chain Data
					</h1>
					<p className="text-[16px] leading-6 text-(--sub-c-617389) md:w-[485px] md:text-[14px] md:leading-[21px] md:text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6) dark:md:text-(--sub-c-c6c6c6)">
						Upgrade now for access to LlamaAI, Pro dashboard builder, increased API limits, premium API endpoints and
						more.
					</p>
				</div>
			</div>

			<div className="mt-9 flex flex-col items-center gap-3 md:mt-12 md:gap-5">
				<div
					role="group"
					aria-label="Billing cycle"
					className="relative flex w-[268px] rounded-full bg-(--sub-c-e3ebf6) p-1 md:w-[236px] dark:bg-(--sub-c-131516)"
				>
					<div
						className={`absolute top-1 left-1 h-14 w-32 rounded-full bg-(--sub-c-1f67d2) transition-transform duration-300 ease-in-out md:h-12 md:w-28 ${
							isYearly ? 'translate-x-32 md:translate-x-28' : 'translate-x-0'
						}`}
					/>
					<button
						type="button"
						aria-pressed={isMonthly}
						onClick={() => onBillingCycleChange('monthly')}
						className={`relative z-10 h-14 w-32 rounded-full text-[16px] leading-5 font-medium transition-colors duration-300 md:h-12 md:w-28 md:text-sm ${
							isMonthly
								? 'text-white'
								: 'text-(--sub-c-25364e) md:text-(--sub-c-090b0c) dark:text-white dark:md:text-white'
						}`}
					>
						Monthly
					</button>
					<button
						type="button"
						aria-pressed={isYearly}
						onClick={() => onBillingCycleChange('yearly')}
						className={`relative z-10 flex h-14 w-32 flex-col items-center justify-center rounded-full text-[16px] leading-5 font-medium transition-colors duration-300 md:h-12 md:w-28 md:text-sm ${
							isYearly
								? 'text-white'
								: 'text-(--sub-c-25364e) md:text-(--sub-c-090b0c) dark:text-white dark:md:text-white'
						}`}
					>
						<span>Yearly</span>
						<span
							className={`text-[12px] leading-4 transition-colors duration-300 md:text-[10px] md:leading-3 ${isYearly ? 'text-(--sub-c-a5c3ed)' : 'text-(--sub-c-4b86db) dark:text-(--sub-c-a5c3ed)'}`}
						>
							2 months free
						</span>
					</button>
				</div>
				<p className="text-[12px] leading-4 text-(--sub-c-617389) md:text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6) dark:md:text-(--sub-c-c6c6c6)">
					Cancel Anytime, Crypto &amp; Card Payments
				</p>
			</div>

			<div className="mt-9 flex w-full flex-wrap justify-center gap-4">
				{pricingCards.map((card) => (
					<PricingCard
						key={card.key}
						card={card}
						isCurrentPlan={card.key === currentPlan || (isTrial && card.key === 'pro')}
						isTrial={isTrial && card.key === 'pro'}
						isCancelPending={isCancelPending && (card.key === currentPlan || (isTrial && card.key === 'pro'))}
						isAuthenticated={isAuthenticated}
						currentPlan={currentPlan}
						billingCycle={billingCycle}
						userBillingCycle={userBillingCycle}
						{...callbacks}
					/>
				))}
			</div>
		</section>
	)
}
