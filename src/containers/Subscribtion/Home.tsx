import { Tooltip, TooltipAnchor, useTooltipState } from 'ariakit'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { SignIn } from './SignIn'
import { PaymentButton } from './Crypto'
import { AccountInfo } from './AccountInfo'

export function SubscribeHome() {
	const { isAuthenticated, user } = useAuthContext()
	const { subscription } = useSubscribe()
	const isSubscribed = subscription?.status === 'active'

	const pricingContainer = useRef<HTMLDivElement>(null)
	const [activePriceCard, setActivePriceCard] = useState(1)

	useEffect(() => {
		const ref = pricingContainer.current
		if (!ref) return

		const onScroll = () => {
			setActivePriceCard(Math.round(ref!.scrollLeft / window.innerWidth) + 1)
		}

		ref?.addEventListener('scrollend', onScroll)

		return () => {
			ref?.removeEventListener('scrollend', onScroll)
		}
	}, [])

	const hasGithubUsername = user?.github_username

	const tooltip = useTooltipState({ timeout: 0 })

	return (
		<>
			<div className="flex flex-col gap-3 w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] mx-auto pb-[64px] px-5 relative">
				<div className="relative h-[118px] w-[118px] aspect-square object-contain mx-auto rounded-full">
					<div
						style={{
							filter: 'blur(64px)',
							background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
						}}
						className="h-[132px] w-[132px] aspect-square object-contain mx-auto rounded-full absolute z-0"
					/>
					<img
						src="/llama.png"
						height={118}
						width={118}
						className="aspect-square object-contain mx-auto rounded-full z-10"
						alt=""
					/>
				</div>
				<h1 className="text-[2rem] font-[800] text-center">DefiLlama</h1>
				<h2 className="text-center text-sm text-[#919296]">ONLY FOR TESTING PURPOSES</h2>
				{isSubscribed ? null : (
					<p className="text-[#919296] text-center">
						Upgrade now for access to LlamaFeed, increased api limits and premium api endpoints.
					</p>
				)}

				{isAuthenticated && isSubscribed ? null : (
					<div
						className="h-[64px] w-[90%] mx-auto rounded-[50%] relative -bottom-[60px] -mb-[45px] z-0"
						style={{
							filter: 'blur(64px)',
							background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
						}}
					/>
				)}

				{isAuthenticated && isSubscribed ? (
					<div className="mt-6 w-full max-w-[1000px] mx-auto">
						<AccountInfo />
					</div>
				) : (
					<div className="relative">
						<div
							className="pricing-container bg-[#222429] border border-[#39393E] rounded-2xl flex flex-row relative z-10 overflow-x-auto scroll-smooth snap-x snap-mandatory max-lg:-mx-2 shadow-lg"
							ref={pricingContainer}
						>
							<div className="price-card py-6 px-4 lg:flex-1 flex flex-col max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 transition-all duration-300 hover:bg-[#2a2c32] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
								<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center">Open</h2>
								<div className="flex items-center justify-center mt-1">
									<span className="text-center text-2xl font-medium bg-gradient-to-r from-gray-200 to-gray-100 bg-clip-text text-transparent">
										Free
									</span>
								</div>
								<span className="h-2"></span>
								<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Access to TVL, revenue/fees and prices</span>
									</li>
									<li className="text-[#8a8c90] flex flex-nowrap gap-[10px] items-start">
										<Icon name="x" height={16} width={16} className="relative top-1 text-red-400" />
										<span>Access to all data (unlocks, active users, token liq...)</span>
									</li>
									<li className="text-[#8a8c90] flex flex-nowrap gap-[10px] items-start">
										<Icon name="x" height={16} width={16} className="relative top-1 text-red-400" />
										<span>Access to LlamaFeed</span>
									</li>
									<li className="text-[#8a8c90] flex flex-nowrap gap-[10px] items-start">
										<Icon name="x" height={16} width={16} className="relative top-1 text-red-400" />
										<span>Download CSV data</span>
									</li>
									<li className="px-[26px] flex flex-col gap-1 mt-1">
										<span className="font-medium">Support on public Discord</span>
									</li>
									<p className="px-[26px] font-medium">
										<a
											href="https://defillama.com/docs/api"
											target="_blank"
											rel="noreferrer noopener"
											className="underline"
										>
											Open API
										</a>{' '}
										limits:
									</p>
									<li className="px-[26px] flex flex-col gap-2">
										<span>10-200 requests/minute</span>
										<ProgressBar pct={12} />
									</li>
								</ul>
							</div>
							<div className="price-card py-6 px-4 lg:flex-1 flex flex-col border-l border-[#39393E] max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 relative transition-all duration-300 hover:bg-[#2a2c32] bg-gradient-to-b from-[#222429] to-[#262830] shadow-[0_0_20px_rgba(92,92,249,0.1)] hover:shadow-[0_0_30px_rgba(92,92,249,0.15),inset_0_0_0_1px_rgba(92,92,249,0.2)]">
								<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center text-[#5C5CF9]">Pro</h2>
								<div className="flex items-center justify-center mt-1">
									<span className="text-center text-2xl font-medium bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] bg-clip-text text-transparent">
										300 USD
									</span>
									<span className="text-[#8a8c90] ml-1">/month</span>
								</div>
								<p className="text-center font-medium text-[#8a8c90] mt-1">Multiple payment options</p>
								<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Access to TVL, revenue/fees and prices</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Access to all data (unlocks, active users, token liq...)</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Access to LlamaFeed</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Download CSV data</span>
									</li>
									<li className="px-[26px] flex flex-col gap-1 mt-1">
										<span className="font-medium">Priority support</span>
									</li>
									<p className="px-[26px] font-medium">
										<a
											href="https://defillama.com/pro-api/docs"
											target="_blank"
											rel="noreferrer noopener"
											className="underline"
										>
											Pro API
										</a>{' '}
										limits:
									</p>
									<li className="px-[26px] flex flex-col gap-2">
										<span>1000 requests/minute</span>
										<ProgressBar pct={100} />
									</li>
									<li className="px-[26px] flex flex-col gap-2">
										<span>1M calls/month</span>
										<ProgressBar pct={100} />
									</li>
								</ul>

								<div className="w-full max-w-[408px] mx-auto flex flex-col gap-3">
									<SignIn text="Already a subscriber? Sign In" />
									<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 max-sm:w-full">
										<PaymentButton paymentMethod="llamapay" type="api" />
										<PaymentButton paymentMethod="stripe" type="api" />
									</div>
								</div>
							</div>
							<div className="price-card py-6 px-4 lg:flex-1 flex flex-col border-l border-[#39393E] max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 transition-all duration-300 hover:bg-[#2a2c32]">
								<h2 className="text-[2rem] font-[800] text-center">Supporter</h2>
								<div className="flex items-center justify-center mt-1">
									<span className="text-center text-2xl font-medium bg-gradient-to-r from-amber-200 to-amber-100 bg-clip-text text-transparent">
										15 USD
									</span>
									<span className="text-[#8a8c90] ml-1">/month</span>
								</div>
								<p className="text-center font-medium text-[#8a8c90] flex flex-nowrap items-center justify-center gap-1">
									<span>Free for all Github contributors</span>
									<TooltipAnchor
										state={tooltip}
										className="flex flex-nowrap items-center justify-center gap-1"
										as="button"
									>
										<span className="sr-only">Availability</span>
										<Icon name="circle-help" height={16} width={16} />
									</TooltipAnchor>
									<Tooltip
										state={tooltip}
										className="bg-black border border-[#39393E] rounded-2xl relative z-10 p-4 max-w-sm text-sm"
									>
										Only available for 3 months to users who have contributed 5 commits or more over at least 2 months
										on the following repos:{' '}
										{eligibleRepos.map((repo, index) => (
											<Fragment key={repo}>
												<a
													href={`https://github.com/DefiLlama/${repo}`}
													target="_blank"
													rel="noreferrer noopener"
													className="p-1 bg-[#222429] rounded"
												>
													{repo}
												</a>
												{index + 1 !== eligibleRepos.length ? `, ` : ''}
											</Fragment>
										))}
									</Tooltip>
								</p>
								<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Access to TVL, revenue/fees and prices</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Access to all data (unlocks, active users, token liq...)</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Access to LlamaFeed</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400" />
										<span>Download CSV data</span>
									</li>
									<li className="px-[26px] flex flex-col gap-1 mt-1">
										<span className="font-medium">Priority support</span>
									</li>
									<p className="px-[26px] font-medium">
										<a
											href="https://defillama.com/pro-api/docs"
											target="_blank"
											rel="noreferrer noopener"
											className="underline"
										>
											Pro API
										</a>{' '}
										limits:
									</p>
									<li className="px-[26px] flex flex-col gap-2">
										<span>1000 requests/minute</span>
										<ProgressBar pct={100} />
									</li>
									<li className="px-[26px] flex flex-col gap-2">
										<span>200k calls/month</span>
										<ProgressBar pct={20} />
									</li>
								</ul>

								<div className="w-full max-w-[408px] mx-auto flex flex-col gap-2">
									<SignIn
										text="Connect GitHub"
										className="font-medium rounded-lg border border-[#39393E] py-[14px] flex-1 text-center mx-auto w-full transition-all duration-300 flex items-center justify-center gap-2 bg-[#24292e] hover:bg-[#2c3136] text-white shadow-md hover:shadow-xl hover:border-gray-500 hover:scale-[1.02]"
									/>
								</div>
								{hasGithubUsername && (
									<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 max-sm:w-full">
										<PaymentButton paymentMethod="llamapay" type="contributor" />
										<PaymentButton paymentMethod="stripe" type="contributor" />
									</div>
								)}
							</div>
						</div>
					</div>
				)}
				<div className="flex items-center justify-center flex-nowrap gap-2 lg:hidden mb-3">
					<button
						className="h-3 w-3 bg-[#39393E] data-[active=true]:bg-[#5c5cf9] rounded-full flex-shrink-0"
						data-active={activePriceCard === 1}
						onClick={() => {
							const container = pricingContainer.current
							if (container) {
								container.scrollTo({ left: 0, behavior: 'smooth' })
								setActivePriceCard(1)
							}
						}}
					>
						<span className="sr-only">go to pricing type 1</span>
					</button>
					<button
						className="h-3 w-3 bg-[#39393E] data-[active=true]:bg-[#5c5cf9] rounded-full flex-shrink-0"
						data-active={activePriceCard === 2}
						onClick={() => {
							const container = pricingContainer.current
							if (container) {
								container.scrollTo({ left: container.clientWidth, behavior: 'smooth' })
								setActivePriceCard(2)
							}
						}}
					>
						<span className="sr-only">go to pricing type 2</span>
					</button>
					<button
						className="h-3 w-3 bg-[#39393E] data-[active=true]:bg-[#5c5cf9] rounded-full flex-shrink-0"
						data-active={activePriceCard === 3}
						onClick={() => {
							const container = pricingContainer.current
							if (container) {
								container.scrollTo({ left: container.clientWidth * 2, behavior: 'smooth' })
								setActivePriceCard(3)
							}
						}}
					>
						<span className="sr-only">go to pricing type 3</span>
					</button>
				</div>
			</div>
		</>
	)
}

const ProgressBar = ({ pct }: { pct: number }) => {
	return (
		<div className="h-2 rounded-full w-full bg-[#2a2c32] overflow-hidden shadow-inner">
			<div
				className="h-full rounded-full transition-all duration-1000 ease-out"
				style={{
					width: `${pct}%`,
					background: `linear-gradient(90deg, #5c5cf9, #7b7bff)`,
					boxShadow: '0 0 8px rgba(92, 92, 249, 0.5)'
				}}
			/>
		</div>
	)
}

const eligibleRepos = [
	'defillama-app',
	'defillama-server',
	'dimension-adapters',
	'yield-server',
	'bridges-server',
	'peggedassets-server',
	'emissions-adapters',
	'DefiLlama-Adapters'
]
