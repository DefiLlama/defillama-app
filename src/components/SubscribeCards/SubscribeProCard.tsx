import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignIn } from '~/containers/Subscribtion/SignIn'
import { BasicLink } from '../Link'

interface SubscribeProCardProps {
	context?: 'modal' | 'page' | 'account'
	active?: boolean
	returnUrl?: string
	onCancelSubscription?: () => void
}

export function SubscribeProCard({
	context = 'page',
	active = false,
	onCancelSubscription,
	returnUrl
}: SubscribeProCardProps) {
	const isModal = context === 'modal'

	return (
		<>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap text-[#5C5CF9]">Pro</h2>
			<div className="relative z-10 mt-1 flex items-center justify-center">
				<span className="bg-linear-to-r from-[#5C5CF9] to-[#7B7BFF] bg-clip-text text-center text-2xl font-medium text-transparent">
					49 USD
				</span>
				<span className="ml-1 text-[#8a8c90]">/month</span>
			</div>
			<p className="relative z-10 mt-1 text-center font-medium text-[#8a8c90]">Multiple payment options</p>
			<ul className="mx-auto mb-auto flex w-full flex-col gap-3 py-6 max-sm:text-sm">
				<li className="flex flex-col gap-3">
					<div className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>Create Custom DefiLlama Pro Dashboards</span>
					</div>
					<ul className="flex flex-col gap-3 pl-6">
						<li className="flex flex-nowrap items-start gap-1">
							<span className="relative w-4 shrink-0 text-center">•</span>
							<span>Generate custom dashboards with LlamaAI</span>
						</li>
					</ul>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>CSV Data downloads</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Personalized Analysis with Custom Columns</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Access to upcoming DefiLlama products</span>
				</li>
				<li className="flex flex-col gap-3">
					<div className="flex flex-nowrap items-start gap-2.5">
						<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
						<span>Full access to LlamaFeed</span>
					</div>
					<ul className="flex flex-col gap-3 pl-6">
						<li className="flex flex-nowrap items-start gap-1">
							<span className="relative w-4 shrink-0 text-center">•</span>
							<span>Premium Sections Unlocked (Listings, Stocks...)</span>
						</li>
						<li className="flex flex-nowrap items-start gap-1">
							<span className="relative w-4 shrink-0 text-center">•</span>
							<span>Increased Content Per Section</span>
						</li>
						<li className="flex flex-nowrap items-start gap-1">
							<span className="relative w-4 shrink-0 text-center">•</span>
							<span>AI-Powered News Summaries</span>
						</li>
						<li className="flex flex-nowrap items-start gap-1">
							<span className="relative w-4 shrink-0 text-center">•</span>
							<span>Flexible Content Filtering & Customization</span>
						</li>
						<li className="flex flex-nowrap items-start gap-1">
							<span className="relative w-4 shrink-0 text-center">•</span>
							<span>Redesigned for better usability on all devices</span>
						</li>
					</ul>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="x" height={16} width={16} className="relative top-0.5 shrink-0 text-red-400" />
					<span>API access</span>
				</li>
			</ul>
			<div className="relative z-10 mx-auto flex w-full max-w-[408px] flex-col gap-3">
				{active ? (
					<div className="flex flex-col gap-2">
						<span className="text-center font-bold text-green-400">Current Plan</span>
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
						{(context === 'page' || context === 'account') && (
							<>
								<SignIn text="Already a subscriber? Sign In" />
								<div className="grid grid-cols-2 gap-3 max-sm:w-full max-sm:grid-cols-1">
									{context === 'account' ? (
										<>
											<PaymentButton paymentMethod="llamapay" type="llamafeed" />
											<PaymentButton paymentMethod="stripe" type="llamafeed" />
										</>
									) : (
										<>
											<PaymentButton paymentMethod="llamapay" type="llamafeed" />
											<PaymentButton paymentMethod="stripe" type="llamafeed" />
										</>
									)}
								</div>
							</>
						)}
						{isModal && (
							<BasicLink
								href={returnUrl ? `/subscription?returnUrl=${encodeURIComponent(returnUrl)}` : '/subscription'}
								className="mt-3 block w-full rounded-lg bg-[#5C5CF9] px-4 py-2 text-center font-medium text-white transition-colors hover:bg-[#4A4AF0]"
							>
								Go to Subscription Page
							</BasicLink>
						)}
					</>
				)}
			</div>
		</>
	)
}

interface SubscribeProModalProps extends SubscribeProCardProps {
	isOpen: boolean
	onClose: () => void
}

export function SubscribeProModal({ isOpen, onClose, ...props }: SubscribeProModalProps) {
	const router = useRouter()
	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={() => onClose()}>
			<Ariakit.Dialog
				className="dialog gap-0 shadow-[0_0_150px_75px_rgba(92,92,249,0.15),0_0_75px_25px_rgba(123,123,255,0.1)] md:max-w-[400px]"
				portal
				unmountOnHide
			>
				<span className="mx-auto flex w-full max-w-[440px] flex-col">
					<Ariakit.DialogDismiss className="absolute top-3 right-3 z-20 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
						<Icon name="x" className="h-6 w-6" />
					</Ariakit.DialogDismiss>
					<SubscribeProCard context="modal" returnUrl={router.asPath} {...props} />
				</span>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
