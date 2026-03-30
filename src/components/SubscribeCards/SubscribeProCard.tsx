import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { MONTHLY_PRICING_CARDS } from '~/containers/subscription/data'
import { SignIn2Modal } from '~/containers/subscription/SignIn2'
import type { FeatureItem } from '~/containers/subscription/types'
import { WalletProvider } from '~/layout/WalletProvider'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { QuestionHelper } from '../QuestionHelper'

const StripeCheckoutModal = lazy(() =>
	import('~/components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal }))
)

const PRO_CARD = MONTHLY_PRICING_CARDS.find((c) => c.key === 'pro')!

interface SubscribeProCardProps {
	context?: 'modal' | 'page' | 'account'
	active?: boolean
	returnUrl?: string
	onCancelSubscription?: () => void
	isCancelPending?: boolean
	billingInterval?: 'year' | 'month'
	currentBillingInterval?: 'year' | 'month'
	isTrialAvailable?: boolean
}

function ModalFeatureBullet({ item }: { item: FeatureItem }) {
	const highlightPrefix = item.highlightText ? item.label.split(':')[0] : null
	const highlightSuffix = item.highlightText ? item.label.slice((highlightPrefix?.length ?? 0) + 1).trim() : null

	return (
		<li className="flex items-start gap-2">
			<span className="shrink-0">
				{item.availability === 'check' ? (
					<Icon name="check" height={20} width={20} className="text-[#4b86db]" />
				) : (
					<Icon name="minus" height={20} width={20} className="text-[#5f6369]" />
				)}
			</span>
			{item.highlightText ? (
				<span className="bg-linear-to-r from-[#4b86db] to-[#a5c3ed] bg-clip-text text-sm leading-5 text-transparent">
					<span className="underline">{highlightPrefix}</span>
					{highlightSuffix ? `: ${highlightSuffix}` : ''}
				</span>
			) : (
				<span className={`text-sm leading-5 ${item.availability === 'check' ? 'text-[#f6f7f9]' : 'text-[#71757c]'}`}>
					{item.label}
				</span>
			)}
		</li>
	)
}

function SubscribeProCardContent() {
	return (
		<>
			<h2 className="text-lg font-semibold text-white">{PRO_CARD.title}</h2>
			<div className="mt-1 flex flex-col">
				<div className="flex items-end gap-0.5">
					<span className="bg-linear-to-r from-[#4b86db] to-[#a5c3ed] bg-clip-text text-[32px] leading-[42px] font-semibold text-transparent">
						{PRO_CARD.priceMain}
					</span>
					<span className="text-base text-[#c6c6c6]">{PRO_CARD.priceUnit}</span>
				</div>
				{PRO_CARD.priceSecondary ? <p className="text-base text-[#878787]">{PRO_CARD.priceSecondary}</p> : null}
			</div>
			<div className="mt-5 flex flex-col gap-4">
				{PRO_CARD.includedTierText ? (
					<ul className="flex flex-col gap-2">
						<ModalFeatureBullet item={{ label: PRO_CARD.includedTierText, availability: 'check' }} />
					</ul>
				) : null}
				{PRO_CARD.sections.map((section) => (
					<div key={section.title} className="flex flex-col gap-2.5">
						<h3 className="text-base font-medium text-white">{section.title}</h3>
						<ul className="flex flex-col gap-2">
							{section.items.map((item) => (
								<ModalFeatureBullet key={item.label} item={item} />
							))}
						</ul>
					</div>
				))}
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
					onClick={() => {
						void handleEndTrial()
					}}
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
	isCancelPending = false,
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
			<SubscribeProCardContent />
			<div className="relative z-10 mx-auto flex w-full max-w-[408px] flex-col gap-3">
				{active ? (
					<div className="flex flex-col gap-2">
						<span className="text-center font-bold text-green-400">Current Plan</span>
						{currentBillingInterval === 'month' || !currentBillingInterval ? (
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
						) : null}
						{isTrial ? (
							<button
								className="mt-2 w-full rounded-lg bg-[#5C5CF9] px-4 py-2 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
								onClick={() => setIsEndingTrialModalOpen(true)}
							>
								Upgrade to Full Access
							</button>
						) : null}
						{isCancelPending ? (
							<p className="mt-2 text-center text-sm text-yellow-400">Cancellation scheduled</p>
						) : onCancelSubscription ? (
							<button
								className="mt-2 w-full rounded-lg bg-[#222429] px-4 py-2 text-white transition-colors hover:bg-[#39393E]"
								onClick={onCancelSubscription}
							>
								Cancel Subscription
							</button>
						) : null}
					</div>
				) : (
					<>
						<SignIn2Modal text="Already a subscriber? Sign In" />
						{isAuthenticated && isTrialAvailable ? (
							<div className="flex flex-col gap-1.5">
								<button
									onClick={() => setIsTrialModalOpen(true)}
									className="flex w-full items-center justify-center gap-2 rounded-lg border border-white bg-[#5C5CF9] px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-[#4A4AF0] hover:shadow-lg"
								>
									Free trial for 7 days
									<QuestionHelper text="CSV downloads are disabled during the trial period." />
								</button>
							</div>
						) : null}
						<div
							className={`grid gap-3 max-sm:w-full max-sm:grid-cols-1 ${billingInterval === 'year' ? 'grid-cols-1' : 'grid-cols-2'}`}
						>
							{context === 'account' ? (
								<>
									{billingInterval === 'month' ? (
										<PaymentButton paymentMethod="llamapay" type="llamafeed" billingInterval={billingInterval} />
									) : null}
									<PaymentButton paymentMethod="stripe" type="llamafeed" billingInterval={billingInterval} />
								</>
							) : (
								<>
									{billingInterval === 'month' ? (
										<PaymentButton paymentMethod="llamapay" type="llamafeed" billingInterval={billingInterval} />
									) : null}
									<PaymentButton paymentMethod="stripe" type="llamafeed" billingInterval={billingInterval} />
								</>
							)}
						</div>
					</>
				)}
			</div>
			{isUpgradeModalOpen ? (
				<Suspense fallback={<></>}>
					<StripeCheckoutModal
						isOpen={isUpgradeModalOpen}
						onClose={() => setIsUpgradeModalOpen(false)}
						paymentMethod="stripe"
						type="llamafeed"
						billingInterval="year"
						isUpgradeFlow
					/>
				</Suspense>
			) : null}
			{isTrialModalOpen ? (
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
			) : null}
			<EndTrialModal isOpen={isEndingTrialModalOpen} onClose={() => setIsEndingTrialModalOpen(false)} />
		</>
	)
}

interface SubscribeProModalProps extends SubscribeProCardProps {
	returnUrl?: string
	dialogStore: Ariakit.DialogStore
}

export function SubscribeProModal({ dialogStore, returnUrl: _returnUrl }: SubscribeProModalProps) {
	const router = useRouter()
	const { isAuthenticated } = useAuthContext()
	const signInDialogStore = Ariakit.useDialogStore()

	useEffect(() => {
		if (dialogStore?.getState()?.open) {
			trackUmamiEvent('subscribe-modal-open', {
				page: router?.asPath
			})
		}
	}, [dialogStore, router?.asPath])

	return (
		<WalletProvider>
			<Ariakit.DialogProvider store={dialogStore}>
				<Ariakit.Dialog
					className="dialog flex max-h-[85dvh] max-w-md flex-col overflow-hidden rounded-xl border border-[#39393E] bg-[#1a1b1f] p-4 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none sm:p-6"
					portal
					unmountOnHide
				>
					<span className="mx-auto flex h-full w-full max-w-[440px] flex-col overflow-hidden">
						<Ariakit.DialogDismiss className="ml-auto shrink-0 rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white">
							<Icon name="x" height={18} width={18} />
							<span className="sr-only">Close</span>
						</Ariakit.DialogDismiss>
						<div className="min-h-0 flex-1 overflow-y-auto">
							<SubscribeProCardContent />
						</div>
						<div className="flex shrink-0 flex-col gap-3 pt-3">
							<BasicLink
								href="/subscription"
								data-umami-event="subscribe-modal-goto-page"
								className="block w-full rounded-lg bg-[#1f67d2] px-4 py-2 text-center font-medium text-white transition-colors hover:bg-[#1a58b5]"
							>
								Unlock Pro Features
							</BasicLink>

							{!isAuthenticated ? (
								<button
									type="button"
									className="mx-auto w-full flex-1 rounded-lg border border-[#39393E] py-2 text-center font-medium transition-colors hover:bg-[#2a2b30] disabled:cursor-not-allowed"
									onClick={() => {
										dialogStore.hide()
										signInDialogStore.show()
									}}
								>
									Already a subscriber? Sign In
								</button>
							) : null}
						</div>
					</span>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
			<SignIn2Modal store={signInDialogStore} />
		</WalletProvider>
	)
}
