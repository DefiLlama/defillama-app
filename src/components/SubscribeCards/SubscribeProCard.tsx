import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignIn } from '~/containers/Subscribtion/SignIn'
import { useState } from 'react'
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
	return (
		<div
			className={`price-card relative flex w-[92vw] shrink-0 snap-center flex-col overflow-hidden rounded-xl border-2 border-[#4a4a50] bg-[#22242966] px-5 py-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:transform md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 md:hover:scale-[1.02]`}
			style={{ boxShadow: '0 0 15px rgba(138, 138, 255, 0.12), 0 0 5px rgba(92, 92, 249, 0.08)' }}
		>
			<div className="absolute inset-0 overflow-hidden">
				<div
					className="absolute top-[-15%] left-[-5%] h-[25%] w-[25%] animate-pulse rounded-full bg-[#5c5cf9] opacity-[0.01] blur-3xl"
					style={{ animationDuration: '5s' }}
				></div>
				<div
					className="absolute right-[-5%] bottom-[-15%] h-[20%] w-[20%] animate-pulse rounded-full bg-[#7B7BFF] opacity-[0.012] blur-3xl"
					style={{ animationDelay: '2.5s', animationDuration: '6s' }}
				></div>
				<div
					className="absolute top-[50%] left-[50%] h-[15%] w-[15%] translate-x-[-50%] translate-y-[-50%] animate-ping rounded-full bg-[#462A92] opacity-[0.015] blur-3xl"
					style={{ animationDuration: '8s' }}
				></div>
			</div>
			<div
				className="absolute inset-0 animate-pulse rounded-xl border border-[#8a8aff2a]"
				style={{
					animationDuration: '5s',
					boxShadow: '0 0 30px rgba(138, 138, 255, 0.4), inset 0 0 15px rgba(92, 92, 249, 0.2)',
					background:
						'linear-gradient(135deg, rgba(92, 92, 249, 0.05) 0%, rgba(138, 138, 255, 0.02) 50%, rgba(70, 42, 146, 0.03) 100%)'
				}}
			></div>
			<h2 className="relative z-10 text-center text-[2rem] font-extrabold whitespace-nowrap text-[#5C5CF9]">API</h2>
			<div className="relative z-10 mt-1 flex items-center justify-center">
				<span className="bg-linear-to-r from-[#5C5CF9] to-[#8a8aff] bg-clip-text text-center text-2xl font-medium text-transparent">
					300 USD
				</span>
				<span className="ml-1 text-[#8a8c90]">/month</span>
			</div>
			<p className="relative z-10 mt-1 text-center font-medium text-[#8a8c90]">Multiple payment options</p>
			<ul className="mx-auto mb-auto flex w-full flex-col gap-3 py-6 max-sm:text-sm">
				<li className="flex flex-nowrap items-start gap-[10px]">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>All features included in Pro tier</span>
				</li>
				<li className="flex flex-nowrap items-start gap-[10px]">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Access to TVL, revenue/fees and prices API endpoints</span>
				</li>
				<li className="flex flex-nowrap items-start gap-[10px]">
					<Icon name="check" height={16} width={16} className="relative top-1 shrink-0 text-green-400" />
					<span>Access to all data (unlocks, active users, token liq...)</span>
				</li>
				<li className="mt-1 flex flex-col gap-1 px-[26px]">
					<span className="font-medium">Priority support</span>
				</li>
				<p className="px-[26px] font-medium">
					<a href="https://api-docs.defillama.com/" target="_blank" rel="noreferrer noopener" className="underline">
						Pro API
					</a>{' '}
					limits:
				</p>
				<li className="flex flex-col gap-2 px-[26px]">
					<span>1000 requests/minute</span>
				</li>
				<li className="flex flex-col gap-2 px-[26px]">
					<span>1M calls/month</span>
				</li>
				<li className="flex flex-col gap-2 px-[26px]">
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
		</div>
	)
}
