import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignIn } from '~/containers/Subscribtion/SignIn'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function SubscribeProCard({
	context = 'page',
	active = false,
	onCancelSubscription,
	isLegacyActive = false
}: {
	context?: 'page' | 'account'
	active?: boolean
	onCancelSubscription?: () => void
	isLegacyActive?: boolean
}) {
	const [isDarkMode] = useDarkModeManager()
	const isModal = false
	const shouldShowLightMode = isModal && !isDarkMode
	return (
		<div
			className={`flex w-full shrink-0 snap-center flex-col px-4 py-8 md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 ${
				shouldShowLightMode ? 'border-[#e5e7eb] bg-[#f8f9fa]' : 'border-[#4a4a50] bg-[#22242930]'
			} relative overflow-hidden rounded-xl border shadow-md backdrop-blur-md transition-all duration-300${
				isModal ? '' : 'hover:transform md:hover:scale-[1.02]'
			}`}
		>
			<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-gray-500 to-transparent opacity-20"></div>
			<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-gray-600 opacity-5 blur-2xl"></div>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap text-[#5C5CF9]">API</h2>
			<div className="relative z-10 mt-2 flex items-center justify-center">
				<span className="bg-linear-to-r from-[#5C5CF9] to-[#8a8aff] bg-clip-text text-center text-3xl font-bold text-transparent">
					$300
				</span>
				<span className="ml-1 text-[#8a8c90]">/month</span>
			</div>
			<p className="relative z-10 mt-1 text-center text-sm text-[#8a8c90]">Multiple payment options</p>
			<div className="relative z-10 mx-auto mt-4 flex w-full flex-col gap-3">
				{active && !isLegacyActive ? (
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
							<SignIn
								text="Get Started"
								className="w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20"
							/>
						)}
						{(context === 'account' || isLegacyActive) && (
							<div className="grid grid-cols-2 gap-3 max-sm:w-full max-sm:grid-cols-1">
								<PaymentButton paymentMethod="llamapay" type="api" />
								<PaymentButton paymentMethod="stripe" type="api" />
							</div>
						)}
					</>
				)}
			</div>
			<ul className="mx-auto mb-auto flex w-full flex-col gap-3 py-6 max-sm:text-sm">
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>All features included in Pro tier</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Access to TVL, revenue/fees and prices API endpoints</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Access to all data (unlocks, active users, token liq...)</span>
				</li>
				<li className="flex flex-nowrap items-start gap-2.5">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Priority support</span>
				</li>
				<p className="px-6.5 font-medium">
					<a href="https://api-docs.defillama.com/" target="_blank" rel="noreferrer noopener" className="underline">
						Pro API
					</a>{' '}
					limits:
				</p>
				<li className="flex flex-col gap-2 px-6.5">
					<span>1000 requests/minute</span>
				</li>
				<li className="flex flex-col gap-2 px-6.5">
					<span>1M calls/month</span>
				</li>
				<li className="flex flex-col gap-2 px-6.5">
					<span>$0.60 per 1,000 additional calls after 1M limit</span>
				</li>
			</ul>
		</div>
	)
}
