import * as Ariakit from '@ariakit/react'
import {
	Elements,
	EmbeddedCheckout,
	EmbeddedCheckoutProvider,
	PaymentElement,
	useElements,
	useStripe
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { Icon } from '~/components/Icon'
import { AUTH_SERVER, STRIPE_PUBLISHABLE_KEY } from '~/constants'
import { useAuthContext } from '~/containers/Subscription/auth'
import type { FormSubmitEvent } from '~/types/forms'
import { handleSimpleFetchResponse } from '~/utils/async'

const stripeInstance = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null
const checkoutBackdrop = <div className="fixed inset-0 bg-black/80" />
const checkoutDialogClassName =
	'dialog fixed inset-0 z-50 m-auto flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[600px] flex-col gap-0 overflow-y-auto rounded-2xl border border-(--sub-border-slate-100) bg-white p-0 shadow-xl'
const checkoutHeaderClassName = 'flex items-center justify-between border-b border-(--sub-border-slate-100) px-5 py-4'
const checkoutTitleClassName = 'text-xl leading-7 font-semibold text-(--sub-ink-primary)'
const checkoutCloseButtonClassName = 'rounded-full p-1 text-(--sub-ink-primary) transition-colors disabled:opacity-50'

const formatAmount = (cents: number, currency: string) => {
	const amount = cents / 100
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase()
	}).format(amount)
}

const getFriendlyPaymentStatus = (status: string) => {
	switch (status) {
		case 'requires_action':
			return 'Requires additional authentication. Please complete the verification step and try again.'
		case 'processing':
			return 'Payment is processing. This may take a few minutes, please check your account shortly.'
		case 'requires_capture':
			return 'Payment is authorized and awaiting final confirmation.'
		case 'requires_payment_method':
			return 'Payment failed. Please use a different payment method and try again.'
		case 'requires_confirmation':
			return 'Payment needs confirmation. Please submit again to continue.'
		case 'canceled':
			return 'Payment was canceled. Please try again when ready.'
		default:
			return 'Payment is pending confirmation. Please check your account for updates.'
	}
}

interface UpgradePricing {
	amount: number
	currency: string
	prorationCredit: number
	newSubscriptionPrice: number
}

type SubscriptionResult =
	| { kind: 'checkout'; clientSecret: string }
	| { kind: 'freeUpgrade' }
	| { kind: 'paidUpgrade'; clientSecret: string; pricing: UpgradePricing | null }

interface StripeCheckoutModalProps {
	isOpen: boolean
	onClose: () => void
	paymentMethod: 'stripe'
	type: 'api' | 'llamafeed'
	billingInterval?: 'year' | 'month'
	isTrial?: boolean
	isUpgradeFlow?: boolean
	upgradeReturnPath?: string
}

export function StripeCheckoutModal({
	isOpen,
	onClose,
	paymentMethod,
	type,
	billingInterval = 'month',
	isTrial = false,
	isUpgradeFlow = false,
	upgradeReturnPath
}: StripeCheckoutModalProps) {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const postCheckoutPath = isUpgradeFlow ? (upgradeReturnPath ?? '/account?success=true') : '/welcome'

	const subscriptionMutation = useMutation({
		mutationFn: async (): Promise<SubscriptionResult> => {
			if (typeof window !== 'undefined' && !isUpgradeFlow) {
				sessionStorage.setItem('onboarding_returnUrl', window.location.pathname)
			}
			const response = await authorizedFetch(
				`${AUTH_SERVER}/subscription/create`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						redirectUrl: `${window.location.origin}${postCheckoutPath}`,
						cancelUrl: `${window.location.origin}/subscription`,
						provider: paymentMethod,
						subscriptionType: type,
						billingInterval,
						isTrial
					})
				},
				true
			)

			if (!response) throw new Error('Not authenticated')

			const data = await handleSimpleFetchResponse(response).then((res) => res.json())

			if (data.isUpgrade) {
				if (!data.requiresPayment) {
					return { kind: 'freeUpgrade' }
				}
				if (!data.clientSecret) throw new Error('No client secret returned for upgrade payment')

				let pricing: UpgradePricing | null = null
				if (data.amount !== undefined && data.currency) {
					pricing = {
						amount: data.amount,
						currency: data.currency,
						prorationCredit: data.prorationCredit || 0,
						newSubscriptionPrice: data.newSubscriptionPrice || 0
					}
				}

				return { kind: 'paidUpgrade', clientSecret: data.clientSecret, pricing }
			}

			if (!data.clientSecret) throw new Error('No client secret returned from server')
			return { kind: 'checkout', clientSecret: data.clientSecret }
		},
		onSuccess: async (result) => {
			if (result.kind === 'freeUpgrade') {
				await queryClient.invalidateQueries({ queryKey: ['subscription'] })
				handleClose()
			}
		}
	})

	const resetMutation = subscriptionMutation.reset
	const handleClose = useCallback(() => {
		resetMutation()
		onClose()
	}, [resetMutation, onClose])

	const createSubscription = subscriptionMutation.mutateAsync

	const fetchClientSecret = useCallback(async (): Promise<string> => {
		const result = await createSubscription()
		if (result.kind === 'checkout') return result.clientSecret
		throw new Error(`Unexpected subscription kind: ${result.kind}`)
	}, [createSubscription])

	const result = subscriptionMutation.data
	const errorMessage = subscriptionMutation.error?.message ?? null

	if (stripeInstance == null) {
		return (
			<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && handleClose()}>
				<Ariakit.Dialog className={checkoutDialogClassName} backdrop={checkoutBackdrop} portal unmountOnHide>
					<div className={checkoutHeaderClassName}>
						<h2 className={checkoutTitleClassName}>Checkout</h2>
						<Ariakit.DialogDismiss className={checkoutCloseButtonClassName}>
							<Icon name="x" className="h-6 w-6" />
						</Ariakit.DialogDismiss>
					</div>
					<div className="px-5 py-8 text-center text-(--sub-text-muted)">
						<p className="mb-2 text-base text-(--sub-ink-primary)">Stripe is not configured.</p>
						<p className="text-sm">Please set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in your environment.</p>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		)
	}

	if (result?.kind === 'paidUpgrade') {
		const planName = type === 'api' ? 'API' : type === 'llamafeed' ? 'Pro' : type
		const billingPeriod = billingInterval === 'year' ? 'Annual' : 'Monthly'

		return (
			<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && handleClose()}>
				<Ariakit.Dialog className={checkoutDialogClassName} backdrop={checkoutBackdrop} portal unmountOnHide>
					<div className={checkoutHeaderClassName}>
						<h2 className={checkoutTitleClassName}>Complete Your Upgrade</h2>
						<Ariakit.DialogDismiss className={checkoutCloseButtonClassName}>
							<Icon name="x" className="h-6 w-6" />
						</Ariakit.DialogDismiss>
					</div>

					<div className="border-b border-(--sub-border-slate-100) bg-(--sub-surface-panel) px-5 py-4">
						<div className="space-y-3 text-(--sub-ink-primary)">
							<div>
								<h3 className="text-xs font-medium text-(--sub-text-muted)">Upgrading to</h3>
								<p className="text-lg font-semibold text-(--sub-ink-primary)">
									{planName} - {billingPeriod}
								</p>
							</div>

							{result.pricing ? (
								<div className="space-y-2 pt-2">
									<div className="flex justify-between text-sm">
										<span className="text-(--sub-text-muted)">New subscription price</span>
										<span className="font-medium text-(--sub-ink-primary)">
											{formatAmount(result.pricing.newSubscriptionPrice, result.pricing.currency)}
											<span className="text-(--sub-text-muted)">/{billingInterval === 'year' ? 'year' : 'month'}</span>
										</span>
									</div>

									{result.pricing.prorationCredit > 0 ? (
										<div className="flex justify-between text-sm">
											<span className="text-(--sub-text-muted)">Proration credit</span>
											<span className="font-medium text-green-600">
												-{formatAmount(result.pricing.prorationCredit, result.pricing.currency)}
											</span>
										</div>
									) : null}

									<div className="border-t border-(--sub-border-slate-100) pt-2">
										<div className="flex justify-between">
											<span className="font-semibold text-(--sub-ink-primary)">Amount due today</span>
											<span className="text-lg font-semibold text-(--sub-brand-primary)">
												{formatAmount(result.pricing.amount, result.pricing.currency)}
											</span>
										</div>
									</div>

									<p className="pt-1 text-xs text-(--sub-text-muted)">
										You'll be charged immediately and your subscription will be updated.
									</p>
								</div>
							) : (
								<p className="text-sm text-(--sub-text-muted)">
									Enter your payment details below to complete the upgrade.
								</p>
							)}
						</div>
					</div>

					<div className="p-5">
						<Elements
							stripe={stripeInstance}
							options={{
								clientSecret: result.clientSecret
							}}
						>
							<UpgradePaymentForm postCheckoutPath={postCheckoutPath} />
						</Elements>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		)
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && handleClose()}>
			<Ariakit.Dialog className={checkoutDialogClassName} backdrop={checkoutBackdrop} portal unmountOnHide>
				<div className={checkoutHeaderClassName}>
					<h2 className={checkoutTitleClassName}>Complete Your Purchase</h2>
					<Ariakit.DialogDismiss className={checkoutCloseButtonClassName}>
						<Icon name="x" className="h-6 w-6" />
					</Ariakit.DialogDismiss>
				</div>

				{errorMessage ? (
					<div className="border-b border-(--sub-border-slate-100) bg-(--sub-orange-400)/10 p-4">
						<div className="flex items-center gap-2 text-(--error)">
							<Icon name="alert-warning" height={20} width={20} className="shrink-0" />
							<p className="text-sm">{errorMessage}</p>
						</div>
					</div>
				) : (
					<div className="min-h-[400px] p-4">
						<EmbeddedCheckoutProvider stripe={stripeInstance} options={{ fetchClientSecret }}>
							<EmbeddedCheckout />
						</EmbeddedCheckoutProvider>
					</div>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

function UpgradePaymentForm({ postCheckoutPath }: { postCheckoutPath: string }) {
	const stripe = useStripe()
	const elements = useElements()

	const paymentMutation = useMutation({
		mutationFn: async () => {
			if (!stripe || !elements) throw new Error('Stripe not loaded')

			const submitResult = await elements.submit()
			if (submitResult.error) {
				throw new Error(submitResult.error.message || 'Payment failed')
			}

			const confirmResult = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}${postCheckoutPath}`
				},
				redirect: 'if_required'
			})

			if (confirmResult.error) {
				throw new Error(confirmResult.error.message || 'Payment failed')
			}

			if (!confirmResult.paymentIntent) {
				throw new Error('Unexpected payment response. Please check your account or try again.')
			}

			if (confirmResult.paymentIntent.status !== 'succeeded') {
				throw new Error(getFriendlyPaymentStatus(confirmResult.paymentIntent.status))
			}

			return confirmResult.paymentIntent
		},
		onSuccess: () => {
			window.location.href = `${window.location.origin}${postCheckoutPath}`
		}
	})

	const handleSubmit = (e: FormSubmitEvent) => {
		e.preventDefault()
		paymentMutation.mutate()
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			{paymentMutation.error ? (
				<div className="rounded-lg bg-(--sub-orange-400)/10 p-3">
					<div className="flex items-center gap-2 text-(--error)">
						<Icon name="alert-warning" height={16} width={16} className="shrink-0" />
						<p className="text-sm">{paymentMutation.error.message}</p>
					</div>
				</div>
			) : null}
			<PaymentElement />
			<button
				type="submit"
				disabled={!stripe || paymentMutation.isPending}
				className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) px-6 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
			>
				{paymentMutation.isPending ? 'Processing...' : 'Complete Upgrade'}
			</button>
		</form>
	)
}
