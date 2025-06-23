import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignIn } from '~/containers/Subscribtion/SignIn'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { BasicLink } from '../Link'

interface SubscribePlusCardProps {
	context?: 'modal' | 'page' | 'account'
	active?: boolean
}

export function SubscribePlusCard({
	context = 'page',
	active = false,
	onCancelSubscription
}: SubscribePlusCardProps & { onCancelSubscription?: () => void }) {
	const [isDarkMode] = useDarkModeManager()
	const isModal = context === 'modal'
	const shouldShowLightMode = isModal && !isDarkMode
	return (
		<div
			className={`price-card py-8 flex flex-col w-[92vw] px-4 snap-center flex-shrink-0 md:w-auto md:flex-1 md:max-w-[400px] md:px-5 md:snap-none md:flex-shrink ${
				shouldShowLightMode ? 'bg-[#f8f9fa] border-[#e5e7eb]' : 'bg-[#22242930] border-[#4a4a50]'
			} backdrop-blur-md rounded-xl border shadow-md overflow-hidden relative transition-all duration-300${
				isModal ? '' : ' hover:transform md:hover:scale-[1.02]'
			}`}
		>
			<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#5c5cf9] to-transparent opacity-20"></div>
			<div className="absolute top-[-30px] right-[-30px] w-[80px] h-[80px] rounded-full bg-[#5c5cf9] opacity-5 blur-2xl"></div>
			<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center text-[#5C5CF9] relative z-10">Llama+</h2>
			<div className="flex items-center justify-center mt-1 relative z-10">
				<span className="text-center text-2xl font-medium bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] bg-clip-text text-transparent">
					49 USD
				</span>
				<span className="text-[#8a8c90] ml-1">/month</span>
			</div>
			<p className="text-center font-medium text-[#8a8c90] mt-1 relative z-10">Multiple payment options</p>
			<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
				<li className="flex flex-col gap-3">
					<div className="flex flex-nowrap gap-[10px] items-start">
						<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
						<span>Full access to LlamaFeed</span>
					</div>
					<ul className="flex flex-col pl-6 gap-3">
						<li className="flex flex-nowrap gap-[4px] items-start">
							<span className="relative flex-shrink-0 w-4 text-center">•</span>
							<span>Premium Sections Unlocked (Listings, Stocks...)</span>
						</li>
						<li className="flex flex-nowrap gap-[4px] items-start">
							<span className="relative flex-shrink-0 w-4 text-center">•</span>
							<span>Increased Content Per Section</span>
						</li>
						<li className="flex flex-nowrap gap-[4px] items-start">
							<span className="relative flex-shrink-0 w-4 text-center">•</span>
							<span>AI-Powered News Summaries</span>
						</li>
						<li className="flex flex-nowrap gap-[4px] items-start">
							<span className="relative flex-shrink-0 w-4 text-center">•</span>
							<span>Flexible Content Filtering & Customization</span>
						</li>
						<li className="flex flex-nowrap gap-[4px] items-start">
							<span className="relative flex-shrink-0 w-4 text-center">•</span>
							<span>Redesigned for better usability on all devices</span>
						</li>
					</ul>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
					<span>CSV Data downloads</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
					<span>Personalized Analysis with Custom Columns</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
					<span>Create Custom DefiLlama Pro Dashboards</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
					<span>Access to upcoming DefiLlama products</span>
				</li>
			</ul>
			<div className="w-full max-w-[408px] mx-auto flex flex-col gap-3 relative z-10">
				{active ? (
					<div className="flex flex-col gap-2">
						<span className="text-center text-green-400 font-bold">Current Plan</span>
						{onCancelSubscription && (
							<button
								className="w-full mt-2 px-4 py-2 bg-[#222429] hover:bg-[#39393E] text-white rounded-lg transition-colors"
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
								<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 max-sm:w-full">
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
								href="/subscription"
								className="w-full mt-3 px-4 py-2 bg-[#5C5CF9] hover:bg-[#4A4AF0] text-white rounded-lg transition-colors text-center font-medium block"
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
