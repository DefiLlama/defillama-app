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
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { FormSubmitEvent } from '~/types/forms'
import { handleSimpleFetchResponse } from '~/utils/async'

const stripeInstance = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

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
}

export function StripeCheckoutModal({
	isOpen,
	onClose,
	paymentMethod,
	type,
	billingInterval = 'month',
	isTrial = false
}: StripeCheckoutModalProps) {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()

	const subscriptionMutation = useMutation({
		mutationFn: async (): Promise<SubscriptionResult> => {
			const response = await authorizedFetch(
				`${AUTH_SERVER}/subscription/create`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						redirectUrl: `${window.location.origin}/account?success=true`,
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

	if (!stripeInstance) {
		return (
			<Ariakit.DialogProvider open={isOpen} setOpen={() => handleClose()}>
				<Ariakit.Dialog className="dialog gap-4 md:max-w-[600px]" portal unmountOnHide>
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold">Checkout</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
							<Icon name="x" className="h-6 w-6" />
						</Ariakit.DialogDismiss>
					</div>
					<div className="py-8 text-center text-[#b4b7bc]">
						<p className="mb-2">Stripe is not configured.</p>
						<p className="text-sm">Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment.</p>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		)
	}

	if (result?.kind === 'paidUpgrade') {
		const planName = type === 'api' ? 'API' : type === 'llamafeed' ? 'Pro' : type
		const billingPeriod = billingInterval === 'year' ? 'Annual' : 'Monthly'

		return (
			<Ariakit.DialogProvider open={isOpen} setOpen={() => handleClose()}>
				<Ariakit.Dialog className="dialog gap-0 md:max-w-[600px]" portal unmountOnHide>
					<div className="top-0 z-10 flex items-center justify-between border-b bg-(--app-bg) p-4">
						<h2 className="text-xl font-bold">Complete Your Upgrade</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
							<Icon name="x" className="h-6 w-6" />
						</Ariakit.DialogDismiss>
					</div>

					<div className="border-b border-[#39393E] bg-(--app-bg) p-4">
						<div className="space-y-3">
							<div>
								<h3 className="text-sm font-semibold text-[#8a8c90]">Upgrading to</h3>
								<p className="text-lg font-bold text-black dark:text-white">
									{planName} - {billingPeriod}
								</p>
							</div>

							{result.pricing ? (
								<div className="space-y-2 pt-2">
									<div className="flex justify-between text-sm">
										<span className="text-[#8a8c90]">New subscription price</span>
										<span className="font-medium">
											{formatAmount(result.pricing.newSubscriptionPrice, result.pricing.currency)}
											<span className="text-[#8a8c90]">/{billingInterval === 'year' ? 'year' : 'month'}</span>
										</span>
									</div>

									{result.pricing.prorationCredit > 0 ? (
										<div className="flex justify-between text-sm">
											<span className="text-[#8a8c90]">Proration credit</span>
											<span className="font-medium text-green-400">
												-{formatAmount(result.pricing.prorationCredit, result.pricing.currency)}
											</span>
										</div>
									) : null}

									<div className="border-t border-[#39393E] pt-2">
										<div className="flex justify-between">
											<span className="font-semibold">Amount due today</span>
											<span className="text-lg font-bold text-[#5C5CF9]">
												{formatAmount(result.pricing.amount, result.pricing.currency)}
											</span>
										</div>
									</div>

									<p className="pt-1 text-xs text-[#8a8c90]">
										You'll be charged immediately and your subscription will be updated.
									</p>
								</div>
							) : (
								<p className="text-sm text-[#8a8c90]">Enter your payment details below to complete the upgrade.</p>
							)}
						</div>
					</div>

					<div className="p-4">
						<Elements
							stripe={stripeInstance}
							options={{
								clientSecret: result.clientSecret
							}}
						>
							<UpgradePaymentForm />
						</Elements>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		)
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={() => handleClose()}>
			<Ariakit.Dialog className="dialog gap-0 md:max-w-[600px]" portal unmountOnHide>
				<div className="top-0 z-10 flex items-center justify-between border-b bg-(--app-bg) p-4">
					<h2 className="text-xl font-bold">Complete Your Purchase</h2>
					<Ariakit.DialogDismiss className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
						<Icon name="x" className="h-6 w-6" />
					</Ariakit.DialogDismiss>
				</div>

				{errorMessage ? (
					<div className="border-b border-[#39393E] bg-red-500/10 p-4">
						<div className="flex items-center gap-2 text-red-400">
							<Icon name="alert-triangle" height={20} width={20} />
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

function UpgradePaymentForm() {
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
					return_url: `${window.location.origin}/account?success=true`
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
			window.location.href = `${window.location.origin}/account?success=true`
		}
	})

	const handleSubmit = (e: FormSubmitEvent) => {
		e.preventDefault()
		paymentMutation.mutate()
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{paymentMutation.error ? (
				<div className="rounded-lg bg-red-500/10 p-3">
					<div className="flex items-center gap-2 text-red-400">
						<Icon name="alert-triangle" height={16} width={16} />
						<p className="text-sm">{paymentMutation.error.message}</p>
					</div>
				</div>
			) : null}
			<PaymentElement />
			<button
				type="submit"
				disabled={!stripe || paymentMutation.isPending}
				className="w-full rounded-lg bg-[#5C5CF9] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{paymentMutation.isPending ? 'Processing...' : 'Complete Upgrade'}
			</button>
		</form>
	)
}
