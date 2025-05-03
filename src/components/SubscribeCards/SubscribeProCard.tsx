import { Icon } from '~/components/Icon'
import { PaymentButton } from '~/containers/Subscribtion/Crypto'
import { SignIn } from '~/containers/Subscribtion/SignIn'
import { useState } from 'react'

export function SubscribeProCard({
	context = 'page',
	active = false,
	onCancelSubscription
}: {
	context?: 'page' | 'account'
	active?: boolean
	onCancelSubscription?: () => void
}) {
	return (
		<div
			className={`price-card py-8 px-5 flex flex-col w-[92vw] snap-center flex-shrink-0 md:w-auto md:flex-1 md:max-w-[400px] md:px-5 md:snap-none md:flex-shrink relative transition-all duration-300 hover:transform md:hover:scale-[1.02] bg-[#22242966] backdrop-blur-xl rounded-xl border-2 ${
				active ? 'border-[#6e6edb]' : 'border-[#4a4a50]'
			} shadow-2xl overflow-hidden`}
			style={{ boxShadow: '0 0 15px rgba(138, 138, 255, 0.12), 0 0 5px rgba(92, 92, 249, 0.08)' }}
		>
			<div className="absolute inset-0 overflow-hidden">
				<div
					className="absolute top-[-15%] left-[-5%] w-[25%] h-[25%] rounded-full bg-[#5c5cf9] opacity-[0.01] blur-3xl animate-pulse"
					style={{ animationDuration: '5s' }}
				></div>
				<div
					className="absolute bottom-[-15%] right-[-5%] w-[20%] h-[20%] rounded-full bg-[#7B7BFF] opacity-[0.012] blur-3xl animate-pulse"
					style={{ animationDelay: '2.5s', animationDuration: '6s' }}
				></div>
				<div
					className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[15%] h-[15%] rounded-full bg-[#462A92] opacity-[0.015] blur-3xl animate-ping"
					style={{ animationDuration: '8s' }}
				></div>
			</div>
			<div
				className="absolute inset-0 rounded-xl border border-[#8a8aff2a] animate-pulse"
				style={{
					animationDuration: '5s',
					boxShadow: '0 0 30px rgba(138, 138, 255, 0.4), inset 0 0 15px rgba(92, 92, 249, 0.2)',
					background:
						'linear-gradient(135deg, rgba(92, 92, 249, 0.05) 0%, rgba(138, 138, 255, 0.02) 50%, rgba(70, 42, 146, 0.03) 100%)'
				}}
			></div>
			<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center text-[#5C5CF9] relative z-10">Pro</h2>
			<div className="flex items-center justify-center mt-1 relative z-10">
				<span className="text-center text-2xl font-medium bg-gradient-to-r from-[#5C5CF9] to-[#8a8aff] bg-clip-text text-transparent">
					300 USD
				</span>
				<span className="text-[#8a8c90] ml-1">/month</span>
			</div>
			<p className="text-center font-medium text-[#8a8c90] mt-1 relative z-10">Multiple payment options</p>
			<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
					<span>All features included in Llama+ tier</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
					<span>Access to TVL, revenue/fees and prices API endpoints</span>
				</li>
				<li className="flex flex-nowrap gap-[10px] items-start">
					<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
					<span>Access to all data (unlocks, active users, token liq...)</span>
				</li>
				<li className="px-[26px] flex flex-col gap-1 mt-1">
					<span className="font-medium">Priority support</span>
				</li>
				<p className="px-[26px] font-medium">
					<a href="https://defillama.com/pro-api/docs" target="_blank" rel="noreferrer noopener" className="underline">
						Pro API
					</a>{' '}
					limits:
				</p>
				<li className="px-[26px] flex flex-col gap-2">
					<span>1000 requests/minute</span>
				</li>
				<li className="px-[26px] flex flex-col gap-2">
					<span>1M calls/month</span>
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
				) : context === 'account' ? (
					<div className="flex flex-col gap-6 mt-2">
						<div className="flex flex-col items-center">
							<div className="grid grid-cols-2 gap-3 w-full">
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
								<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 max-sm:w-full">
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
