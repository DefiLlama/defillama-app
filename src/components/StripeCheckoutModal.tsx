import { useCallback, useState } from 'react'
import { useRouter } from 'next/router'
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
import { Icon } from '~/components/Icon'
import { AUTH_SERVER, STRIPE_PUBLISHABLE_KEY } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'

const stripeInstance = loadStripe(STRIPE_PUBLISHABLE_KEY)

interface StripeCheckoutModalProps {
	isOpen: boolean
	onClose: () => void
	paymentMethod: 'stripe'
	type: 'api' | 'contributor' | 'llamafeed'
	billingInterval?: 'year' | 'month'
}

export function StripeCheckoutModal({
	isOpen,
	onClose,
	paymentMethod,
	type,
	billingInterval = 'month'
}: StripeCheckoutModalProps) {
	const { authorizedFetch } = useAuthContext()!
	const router = useRouter()
	const queryClient = useQueryClient()
	const [error, setError] = useState<string | null>(null)
	const [isUpgrade, setIsUpgrade] = useState(false)
	const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
	const [requiresPayment, setRequiresPayment] = useState<boolean>(true)
	const [upgradeClientSecret, setUpgradeClientSecret] = useState<string | null>(null)
	const [upgradePricing, setUpgradePricing] = useState<{
		amount: number
		currency: string
		prorationCredit: number
		newSubscriptionPrice: number
	} | null>(null)

	const fetchClientSecret = useCallback(async () => {
		try {
			setError(null)

			const subscriptionData = {
				redirectUrl: `${window.location.origin}/account`,
				cancelUrl: `${window.location.origin}/subscription`,
				provider: paymentMethod,
				subscriptionType: type || 'api',
				billingInterval
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

			console.log('data', data)

			if (!response.ok) {
				throw new Error(data.message || 'Failed to create subscription')
			}

			// Check if this is an upgrade
			if (data.isUpgrade) {
				setIsUpgrade(true)
				setSubscriptionId(data.subscriptionId)
				setRequiresPayment(data.requiresPayment !== false)

				// If no payment required, close modal and refresh
				if (!data.requiresPayment) {
					await queryClient.invalidateQueries({ queryKey: ['subscription'] })
					onClose()
					return null
				}

				// Payment required - set client secret and pricing info
				if (!data.clientSecret) {
					throw new Error('No client secret returned for upgrade payment')
				}

				setUpgradeClientSecret(data.clientSecret)

				// Set pricing information if available
				if (data.amount !== undefined && data.currency) {
					setUpgradePricing({
						amount: data.amount,
						currency: data.currency,
						prorationCredit: data.prorationCredit || 0,
						newSubscriptionPrice: data.newSubscriptionPrice || 0
					})
				}

				return null // Don't use embedded checkout for upgrades
			}

			// For new subscriptions, client secret is required
			if (!data.clientSecret) {
				throw new Error('No client secret returned from server')
			}

			return data.clientSecret
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to initialize checkout'
			setError(errorMessage)
			throw err
		}
	}, [authorizedFetch, paymentMethod, type, billingInterval, onClose, queryClient])

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
		const formatAmount = (cents: number, currency: string) => {
			const amount = cents / 100
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: currency.toUpperCase()
			}).format(amount)
		}

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
								<Icon name="alert-circle" height={20} width={20} />
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
							<UpgradePaymentForm
								subscriptionId={subscriptionId!}
								onSuccess={() => {
									queryClient.invalidateQueries({ queryKey: ['subscription'] })
									onClose()
								}}
								onError={setError}
							/>
						</Elements>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		)
	}

	// Render new subscription checkout
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
							<Icon name="alert-circle" height={20} width={20} />
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
function UpgradePaymentForm({
	subscriptionId,
	onSuccess,
	onError
}: {
	subscriptionId: string
	onSuccess: () => void
	onError: (error: string) => void
}) {
	const { authorizedFetch } = useAuthContext()!
	const [isProcessing, setIsProcessing] = useState(false)
	const stripe = useStripe()
	const elements = useElements()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!stripe || !elements) {
			return
		}

		setIsProcessing(true)
		onError('')

		try {
			const { error: submitError } = await elements.submit()
			if (submitError) {
				throw new Error(submitError.message)
			}

			const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/account`
				},
				redirect: 'if_required'
			})

			if (confirmError) {
				throw new Error(confirmError.message)
			}

			if (paymentIntent?.status === 'succeeded') {
				// Call backend to confirm upgrade
				const response = await authorizedFetch(
					`${AUTH_SERVER}/subscription/confirm-upgrade`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							paymentIntentId: paymentIntent.id,
							subscriptionId
						})
					},
					true
				)

				if (!response.ok) {
					throw new Error('Failed to confirm upgrade')
				}

				onSuccess()
			}
		} catch (err) {
			onError(err instanceof Error ? err.message : 'Payment failed')
		} finally {
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
