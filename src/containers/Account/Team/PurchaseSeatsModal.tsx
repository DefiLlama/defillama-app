import * as Ariakit from '@ariakit/react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { STRIPE_PUBLISHABLE_KEY } from '~/constants'
import type { PurchaseSeatsResponse, TeamSubscription } from './types'
import { useTeam } from './useTeam'

function getExistingInterval(subscriptions: TeamSubscription[], type: 'api' | 'llamafeed'): 'month' | 'year' | null {
	const existing = subscriptions.find(
		(sub) => sub.type === type && (sub.status === undefined || sub.status === 'active')
	)
	return existing?.billingInterval ?? null
}

const stripeInstance = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

interface PurchaseSeatsModalProps {
	isOpen: boolean
	onClose: () => void
}

export function PurchaseSeatsModal({ isOpen, onClose }: PurchaseSeatsModalProps) {
	const { purchaseSeatsMutation, teamSubscriptions } = useTeam()
	const [subscriptionType, setSubscriptionType] = useState<'api' | 'llamafeed'>('llamafeed')
	const [seatCount, setSeatCount] = useState(1)
	const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
	const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null)

	const lockedInterval = getExistingInterval(teamSubscriptions, subscriptionType)

	// When the selected type has an existing sub, force the interval to match it —
	// the backend rejects mixing monthly and yearly for the same subscription type.
	useEffect(() => {
		if (lockedInterval && billingInterval !== lockedInterval) {
			setBillingInterval(lockedInterval)
		}
	}, [lockedInterval, billingInterval])

	const handlePurchase = async () => {
		const result: PurchaseSeatsResponse = await purchaseSeatsMutation.mutateAsync({
			subscriptionType,
			seatCount,
			billingInterval,
			redirectUrl: `${window.location.origin}/account?tab=team&team-checkout=success`,
			cancelUrl: `${window.location.origin}/account?tab=team`
		})

		if (result.action === 'checkout_created') {
			setCheckoutClientSecret(result.clientSecret)
		} else {
			// seats_added — success toast handled by mutation onSuccess
			onClose()
		}
	}

	const handleClose = () => {
		setCheckoutClientSecret(null)
		onClose()
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && handleClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className={`dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 ${
					checkoutClientSecret ? 'md:max-w-[600px]' : 'md:max-w-[420px]'
				}`}
				portal
				unmountOnHide
			>
				<div className="flex flex-col gap-5 bg-white px-5 py-6 dark:bg-(--sub-surface-dark)">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold text-(--sub-ink-primary) dark:text-white">
							{checkoutClientSecret ? 'Complete Payment' : 'Purchase Seats'}
						</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-text-muted) transition-colors hover:text-(--sub-ink-primary) dark:hover:text-white">
							<Icon name="x" height={18} width={18} />
						</Ariakit.DialogDismiss>
					</div>

					{checkoutClientSecret ? (
						<div className="min-h-[400px]">
							{stripeInstance ? (
								<EmbeddedCheckoutProvider stripe={stripeInstance} options={{ clientSecret: checkoutClientSecret }}>
									<EmbeddedCheckout />
								</EmbeddedCheckoutProvider>
							) : (
								<div className="flex flex-col items-center gap-2 py-8 text-center">
									<Icon name="alert-triangle" height={24} width={24} className="text-(--error)" />
									<p className="text-sm text-(--sub-text-muted)">
										Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment.
									</p>
								</div>
							)}
						</div>
					) : (
						<>
							{/* Subscription Type */}
							<div className="flex flex-col gap-2">
								<label className="text-xs font-medium text-(--sub-text-muted)">Subscription Type</label>
								<div className="flex gap-2">
									<button
										onClick={() => setSubscriptionType('llamafeed')}
										className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
											subscriptionType === 'llamafeed'
												? 'border-(--sub-brand-primary) bg-(--sub-brand-primary)/5 text-(--sub-brand-primary)'
												: 'border-(--sub-border-slate-100) text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white'
										}`}
									>
										Pro
									</button>
									<button
										onClick={() => setSubscriptionType('api')}
										className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
											subscriptionType === 'api'
												? 'border-(--sub-brand-primary) bg-(--sub-brand-primary)/5 text-(--sub-brand-primary)'
												: 'border-(--sub-border-slate-100) text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white'
										}`}
									>
										API
									</button>
								</div>
							</div>

							{/* Billing Interval */}
							<div className="flex flex-col gap-2">
								<label className="text-xs font-medium text-(--sub-text-muted)">Billing Interval</label>
								<div className="flex gap-2">
									<Tooltip
										content={
											lockedInterval === 'year'
												? `You already have a yearly ${subscriptionType === 'api' ? 'API' : 'Pro'} subscription. Monthly and yearly billing can't be mixed for the same plan — upgrade or cancel the yearly subscription first.`
												: null
										}
										placement="top"
										className="flex-1"
									>
										<button
											onClick={() => setBillingInterval('month')}
											disabled={lockedInterval === 'year'}
											className={`flex h-10 w-full flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
												billingInterval === 'month'
													? 'border-(--sub-brand-primary) bg-(--sub-brand-primary)/5 text-(--sub-brand-primary)'
													: 'border-(--sub-border-slate-100) text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white'
											}`}
										>
											Monthly
										</button>
									</Tooltip>
									<Tooltip
										content={
											lockedInterval === 'month'
												? `You already have a monthly ${subscriptionType === 'api' ? 'API' : 'Pro'} subscription. Monthly and yearly billing can't be mixed for the same plan — upgrade the monthly subscription to yearly first.`
												: null
										}
										placement="top"
										className="flex-1"
									>
										<button
											onClick={() => setBillingInterval('year')}
											disabled={lockedInterval === 'month'}
											className={`flex h-10 w-full flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
												billingInterval === 'year'
													? 'border-(--sub-brand-primary) bg-(--sub-brand-primary)/5 text-(--sub-brand-primary)'
													: 'border-(--sub-border-slate-100) text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white'
											}`}
										>
											Yearly
										</button>
									</Tooltip>
								</div>
							</div>

							{/* Seat Count */}
							<div className="flex flex-col gap-2">
								<label htmlFor="seat-count" className="text-xs font-medium text-(--sub-text-muted)">
									Number of Seats
								</label>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setSeatCount((c) => Math.max(1, c - 1))}
										disabled={seatCount <= 1}
										className="flex h-10 w-10 items-center justify-center rounded-lg border border-(--sub-border-slate-100) text-(--sub-ink-primary) disabled:opacity-30 dark:border-(--sub-border-strong) dark:text-white"
									>
										<Icon name="minus" height={16} width={16} />
									</button>
									<input
										id="seat-count"
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										value={seatCount}
										onChange={(e) => {
											const val = parseInt(e.target.value, 10)
											if (!isNaN(val) && val >= 1) setSeatCount(val)
										}}
										className="h-10 w-20 rounded-lg border border-(--sub-border-slate-100) bg-white text-center text-sm text-(--sub-ink-primary) focus:border-(--sub-brand-primary) focus:outline-hidden dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark) dark:text-white"
									/>
									<button
										onClick={() => setSeatCount((c) => c + 1)}
										className="flex h-10 w-10 items-center justify-center rounded-lg border border-(--sub-border-slate-100) text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white"
									>
										<Icon name="plus" height={16} width={16} />
									</button>
								</div>
							</div>

							{/* Price Summary */}
							<div className="rounded-lg bg-(--sub-brand-primary)/5 p-3">
								<div className="flex items-center justify-between">
									<span className="text-sm text-(--sub-text-muted)">Estimated total</span>
									<span className="text-sm font-semibold text-(--sub-ink-primary) dark:text-white">
										{subscriptionType === 'api'
											? billingInterval === 'year'
												? `$${(3000 * seatCount).toLocaleString()}/year`
												: `$${(300 * seatCount).toLocaleString()}/month`
											: billingInterval === 'year'
												? `$${(490 * seatCount).toLocaleString()}/year`
												: `$${(49 * seatCount).toLocaleString()}/month`}
									</span>
								</div>
							</div>

							{billingInterval === 'month' && !lockedInterval && (
								<div className="flex items-start gap-2">
									<Icon name="sparkles" height={12} width={12} className="mt-1 shrink-0 text-(--sub-text-muted)" />
									<p className="text-xs leading-5 text-(--sub-text-muted)">
										Switch to yearly billing and get 2 months free — save $
										{((subscriptionType === 'api' ? 300 * 12 - 3000 : 49 * 12 - 490) * seatCount).toLocaleString()}
										/year on these seats.
									</p>
								</div>
							)}

							<button
								onClick={() => void handlePurchase()}
								disabled={purchaseSeatsMutation.isPending}
								className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-50"
							>
								{purchaseSeatsMutation.isPending ? 'Processing...' : 'Purchase Seats'}
							</button>
						</>
					)}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
