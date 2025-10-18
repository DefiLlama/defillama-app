import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignIn } from '~/containers/Subscribtion/SignIn'

export function SubscribeAPICard({
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
	return (
		<>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap text-[#5C5CF9]">API</h2>
			<div className="relative z-10 mt-1 flex items-center justify-center">
				<span className="bg-linear-to-r from-[#5C5CF9] to-[#8a8aff] bg-clip-text text-center text-2xl font-medium text-transparent">
					300 USD
				</span>
				<span className="ml-1 text-[#8a8c90]">/month</span>
			</div>
			<p className="relative z-10 mt-1 text-center font-medium text-[#8a8c90]">Multiple payment options</p>
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
			<div className="relative z-10 mx-auto flex w-full max-w-[408px] flex-col gap-3">
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
				) : context === 'account' || isLegacyActive ? (
					<div className="mt-2 flex flex-col gap-6">
						<div className="flex flex-col items-center">
							<div className="grid w-full grid-cols-2 gap-3">
								<PaymentButton paymentMethod="llamapay" type="api" />
								<PaymentButton paymentMethod="stripe" type="api" />
							</div>
						</div>
					</div>
				) : (
					<>
						{context === 'page' && (
							<>
								<SignIn text="Already a subscriber? Sign In" />
								<div className="grid grid-cols-2 gap-3 max-sm:w-full max-sm:grid-cols-1">
									<PaymentButton paymentMethod="llamapay" type="api" />
									<PaymentButton paymentMethod="stripe" type="api" />
								</div>
							</>
						)}
					</>
				)}
			</div>
		</>
	)
}
