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
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Icon } from '~/components/Icon'
import { AUTH_SERVER, STRIPE_PUBLISHABLE_KEY } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { FormSubmitEvent } from '~/types/forms'

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
	const { authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const [error, setError] = useState<string | null>(null)
	const [isUpgrade, setIsUpgrade] = useState(false)
	const [requiresPayment, setRequiresPayment] = useState<boolean>(true)
	const [upgradeClientSecret, setUpgradeClientSecret] = useState<string | null>(null)
	const [upgradePricing, setUpgradePricing] = useState<{
		amount: number
		currency: string
		prorationCredit: number
		newSubscriptionPrice: number
	} | null>(null)

	const fetchClientSecret = useCallback(async () => {
		let subscriptionType = type
		if (!subscriptionType) {
			subscriptionType = 'api'
		}
		setError(null)

		const doFetch = async () => {
			const subscriptionData = {
				redirectUrl: `${window.location.origin}/account?success=true`,
				cancelUrl: `${window.location.origin}/subscription`,
				provider: paymentMethod,
				subscriptionType,
				billingInterval,
				isTrial
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/subscription/create`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(subscriptionData)
				},
				true
			)

			const data = await response.json()

			if (!response.ok) {
				let errorMessage = 'Failed to create subscription'
				if (data.message) {
					errorMessage = data.message
				}
				setError(errorMessage)
				return Promise.reject(new Error(errorMessage))
			}

			if (data.isUpgrade) {
				setIsUpgrade(true)
				let needsPayment = true
				if (data.requiresPayment === false) {
					needsPayment = false
				}
				setRequiresPayment(needsPayment)

				if (!data.requiresPayment) {
					await queryClient.invalidateQueries({ queryKey: ['subscription'] })
					onClose()
					return null
				}

				if (!data.clientSecret) {
					const msg = 'No client secret returned for upgrade payment'
					setError(msg)
					return Promise.reject(new Error(msg))
				}

				setUpgradeClientSecret(data.clientSecret)

				if (data.amount !== undefined) {
					if (data.currency) {
						let prorationCredit = 0
						if (data.prorationCredit) {
							prorationCredit = data.prorationCredit
						}
						let newSubscriptionPrice = 0
						if (data.newSubscriptionPrice) {
							newSubscriptionPrice = data.newSubscriptionPrice
						}
						setUpgradePricing({
							amount: data.amount,
							currency: data.currency,
							prorationCredit,
							newSubscriptionPrice
						})
					} else {
						console.warn(
							'Upgrade pricing payload inconsistency: data.amount is present but data.currency is missing.',
							data
						)
					}
				}

				return null
			}

			if (!data.clientSecret) {
				const msg = 'No client secret returned from server'
				setError(msg)
				return Promise.reject(new Error(msg))
			}

			return data.clientSecret
		}
		try {
			return await doFetch()
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to initialize checkout'
			setError(errorMessage)
			throw err
		}
	}, [authorizedFetch, paymentMethod, type, billingInterval, isTrial, onClose, queryClient])

	const options = { fetchClientSecret }

	if (!stripeInstance) {
		return (
			<Ariakit.DialogProvider open={isOpen} setOpen={() => onClose()}>
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

	// Render upgrade payment form
	if (isUpgrade && upgradeClientSecret && requiresPayment) {
		const planName = type === 'api' ? 'API' : type === 'llamafeed' ? 'Pro' : type
		const billingPeriod = billingInterval === 'year' ? 'Annual' : 'Monthly'

		return (
			<Ariakit.DialogProvider open={isOpen} setOpen={() => onClose()}>
				<Ariakit.Dialog className="dialog gap-0 md:max-w-[600px]" portal unmountOnHide>
					<div className="top-0 z-10 flex items-center justify-between border-b bg-(--app-bg) p-4">
						<h2 className="text-xl font-bold">Complete Your Upgrade</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
							<Icon name="x" className="h-6 w-6" />
						</Ariakit.DialogDismiss>
					</div>

					{error && (
						<div className="border-b border-[#39393E] bg-red-500/10 p-4">
							<div className="flex items-center gap-2 text-red-400">
								<Icon name="alert-triangle" height={20} width={20} />
								<p className="text-sm">{error}</p>
							</div>
						</div>
					)}

					<div className="border-b border-[#39393E] bg-(--app-bg) p-4">
						<div className="space-y-3">
							<div>
								<h3 className="text-sm font-semibold text-[#8a8c90]">Upgrading to</h3>
								<p className="text-lg font-bold text-black dark:text-white">
									{planName} - {billingPeriod}
								</p>
							</div>

							{upgradePricing ? (
								<div className="space-y-2 pt-2">
									<div className="flex justify-between text-sm">
										<span className="text-[#8a8c90]">New subscription price</span>
										<span className="font-medium">
											{formatAmount(upgradePricing.newSubscriptionPrice, upgradePricing.currency)}
											<span className="text-[#8a8c90]">/{billingInterval === 'year' ? 'year' : 'month'}</span>
										</span>
									</div>

									{upgradePricing.prorationCredit > 0 && (
										<div className="flex justify-between text-sm">
											<span className="text-[#8a8c90]">Proration credit</span>
											<span className="font-medium text-green-400">
												-{formatAmount(upgradePricing.prorationCredit, upgradePricing.currency)}
											</span>
										</div>
									)}

									<div className="border-t border-[#39393E] pt-2">
										<div className="flex justify-between">
											<span className="font-semibold">Amount due today</span>
											<span className="text-lg font-bold text-[#5C5CF9]">
												{formatAmount(upgradePricing.amount, upgradePricing.currency)}
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
								clientSecret: upgradeClientSecret
							}}
						>
							<UpgradePaymentForm onError={setError} />
						</Elements>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		)
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={() => onClose()}>
			<Ariakit.Dialog className="dialog gap-0 md:max-w-[600px]" portal unmountOnHide>
				<div className="top-0 z-10 flex items-center justify-between border-b bg-(--app-bg) p-4">
					<h2 className="text-xl font-bold">Complete Your Purchase</h2>
					<Ariakit.DialogDismiss className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
						<Icon name="x" className="h-6 w-6" />
					</Ariakit.DialogDismiss>
				</div>

				{error && (
					<div className="border-b border-[#39393E] bg-red-500/10 p-4">
						<div className="flex items-center gap-2 text-red-400">
							<Icon name="alert-triangle" height={20} width={20} />
							<p className="text-sm">{error}</p>
						</div>
					</div>
				)}

				<div className="min-h-[400px] p-4">
					<EmbeddedCheckoutProvider stripe={stripeInstance} options={options}>
						<EmbeddedCheckout />
					</EmbeddedCheckoutProvider>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

// Payment form component for upgrades
function UpgradePaymentForm({ onError }: { onError: (error: string) => void }) {
	const queryClient = useQueryClient()
	const [isProcessing, setIsProcessing] = useState(false)
	const stripe = useStripe()
	const elements = useElements()

	const handleSubmit = async (e: FormSubmitEvent) => {
		e.preventDefault()

		if (!stripe) return
		if (!elements) return

		setIsProcessing(true)
		onError('')

		try {
			const submitResult = await elements.submit()
			if (submitResult.error) {
				let submitMsg = 'Payment failed'
				if (submitResult.error.message) {
					submitMsg = submitResult.error.message
				}
				onError(submitMsg)
				setIsProcessing(false)
				return
			}

			const confirmResult = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/account?success=true`
				},
				redirect: 'if_required'
			})

			if (confirmResult.error) {
				let confirmMsg = 'Payment failed'
				if (confirmResult.error.message) {
					confirmMsg = confirmResult.error.message
				}
				onError(confirmMsg)
				setIsProcessing(false)
				return
			}

			if (confirmResult.paymentIntent) {
				if (confirmResult.paymentIntent.status === 'succeeded') {
					queryClient.invalidateQueries({ queryKey: ['subscription'] })
					window.location.href = `${window.location.origin}/account?success=true`
				} else {
					onError(getFriendlyPaymentStatus(confirmResult.paymentIntent.status))
				}
			}
			setIsProcessing(false)
		} catch (err) {
			let errorMessage = 'Payment failed'
			if (err instanceof Error) {
				errorMessage = err.message
			}
			onError(errorMessage)
			setIsProcessing(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<PaymentElement />
			<button
				type="submit"
				disabled={!stripe || isProcessing}
				className="w-full rounded-lg bg-[#5C5CF9] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isProcessing ? 'Processing...' : 'Complete Upgrade'}
			</button>
		</form>
	)
}
