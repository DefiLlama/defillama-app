import { lazy, Suspense, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SignInModal } from '~/containers/Subscribtion/SignIn'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'

const StripeCheckoutModal = lazy(() =>
	import('~/components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal }))
)

export const PaymentButton = ({
	paymentMethod,
	type = 'api',
	billingInterval = 'month'
}: {
	paymentMethod: 'stripe' | 'llamapay'
	type?: 'api' | 'llamafeed'
	billingInterval?: 'year' | 'month'
}) => {
	const { handleSubscribe, loading } = useSubscribe()
	const { isAuthenticated, user } = useAuthContext()
	const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

	const isStripe = paymentMethod === 'stripe'
	const icon = isStripe ? 'card' : 'wallet'
	const text = isStripe ? 'Pay with Card' : 'Pay with Crypto'

	const planName = type === 'api' ? 'API' : type === 'llamafeed' ? 'Pro' : type

	if (!isAuthenticated) {
		return (
			<SignInModal
				text={text}
				className="group flex w-full items-center justify-center gap-2 rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-3.5 font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md dark:border-[#5C5CF9] dark:bg-[#5C5CF9] dark:hover:bg-[#4A4AF0]"
				pendingActionMessage={`Sign in or create an account to subscribe to the ${planName} plan.`}
			/>
		)
	}

	const handleClick = () => {
		if (!user?.verified && !user?.address) {
			toast.error('Please verify your email first to subscribe')
			return
		}
		// For Stripe, use embedded checkout modal
		if (isStripe) {
			setIsCheckoutModalOpen(true)
		} else {
			// For crypto payments, use the legacy flow
			handleSubscribe(paymentMethod, type, undefined, billingInterval, false)
		}
	}

	return (
		<>
			<button
				onClick={handleClick}
				disabled={loading === paymentMethod}
				className={`group flex w-full items-center justify-center gap-2 rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-3 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5 dark:border-[#5C5CF9] dark:bg-[#5C5CF9] dark:hover:bg-[#4A4AF0] ${type === 'api' && !isStripe ? 'shadow-[0px_0px_32px_0px_#5C5CF980]' : ''}`}
				data-umami-event={`subscribe-${paymentMethod}-${type ?? ''}`}
			>
				{icon && <Icon name={icon} height={14} width={14} className="sm:h-4 sm:w-4" />}
				<span className="wrap-break-word">{text}</span>
			</button>

			{isStripe && (
				<Suspense fallback={<></>}>
					<StripeCheckoutModal
						isOpen={isCheckoutModalOpen}
						onClose={() => setIsCheckoutModalOpen(false)}
						paymentMethod="stripe"
						type={type}
						billingInterval={billingInterval}
					/>
				</Suspense>
			)}
		</>
	)
}
