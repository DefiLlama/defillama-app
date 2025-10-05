import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignIn } from '~/containers/Subscribtion/SignIn'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { BasicLink } from '../Link'

interface SubscribePlusCardProps {
	context?: 'modal' | 'page' | 'account'
	active?: boolean
	returnUrl?: string
}

export function SubscribePlusCard({
	context = 'page',
	active = false,
	onCancelSubscription,
	returnUrl
}: SubscribePlusCardProps & { onCancelSubscription?: () => void }) {
	const [isDarkMode] = useDarkModeManager()
	const isModal = context === 'modal'
	const shouldShowLightMode = isModal && !isDarkMode
	return (
		<div
			className={`flex w-full shrink-0 snap-center flex-col px-4 py-8 md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 ${
				shouldShowLightMode ? 'border-[#e5e7eb] bg-[#f8f9fa]' : 'border-[#4a4a50] bg-[#22242930]'
			} relative overflow-hidden rounded-xl border shadow-md backdrop-blur-md transition-all duration-300${
				isModal ? '' : 'hover:transform md:hover:scale-[1.02]'
			}`}
		>
			<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-[#5c5cf9] to-transparent opacity-20"></div>
			<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-[#5c5cf9] opacity-5 blur-2xl"></div>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap text-[#5C5CF9]">Pro</h2>
			<div className="relative z-10 mt-2 flex items-center justify-center">
				<span className="bg-linear-to-r from-[#5C5CF9] to-[#7B7BFF] bg-clip-text text-center text-2xl font-medium text-transparent">
					49 USD
				</span>
				<span className="ml-1 text-[#8a8c90]">/month</span>
			</div>
			<p className="relative z-10 mt-1 text-center text-sm text-[#8a8c90]">Multiple payment options</p>
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
			<div className="relative z-10 mx-auto flex w-full flex-col gap-3">
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
						{context === 'page' && (
							<>
								<SignIn
									text="Get Started"
									className="w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20"
								/>
							</>
						)}
						{context === 'account' && (
							<div className="grid grid-cols-2 gap-3 max-sm:w-full max-sm:grid-cols-1">
								<PaymentButton paymentMethod="llamapay" type="llamafeed" />
								<PaymentButton paymentMethod="stripe" type="llamafeed" />
							</div>
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
		</div>
	)
}
