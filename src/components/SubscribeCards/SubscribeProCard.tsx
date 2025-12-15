import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignInForm, SignInModal } from '~/containers/Subscribtion/SignIn'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { WalletProvider } from '~/layout/WalletProvider'
import { BasicLink } from '../Link'
import { StripeCheckoutModal } from '../StripeCheckoutModal'

interface SubscribeProCardProps {
	context?: 'modal' | 'page' | 'account'
	active?: boolean
	returnUrl?: string
	onCancelSubscription?: () => void
	billingInterval?: 'year' | 'month'
	currentBillingInterval?: 'year' | 'month'
}

function SubscribeProCardContent({ billingInterval = 'month' }: { billingInterval?: 'year' | 'month' }) {
	const monthlyPrice = 49
	const yearlyPrice = monthlyPrice * 10
	const displayPrice = billingInterval === 'year' ? yearlyPrice : monthlyPrice
	const displayPeriod = billingInterval === 'year' ? '/year' : '/month'

	return (
		<>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap text-[#5C5CF9]">Pro</h2>
			<div className="relative z-10 mt-1 flex flex-col items-center justify-center">
				<div className="flex items-center">
					<span className="bg-linear-to-r from-[#5C5CF9] to-[#7B7BFF] bg-clip-text text-center text-2xl font-medium text-transparent">
						{displayPrice} USD
					</span>
					<span className="ml-1 text-[#8a8c90]">{displayPeriod}</span>
				</div>
				{billingInterval === 'year' && (
					<span className="text-sm text-[#8a8c90]">${(yearlyPrice / 12).toFixed(2)}/month</span>
				)}
			</div>
			{billingInterval === 'month' && (
				<p className="relative z-10 mt-1 text-center font-medium text-[#8a8c90]">Multiple payment options</p>
			)}
			<div className="mx-auto mb-auto flex w-full flex-col gap-3 py-6 max-sm:text-sm">
				<h3 className="font-semibold">Access to:</h3>
				<ul className="flex flex-col gap-3">
					<li className="group flex items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span className="font-bold">
							NEW:{' '}
							<Link href="/ai" className="llamaai-glow-text">
								LlamaAI
							</Link>{' '}
							<svg className="relative mx-1 inline-block h-4 w-4">
								<use href="/icons/ask-llamaai-3.svg#ai-icon" />
							</svg>{' '}
							- conversational analysis of DefiLlama data
						</span>
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>DefiLlama Pro Dashboards - build custom dashboards</span>
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>CSV Downloads - export any dataset</span>
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>Custom Columns - personalized analysis</span>
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>LlamaFeed - real-time premium insights</span>
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>
							<Link href="/sheets" className="underline">
								DefilLama Sheets
							</Link>{' '}
							– access blockchain data in your spreadsheets
						</span>
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>Upcoming DefiLlama Products</span>
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="x" height={16} width={16} className="relative top-0.5 shrink-0 text-red-400" />
						<span>API access not included</span>
					</li>
				</ul>
			</div>
		</>
	)
}

export function SubscribeProCard({
	context = 'page',
	active = false,
	onCancelSubscription,
	returnUrl,
	billingInterval = 'month',
	currentBillingInterval
}: SubscribeProCardProps) {
	const { loading } = useSubscribe()
	const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

	const handleUpgradeToYearly = () => {
		setIsUpgradeModalOpen(true)
	}

	return (
		<>
			<SubscribeProCardContent billingInterval={billingInterval} />
			<div className="relative z-10 mx-auto flex w-full max-w-[408px] flex-col gap-3">
				{active ? (
					<div className="flex flex-col gap-2">
						<span className="text-center font-bold text-green-400">Current Plan</span>
						{(currentBillingInterval === 'month' || !currentBillingInterval) && (
							<div className="flex flex-col gap-2">
								<button
									className="w-full rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] px-4 py-3 font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
									onClick={handleUpgradeToYearly}
									disabled={loading === 'stripe'}
								>
									{loading === 'stripe' ? 'Processing...' : 'Upgrade to Yearly'}
								</button>
								<p className="text-center text-xs text-[#8a8c90]">Switch to annual billing and get 2 months free</p>
							</div>
						)}
						{onCancelSubscription && (
							<button
								className="mt-2 w-full rounded-lg bg-[#222429] px-4 py-2 text-white transition-colors hover:bg-[#39393E]"
								onClick={onCancelSubscription}
							>
								Cancel Subscription
							</button>
						)}
					</div>
				) : (
					<>
						<SignInModal text="Already a subscriber? Sign In" />
						<div
							className={`grid gap-3 max-sm:w-full max-sm:grid-cols-1 ${billingInterval === 'year' ? 'grid-cols-1' : 'grid-cols-2'}`}
						>
							{context === 'account' ? (
								<>
									{billingInterval === 'month' && (
										<PaymentButton paymentMethod="llamapay" type="llamafeed" billingInterval={billingInterval} />
									)}
									<PaymentButton paymentMethod="stripe" type="llamafeed" billingInterval={billingInterval} />
								</>
							) : (
								<>
									{billingInterval === 'month' && (
										<PaymentButton paymentMethod="llamapay" type="llamafeed" billingInterval={billingInterval} />
									)}
									<PaymentButton paymentMethod="stripe" type="llamafeed" billingInterval={billingInterval} />
								</>
							)}
						</div>
					</>
				)}
			</div>
			{isUpgradeModalOpen && (
				<StripeCheckoutModal
					isOpen={isUpgradeModalOpen}
					onClose={() => setIsUpgradeModalOpen(false)}
					paymentMethod="stripe"
					type="llamafeed"
					billingInterval="year"
				/>
			)}
		</>
	)
}

interface SubscribeProModalProps extends SubscribeProCardProps {
	returnUrl?: string
	dialogStore: Ariakit.DialogStore
}

export function SubscribeProModal({ dialogStore, returnUrl, ...props }: SubscribeProModalProps) {
	const router = useRouter()

	const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)

	useEffect(() => {
		if (dialogStore?.getState()?.open && typeof window !== 'undefined' && (window as any).umami) {
			;(window as any).umami.track('subscribe-modal-open')
		}
	}, [dialogStore])

	const finalReturnUrl = returnUrl ? returnUrl : router.asPath

	return (
		<WalletProvider>
			<Ariakit.DialogProvider store={dialogStore}>
				<Ariakit.Dialog
					className="dialog max-sm:drawer flex max-h-[90dvh] max-w-md flex-col overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-4 text-white shadow-2xl max-sm:rounded-b-none sm:p-6"
					portal
					unmountOnHide
					onClose={() => setIsSignInModalOpen(false)}
				>
					<span className="mx-auto flex h-full w-full max-w-[440px] flex-col">
						{isSignInModalOpen ? (
							<SignInForm text="Already a subscriber? Sign In" dialogStore={dialogStore} returnUrl={returnUrl} />
						) : (
							<>
								<Ariakit.DialogDismiss className="ml-auto rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white">
									<Icon name="x" height={18} width={18} />
									<span className="sr-only">Close</span>
								</Ariakit.DialogDismiss>
								<SubscribeProCardContent billingInterval={props.billingInterval} />
								<div className="flex flex-col gap-3">
									<BasicLink
										href={
											finalReturnUrl ? `/subscription?returnUrl=${encodeURIComponent(finalReturnUrl)}` : '/subscription'
										}
										data-umami-event="subscribe-modal-goto-page"
										className="mt-3 block w-full rounded-lg bg-[#5C5CF9] px-4 py-2 text-center font-medium text-white transition-colors hover:bg-[#4A4AF0]"
									>
										Unlock Pro Features
									</BasicLink>

									<button
										className="mx-auto w-full flex-1 rounded-lg border border-[#39393E] py-2 text-center font-medium transition-colors hover:bg-[#2a2b30] disabled:cursor-not-allowed"
										onClick={() => setIsSignInModalOpen(true)}
									>
										Already a subscriber? Sign In
									</button>
								</div>
							</>
						)}
					</span>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</WalletProvider>
	)
}
