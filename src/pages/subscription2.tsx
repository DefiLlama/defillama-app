import Head from 'next/head'
import { useState } from 'react'
import { COMPARISON_SECTIONS, FAQ_ITEMS, PLAN_ORDER, PRICING_CARDS_BY_CYCLE, TRUST_LOGOS } from '~/containers/subscription/data'
import {
	SubscriptionBackground,
	SubscriptionComparisonSection,
	SubscriptionFaqBlock,
	SubscriptionFooter,
	SubscriptionHeader,
	SubscriptionPricingSection,
	SubscriptionTrustedBlock
} from '~/containers/subscription/sections'
import type { BillingCycle } from '~/containers/subscription/types'

export default function Subscription2() {
	const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')

	return (
		<>
			<Head>
				<title>Subscribe v2 - DefiLlama</title>
			</Head>

			<div className="relative col-span-full min-h-screen w-full overflow-x-hidden bg-(--sub-c-f7f7f7) text-(--sub-c-090b0c) dark:bg-(--sub-c-090b0c) dark:text-white">
				<SubscriptionBackground />
				<SubscriptionHeader />

				<main className="relative z-10">
					<SubscriptionPricingSection
						pricingCards={PRICING_CARDS_BY_CYCLE[billingCycle]}
						billingCycle={billingCycle}
						onBillingCycleChange={setBillingCycle}
					/>
					<SubscriptionComparisonSection
						planOrder={PLAN_ORDER}
						comparisonSections={COMPARISON_SECTIONS}
						billingCycle={billingCycle}
						selectedPlan="api"
					/>

					<section className="mx-auto flex max-w-[393px] flex-col items-center px-4 py-12 md:max-w-[1440px] md:px-[128px] md:py-20">
						<SubscriptionTrustedBlock trustLogos={TRUST_LOGOS} />
						<SubscriptionFaqBlock faqItems={FAQ_ITEMS} />
					</section>
				</main>

				<SubscriptionFooter />
			</div>
		</>
	)
}
