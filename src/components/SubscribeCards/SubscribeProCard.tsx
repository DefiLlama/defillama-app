import * as Ariakit from '@ariakit/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignInForm, SignInModal } from '~/containers/Subscribtion/SignIn'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { WalletProvider } from '~/layout/WalletProvider'
import { BasicLink } from '../Link'
import { QuestionHelper } from '../QuestionHelper'

const StripeCheckoutModal = lazy(() =>
	import('~/components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal }))
)

interface SubscribeProCardProps {
	context?: 'modal' | 'page' | 'account'
	active?: boolean
	returnUrl?: string
	onCancelSubscription?: () => void
	billingInterval?: 'year' | 'month'
	currentBillingInterval?: 'year' | 'month'
	isTrialAvailable?: boolean
}

function SubscribeProCardContent({
	billingInterval = 'month',
	isTrialAvailable = false,
	isAuthenticated = false,
	isTrialActive = false
}: {
	billingInterval?: 'year' | 'month'
	isTrialAvailable?: boolean
	isAuthenticated?: boolean
	isTrialActive?: boolean
}) {
	const monthlyPrice = 49
	const yearlyPrice = monthlyPrice * 10
	const displayPrice = billingInterval === 'year' ? yearlyPrice : monthlyPrice
	const displayPeriod = billingInterval === 'year' ? '/year' : '/month'

	const showTrialAvailable = !isAuthenticated || isTrialAvailable || isTrialActive

	return (
		<>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap text-[#5C5CF9]">Pro</h2>
			<div className="relative z-10 mt-1 flex flex-col items-center justify-center">
				<div
					className={`relative flex items-center ${showTrialAvailable ? 'after:absolute after:top-1/2 after:right-0 after:left-0 after:h-[1.5px] after:bg-[#8a8c90]' : ''}`}
				>
					<span className="bg-linear-to-r from-[#5C5CF9] to-[#7B7BFF] bg-clip-text text-center text-2xl font-medium text-transparent">
						{displayPrice} USD
					</span>
					<span className="ml-1 text-[#8a8c90]">{displayPeriod}</span>
				</div>
				{showTrialAvailable && (
					<div className="flex items-center">
						<span className="text-sm font-bold">Free 7-day trial available</span>
					</div>
				)}
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
								<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
							</svg>{' '}
							- conversational analysis of DefiLlama data
						</span>
					</li>
					<li className="group ml-6 flex items-center gap-2.5">
						<Icon name="check" height={16} width={16} className="shrink-0 text-green-400" />
						<span>Deep research: 5/day</span>
						{showTrialAvailable ? (
							<QuestionHelper text="During trial, deep research is limited to 3 questions. Full subscription includes 5/day." />
						) : null}
					</li>
					<li className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>DefiLlama Pro Dashboards - build custom dashboards</span>
					</li>
					<li className="flex flex-nowrap items-center gap-2.5">
						<Icon name="check" height={16} width={16} className="shrink-0 text-green-400" />
						<span>CSV Downloads - export any dataset</span>
						{showTrialAvailable ? <QuestionHelper text="Trial accounts include 1 CSV download." /> : null}
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

interface EndTrialModalProps {
	isOpen: boolean
	onClose: () => void
}

function EndTrialModal({ isOpen, onClose }: EndTrialModalProps) {
	const { endTrialSubscription, isEndTrialLoading } = useSubscribe()

	const handleEndTrial = async () => {
		try {
			await endTrialSubscription()
			onClose()
		} catch (error) {
			console.error('Failed to end trial:', error)
		}
	}

	return (
		<Ariakit.Dialog
			open={isOpen}
			onClose={onClose}
			className="dialog flex max-h-[90dvh] max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none"
			portal
			unmountOnHide
		>
			<div className="flex items-center justify-between">
				<h3 className="text-xl font-bold">Upgrade to Full Access</h3>
				<button
					onClick={onClose}
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
					onClick={handleEndTrial}
					disabled={isEndTrialLoading}
					className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isEndTrialLoading ? 'Processing...' : 'Confirm & Upgrade Now'}
				</button>
				<button
					onClick={onClose}
					disabled={isEndTrialLoading}
					className="w-full rounded-lg border border-[#39393E] px-4 py-2 text-[#8a8c90] transition-colors hover:bg-[#2a2b30] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
				>
					Close
				</button>
			</div>
		</Ariakit.Dialog>
	)
}

export function SubscribeProCard({
	context = 'page',
	active = false,
	onCancelSubscription,
	returnUrl: _returnUrl,
	billingInterval = 'month',
	currentBillingInterval
}: SubscribeProCardProps) {
	const { loading, isTrialAvailable } = useSubscribe()
	const { isAuthenticated, isTrial } = useAuthContext()
	const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
	const [isTrialModalOpen, setIsTrialModalOpen] = useState(false)
	const [isEndingTrialModalOpen, setIsEndingTrialModalOpen] = useState(false)

	const handleUpgradeToYearly = () => {
		setIsUpgradeModalOpen(true)
	}

	return (
		<>
			<SubscribeProCardContent
				billingInterval={billingInterval}
				isTrialAvailable={isTrialAvailable}
				isTrialActive={isTrial}
				isAuthenticated={isAuthenticated}
			/>
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
						{isTrial && (
							<button
								className="mt-2 w-full rounded-lg bg-[#5C5CF9] px-4 py-2 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
								onClick={() => setIsEndingTrialModalOpen(true)}
							>
								Upgrade to Full Access
							</button>
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
						{isAuthenticated && isTrialAvailable && (
							<div className="flex flex-col gap-1.5">
								<button
									onClick={() => setIsTrialModalOpen(true)}
									className="flex w-full items-center justify-center gap-2 rounded-lg border border-white bg-[#5C5CF9] px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-[#4A4AF0] hover:shadow-lg"
								>
									Free trial for 7 days
									<QuestionHelper text="CSV downloads are disabled during the trial period." />
								</button>
							</div>
						)}
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
				<Suspense fallback={<></>}>
					<StripeCheckoutModal
						isOpen={isUpgradeModalOpen}
						onClose={() => setIsUpgradeModalOpen(false)}
						paymentMethod="stripe"
						type="llamafeed"
						billingInterval="year"
					/>
				</Suspense>
			)}
			{isTrialModalOpen && (
				<Suspense fallback={<></>}>
					<StripeCheckoutModal
						isOpen={isTrialModalOpen}
						onClose={() => setIsTrialModalOpen(false)}
						paymentMethod="stripe"
						type="llamafeed"
						billingInterval="month"
						isTrial
					/>
				</Suspense>
			)}
			<EndTrialModal isOpen={isEndingTrialModalOpen} onClose={() => setIsEndingTrialModalOpen(false)} />
		</>
	)
}

interface SubscribeProModalProps extends SubscribeProCardProps {
	returnUrl?: string
	dialogStore: Ariakit.DialogStore
}

export function SubscribeProModal({ dialogStore, returnUrl, ...props }: SubscribeProModalProps) {
	const router = useRouter()
	const { isAuthenticated, isTrial } = useAuthContext()

	const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)

	useEffect(() => {
		if (dialogStore?.getState()?.open && typeof window !== 'undefined' && (window as any).umami) {
			;(window as any).umami.track('subscribe-modal-open')
		}
	}, [dialogStore])

	const finalReturnUrl = returnUrl ?? router.asPath

	return (
		<WalletProvider>
			<Ariakit.DialogProvider store={dialogStore}>
				<Ariakit.Dialog
					className="dialog flex max-h-[90dvh] max-w-md flex-col overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-4 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none sm:p-6"
					portal
					unmountOnHide
					onClose={() => setIsSignInModalOpen(false)}
				>
					<span className="mx-auto flex h-full w-full max-w-[440px] flex-col">
						{isSignInModalOpen ? (
							<SignInForm text="Already a subscriber? Sign In" dialogStore={dialogStore} returnUrl={finalReturnUrl} />
						) : (
							<>
								<Ariakit.DialogDismiss className="ml-auto rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white">
									<Icon name="x" height={18} width={18} />
									<span className="sr-only">Close</span>
								</Ariakit.DialogDismiss>
								<SubscribeProCardContent
									isAuthenticated={isAuthenticated}
									isTrialActive={isTrial}
									billingInterval={props.billingInterval}
									isTrialAvailable={true}
								/>
								<div className="flex flex-col gap-3">
									<BasicLink
										href="/subscription"
										data-umami-event="subscribe-modal-goto-page"
										className="mt-3 block w-full rounded-lg bg-[#5C5CF9] px-4 py-2 text-center font-medium text-white transition-colors hover:bg-[#4A4AF0]"
									>
										Unlock Pro Features
									</BasicLink>

									{!isAuthenticated && (
										<button
											className="mx-auto w-full flex-1 rounded-lg border border-[#39393E] py-2 text-center font-medium transition-colors hover:bg-[#2a2b30] disabled:cursor-not-allowed"
											onClick={() => setIsSignInModalOpen(true)}
										>
											Already a subscriber? Sign In
										</button>
									)}
								</div>
							</>
						)}
					</span>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</WalletProvider>
	)
}
