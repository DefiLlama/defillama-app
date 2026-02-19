import { PricingCard } from '~/containers/subscription/components'
import type { BillingCycle, PricingCardData } from '~/containers/subscription/types'

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
					<p className="text-[16px] leading-6 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6) md:w-[485px] md:text-[14px] md:leading-[21px] md:text-(--sub-c-484848) dark:md:text-(--sub-c-c6c6c6)">
						Upgrade now for access to LlamaAI, Pro dashboard builder, increased API limits, premium API endpoints and
						more.
					</p>
				</div>
			</div>

			<div className="mt-9 flex flex-col items-center gap-3 md:mt-12 md:gap-5">
				<div role="group" aria-label="Billing cycle" className="flex w-[268px] rounded-full bg-(--sub-c-e3ebf6) p-1 dark:bg-(--sub-c-131516) md:w-[236px]">
					<button
						type="button"
						aria-pressed={isMonthly}
						onClick={() => onBillingCycleChange('monthly')}
						className={`h-14 w-32 rounded-full text-[16px] leading-5 font-medium md:h-12 md:w-28 md:text-sm ${
							isMonthly ? 'bg-(--sub-c-1f67d2) text-white' : 'text-(--sub-c-25364e) dark:text-white md:text-(--sub-c-090b0c) dark:md:text-white'
						}`}
					>
						Monthly
					</button>
					<button
						type="button"
						aria-pressed={isYearly}
						onClick={() => onBillingCycleChange('yearly')}
						className={`flex h-14 w-32 flex-col items-center justify-center rounded-full text-[16px] leading-5 font-medium md:h-12 md:w-28 md:text-sm ${
							isYearly ? 'bg-(--sub-c-1f67d2) text-white' : 'text-(--sub-c-25364e) dark:text-white md:text-(--sub-c-090b0c) dark:md:text-white'
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
				<p className="text-[12px] leading-4 text-(--sub-c-617389) dark:text-(--sub-c-c6c6c6) md:text-(--sub-c-484848) dark:md:text-(--sub-c-c6c6c6)">
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
