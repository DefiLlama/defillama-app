import { useCallback, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
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
	const [error, setError] = useState<string | null>(null)

	const fetchClientSecret = useCallback(async () => {
		try {
			setError(null)

			const subscriptionData = {
				redirectUrl: `${window.location.origin}/account?session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${window.location.origin}/subscription`,
				provider: paymentMethod,
				subscriptionType: type || 'api',
				billingInterval,
				uiMode: 'embedded'
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
				throw new Error(data.message || 'Failed to create subscription')
			}

			if (!data.clientSecret) {
				throw new Error('No client secret returned from server')
			}

			return data.clientSecret
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to initialize checkout'
			setError(errorMessage)
			throw err
		}
	}, [authorizedFetch, paymentMethod, type, billingInterval])

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

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={() => onClose()}>
			<Ariakit.Dialog className="dialog gap-0 md:max-w-[600px]" portal unmountOnHide>
				<div className="sticky top-0 z-10 flex items-center justify-between border-b p-4">
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
