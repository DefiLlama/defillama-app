import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { useAuthContext } from '~/containers/Subscription/auth'
import { ReturnModal } from '~/containers/Subscription/components/ReturnModal'
import {
	COMPARISON_SECTIONS,
	FAQ_ITEMS,
	PLAN_ORDER,
	PRICING_CARDS_BY_CYCLE,
	TRUST_LOGOS
} from '~/containers/Subscription/data'
import {
	SubscriptionBackground,
	SubscriptionComparisonSection,
	SubscriptionFaqBlock,
	SubscriptionFooter,
	SubscriptionHeader,
	SubscriptionPricingSection,
	SubscriptionTrustedBlock
} from '~/containers/Subscription/sections'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import type { BillingCycle, PlanKey } from '~/containers/Subscription/types'
import { useSubscriptionPageState } from '~/containers/Subscription/usePageState'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'
import { WalletProvider } from '~/layout/WalletProvider'
import { safeInternalPath } from '~/utils/routerQuery'

const StripeCheckoutModal = lazy(() =>
	import('~/components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal }))
)

function SubscriptionContent() {
	const router = useRouter()
	const returnUrl = safeInternalPath(router.query.returnUrl)

	const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly')
	const {
		isAuthenticated,
		currentPlan,
		isTrial,
		userBillingCycle,
		isLoading: isPageStateLoading
	} = useSubscriptionPageState()
	const { user, loaders } = useAuthContext()
	const {
		handleSubscribe,
		loading,
		isTrialAvailable,
		endTrialSubscription,
		isEndTrialLoading,
		subscription,
		getPortalSessionUrl
	} = useSubscribe()

	const isCancelPending = subscription?.metadata?.isCanceled === 'true'

	const signInDialog = Ariakit.useDialogStore()

	const [stripeCheckout, setStripeCheckout] = useState<{
		isOpen: boolean
		type: 'api' | 'llamafeed'
		billingInterval: 'year' | 'month'
		isTrial: boolean
		isUpgradeFlow: boolean
	} | null>(null)

	/* ── End trial modal ──────────────────────────────────────────────── */
	const [showEndTrialModal, setShowEndTrialModal] = useState(false)

	const handleEndTrial = async () => {
		try {
			await endTrialSubscription()
			setShowEndTrialModal(false)
		} catch (error) {
			console.error('Failed to end trial:', error)
		}
	}

	/* ── Return modal (redirect after sign-in) ────────────────────────── */
	const [showReturnModal, setShowReturnModal] = useState(false)
	const handledReturnUrlRef = useRef<string | undefined>(undefined)

	useEffect(() => {
		let cancelled = false
		if (isAuthenticated && returnUrl && handledReturnUrlRef.current !== returnUrl && !loaders.userLoading) {
			const justSignedUp = sessionStorage.getItem('just_signed_up') === 'true'
			const accountAge = user?.created ? Date.now() - new Date(user.created).getTime() : Infinity
			const isRecentAccount = accountAge < 10000

			if (justSignedUp) {
				sessionStorage.removeItem('just_signed_up')
			}

			if (!justSignedUp && !isRecentAccount) {
				queueMicrotask(() => {
					if (cancelled) return
					setShowReturnModal(true)
				})
			}

			handledReturnUrlRef.current = returnUrl
		}

		return () => {
			cancelled = true
		}
	}, [isAuthenticated, returnUrl, loaders.userLoading, user?.created])

	/* ── Helpers ───────────────────────────────────────────────────────── */
	const handleRevertCancellation = async () => {
		try {
			const portalUrl = await getPortalSessionUrl()
			if (portalUrl) {
				window.location.href = portalUrl
			}
		} catch {
			toast.error('Failed to open billing portal. Please try again.')
		}
	}

	const billingInterval = billingCycle === 'yearly' ? 'year' : 'month'

	const requireAuth = (action: () => void) => {
		if (!isAuthenticated) {
			signInDialog.show()
			return
		}
		action()
	}

	const requireVerified = (action: () => void) => {
		if (!user?.verified && !user?.walletAddress) {
			toast.error('Please verify your email first to subscribe')
			return
		}
		action()
	}

	const openStripeCheckout = (
		type: 'api' | 'llamafeed',
		interval: 'year' | 'month',
		trial = false,
		upgrade = false
	) => {
		requireAuth(() => {
			requireVerified(() => {
				setStripeCheckout({ isOpen: true, type, billingInterval: interval, isTrial: trial, isUpgradeFlow: upgrade })
			})
		})
	}

	const planKeyToSubType = (key: PlanKey): 'api' | 'llamafeed' => (key === 'api' ? 'api' : 'llamafeed')

	/* ── Card handlers ─────────────────────────────────────────────────── */
	const handlePrimaryCtaClick = (cardKey: PlanKey) => {
		if (cardKey === 'free') {
			signInDialog.show()
			return
		}
		if (cardKey === 'enterprise') {
			window.location.href = 'mailto:sales@defillama.com'
			return
		}
		openStripeCheckout(planKeyToSubType(cardKey), billingInterval)
	}

	const handleSecondaryCtaClick = (cardKey: PlanKey) => {
		requireAuth(() => {
			requireVerified(() => {
				void handleSubscribe('llamapay', planKeyToSubType(cardKey), undefined, billingInterval, false)
			})
		})
	}

	const handleUpgradeToYearly = (cardKey: PlanKey) => {
		openStripeCheckout(planKeyToSubType(cardKey), 'year', false, true)
	}

	const handleUpgradeTier = (cardKey: PlanKey) => {
		openStripeCheckout(planKeyToSubType(cardKey), billingInterval)
	}

	const handleStartTrial = () => {
		openStripeCheckout('llamafeed', 'month', true, false)
	}

	const PLAN_TIER: Record<PlanKey, number> = { free: 0, pro: 1, api: 2, enterprise: 3 }

	const handleComparisonPlanAction = (plan: PlanKey) => {
		if (plan === 'enterprise') {
			window.location.href = 'mailto:sales@defillama.com'
			return
		}

		// Same guards the pricing cards enforce
		if (isAuthenticated && currentPlan) {
			const isCurrentOrTrial = plan === currentPlan || (isTrial && plan === 'pro')
			const isLowerTier = PLAN_TIER[plan] < PLAN_TIER[currentPlan]
			if (isCurrentOrTrial || isLowerTier) return
		}

		if (plan === 'free') {
			if (!isAuthenticated) {
				signInDialog.show()
			}
			return
		}

		openStripeCheckout(planKeyToSubType(plan), billingInterval)
	}

	if (isPageStateLoading) {
		return (
			<div className="relative col-span-full min-h-screen w-full [overflow-x:clip] [overflow-y:visible] bg-(--sub-surface-page) text-(--sub-ink-primary) dark:bg-(--sub-ink-primary) dark:text-white">
				<SubscriptionBackground />
				<SubscriptionHeader />
				<div className="flex h-[60dvh] items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--sub-brand-primary) border-t-transparent" />
				</div>
				<SubscriptionFooter />
			</div>
		)
	}

	return (
		<div className="relative col-span-full min-h-screen w-full [overflow-x:clip] [overflow-y:visible] bg-(--sub-surface-page) text-(--sub-ink-primary) dark:bg-(--sub-ink-primary) dark:text-white">
			<SubscriptionBackground />
			<SubscriptionHeader />

			<main className="relative z-10">
				<SubscriptionPricingSection
					pricingCards={PRICING_CARDS_BY_CYCLE[billingCycle]}
					billingCycle={billingCycle}
					onBillingCycleChange={setBillingCycle}
					currentPlan={currentPlan}
					isAuthenticated={isAuthenticated}
					isTrial={isTrial}
					isCancelPending={isCancelPending}
					userBillingCycle={userBillingCycle}
					onPrimaryCtaClick={handlePrimaryCtaClick}
					onSecondaryCtaClick={handleSecondaryCtaClick}
					onUpgradeToYearly={handleUpgradeToYearly}
					onUpgradeTier={handleUpgradeTier}
					onStartTrial={handleStartTrial}
					onEndTrial={() => setShowEndTrialModal(true)}
					onRevertCancellation={() => void handleRevertCancellation()}
					isTrialAvailable={isTrialAvailable}
					loading={loading as 'stripe' | 'llamapay' | null}
				/>
				<SubscriptionComparisonSection
					planOrder={PLAN_ORDER}
					comparisonSections={COMPARISON_SECTIONS}
					billingCycle={billingCycle}
					selectedPlan="api"
					onPlanAction={handleComparisonPlanAction}
				/>

				<section className="mx-auto flex max-w-[1440px] flex-col items-center px-4 py-12 md:px-10 md:py-20 2xl:px-[128px]">
					<SubscriptionTrustedBlock trustLogos={TRUST_LOGOS} />
					<SubscriptionFaqBlock faqItems={FAQ_ITEMS} />
				</section>
			</main>

			<SubscriptionFooter />

			{/* Sign-in dialog (opened programmatically by CTA buttons) */}
			<SignInModal store={signInDialog} />

			{/* Stripe checkout modal */}
			{stripeCheckout?.isOpen ? (
				<Suspense fallback={null}>
					<StripeCheckoutModal
						isOpen
						onClose={() => setStripeCheckout(null)}
						paymentMethod="stripe"
						type={stripeCheckout.type}
						billingInterval={stripeCheckout.billingInterval}
						isTrial={stripeCheckout.isTrial}
						isUpgradeFlow={stripeCheckout.isUpgradeFlow}
					/>
				</Suspense>
			) : null}

			{/* End trial confirmation modal */}
			<Ariakit.Dialog
				open={showEndTrialModal}
				onClose={() => setShowEndTrialModal(false)}
				className="dialog flex max-h-[90dvh] max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none"
				portal
				unmountOnHide
			>
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-bold">Upgrade to Full Access</h3>
					<button
						onClick={() => setShowEndTrialModal(false)}
						className="rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white"
					>
						<Icon name="x" height={18} width={18} />
					</button>
				</div>
				<div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
					<div className="flex items-start gap-3">
						<Icon name="alert-triangle" height={20} width={20} className="mt-0.5 shrink-0 text-yellow-500" />
						<div className="flex flex-col gap-2">
							<p className="font-semibold text-yellow-500">This is NOT a subscription cancellation</p>
							<p className="text-sm text-[#c5c5c5]">
								By proceeding, you will end your free trial early and convert to a paid subscription immediately.
								You&apos;ll be charged the full subscription amount ($49/month).
							</p>
						</div>
					</div>
				</div>
				<div className="mt-2 flex flex-col gap-2">
					<p className="text-sm text-[#8a8c90]">Benefits of converting now:</p>
					<ul className="flex flex-col gap-1 text-sm">
						<li className="flex items-center gap-2">
							<Icon name="check" height={14} width={14} className="text-green-400" />
							<span>Full CSV download access</span>
						</li>
						<li className="flex items-center gap-2">
							<Icon name="check" height={14} width={14} className="text-green-400" />
							<span>5 deep research questions per day (instead of 3)</span>
						</li>
						<li className="flex items-center gap-2">
							<Icon name="check" height={14} width={14} className="text-green-400" />
							<span>All Pro features without limitations</span>
						</li>
					</ul>
				</div>
				<div className="mt-2 flex flex-col gap-3">
					<button
						onClick={() => void handleEndTrial()}
						disabled={isEndTrialLoading}
						className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isEndTrialLoading ? 'Processing...' : 'Confirm & Upgrade Now'}
					</button>
					<button
						onClick={() => setShowEndTrialModal(false)}
						disabled={isEndTrialLoading}
						className="w-full rounded-lg border border-[#39393E] px-4 py-2 text-[#8a8c90] transition-colors hover:bg-[#2a2b30] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
					>
						Close
					</button>
				</div>
			</Ariakit.Dialog>

			{/* Return modal (post sign-in redirect) */}
			{returnUrl ? (
				<ReturnModal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} returnUrl={returnUrl} />
			) : null}

			<Toast />
		</div>
	)
}

export default function Subscription() {
	return (
		<>
			<SEO
				title="Subscribe to DefiLlama Pro Analytics - DefiLlama"
				description="Unlock LlamaAI, advanced DeFi analytics, custom dashboards, CSV downloads, and pro-level data with DefiLlama Pro."
				canonicalUrl="/subscription"
			/>
			<WalletProvider>
				<SubscriptionContent />
			</WalletProvider>
		</>
	)
}
