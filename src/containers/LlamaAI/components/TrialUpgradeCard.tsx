import { lazy, Suspense, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import type { UpgradeOffer } from '~/containers/LlamaAI/types'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const StripeCheckoutModal = lazy(() =>
	import('~/components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal }))
)

const PRO_FEATURES = [
	'Unlimited LlamaAI questions',
	'5 deep research reports per day',
	'Build your own custom dashboards',
	'Add custom data columns',
	'Live data via DefiLlama Sheets',
	'CSV downloads & full LlamaFeed access'
]

const trackedOffers = new WeakSet<UpgradeOffer>()

export function TrialUpgradeCard({ offer }: { offer: UpgradeOffer }) {
	const { isTrialAvailable, isTrialStatusLoading, hasActiveSubscription } = useSubscribe()
	const [checkoutOpen, setCheckoutOpen] = useState(false)
	const [mounted, setMounted] = useState(false)

	const resolved = !isTrialStatusLoading
	const canStartTrial = isTrialAvailable
	const variant = canStartTrial ? 'trial' : 'subscribe'
	const ctaLabel = canStartTrial ? 'Start free trial' : 'Subscribe to Pro'

	useEffect(() => {
		if (!resolved) return
		setMounted(true)
		if (hasActiveSubscription || trackedOffers.has(offer)) return
		trackedOffers.add(offer)
		trackUmamiEvent('llamaai-trial-offered', { variant, limit: offer.code })
	}, [resolved, hasActiveSubscription, variant, offer])

	const openCheckout = () => {
		trackUmamiEvent('llamaai-trial-cta-clicked', { variant })
		try {
			sessionStorage.setItem('llamaai_checkout', JSON.stringify({ variant, ts: Date.now() }))
		} catch {}
		setCheckoutOpen(true)
	}

	const closeCheckout = () => {
		setCheckoutOpen(false)
		try {
			sessionStorage.removeItem('llamaai_checkout')
		} catch {}
	}

	if (!resolved || hasActiveSubscription) return null

	return (
		<div className={`my-2.5 w-full transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
			<div className="flex flex-col gap-5 rounded-xl border border-(--sub-border-slate-100) bg-white p-5 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-semibold tracking-wider text-(--sub-text-secondary) uppercase dark:text-(--sub-text-muted-dark)">
						DefiLlama Pro
					</span>
					{canStartTrial ? (
						<>
							<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) sm:text-2xl sm:leading-8 dark:text-white">
								Start your 7-day free trial
							</h3>
							<p className="text-[13px] leading-5 text-(--sub-text-secondary) dark:text-(--sub-text-muted-dark)">
								Free for 7 days, then $49/month · cancel anytime
							</p>
						</>
					) : (
						<>
							<div className="flex items-end gap-1">
								<span className="bg-linear-to-r from-(--sub-brand-primary) to-(--sub-text-navy-900) bg-clip-text text-[32px] leading-[38px] font-semibold text-transparent dark:from-(--sub-brand-secondary) dark:to-(--sub-brand-softest)">
									$49
								</span>
								<span className="pb-1 text-base text-(--sub-text-secondary) dark:text-(--sub-text-secondary-dark)">
									/month
								</span>
							</div>
							<p className="text-[13px] leading-5 text-(--sub-text-secondary) dark:text-(--sub-text-muted-dark)">
								The full research suite — unlock everything below
							</p>
						</>
					)}
				</div>

				<ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
					{PRO_FEATURES.map((feature) => (
						<li key={feature} className="flex items-start gap-2">
							<Icon name="check" height={18} width={18} className="mt-px shrink-0 text-(--sub-brand-secondary)" />
							<span className="text-[13px] leading-[18px] text-(--sub-ink-primary) dark:text-(--sub-text-primary-dark)">
								{feature}
							</span>
						</li>
					))}
				</ul>

				<button
					type="button"
					onClick={openCheckout}
					className="group/cta flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-(--sub-brand-primary) text-sm font-semibold text-white transition-opacity hover:opacity-90"
				>
					{ctaLabel}
					<Icon
						name="arrow-right"
						height={16}
						width={16}
						className="transition-transform group-hover/cta:translate-x-0.5"
					/>
				</button>
			</div>

			{checkoutOpen ? (
				<Suspense fallback={null}>
					<StripeCheckoutModal
						isOpen
						onClose={closeCheckout}
						paymentMethod="stripe"
						type="llamafeed"
						billingInterval="month"
						isTrial={canStartTrial}
					/>
				</Suspense>
			) : null}
		</div>
	)
}
