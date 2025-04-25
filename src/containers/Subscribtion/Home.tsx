import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { SignIn } from './SignIn'
import { PaymentButton } from './Crypto'
import { AccountInfo } from './AccountInfo'
import { LocalLoader } from '~/components/LocalLoader'

export function SubscribeHome() {
	const { isAuthenticated, user, loaders } = useAuthContext()
	const { subscription, isSubscriptionFetching } = useSubscribe()
	const isSubscribed = subscription?.status === 'active'
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	const pricingContainer = useRef<HTMLDivElement>(null)
	const [activePriceCard, setActivePriceCard] = useState(2)

	useEffect(() => {
		const ref = pricingContainer.current
		if (!ref) return

		const onScroll = () => {
			setActivePriceCard(Math.round(ref!.scrollLeft / window.innerWidth) + 1)
		}

		ref?.addEventListener('scrollend', onScroll)

		if (ref && window.innerWidth < 768) {
			ref.scrollTo({ left: ref.clientWidth, behavior: 'smooth' })
		}

		return () => {
			ref?.removeEventListener('scrollend', onScroll)
		}
	}, [])

	if (loaders.userLoading || loaders.userFetching || (isClient && (isSubscriptionFetching || !subscription))) {
		return (
			<div className="flex justify-center items-center h-[60vh]">
				<LocalLoader />
			</div>
		)
	}

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
							className="pricing-container flex flex-row relative z-10 overflow-x-auto sm:overflow-hidden scroll-smooth snap-x snap-mandatory max-md:-mx-2 gap-4 py-4 justify-center"
							ref={pricingContainer}
						>
							<div className="price-card py-8 px-5 md:w-[400px] flex flex-col max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 transition-all duration-300 hover:transform hover:scale-[1.02] bg-gradient-to-br from-[#222429] to-[#222429] rounded-xl border border-[#39393E] shadow-md relative overflow-hidden">
								<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
								<div className="absolute top-[-50px] right-[-50px] w-[100px] h-[100px] rounded-full bg-gray-500 opacity-5 blur-3xl"></div>
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
							<div className="price-card py-8 px-5 md:w-[400px] flex flex-col max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 relative transition-all duration-300 hover:transform hover:scale-[1.02] bg-[#22242930] backdrop-blur-md rounded-xl border border-[#5c5cf950] shadow-md overflow-hidden">
								<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#5c5cf9] to-transparent opacity-30"></div>
								<div className="absolute top-[-50px] right-[-50px] w-[100px] h-[100px] rounded-full bg-[#5c5cf9] opacity-10 blur-3xl"></div>

								<div className="absolute inset-0 overflow-hidden">
									<div
										className="absolute top-[-15%] left-[-5%] w-[25%] h-[25%] rounded-full bg-[#5c5cf9] opacity-[0.003] blur-3xl animate-pulse"
										style={{ animationDuration: '6s' }}
									></div>
									<div
										className="absolute bottom-[-15%] right-[-5%] w-[20%] h-[20%] rounded-full bg-[#7B7BFF] opacity-[0.002] blur-3xl animate-pulse"
										style={{ animationDelay: '3s', animationDuration: '7s' }}
									></div>
									<div
										className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[15%] h-[15%] rounded-full bg-[#462A92] opacity-[0.0025] blur-3xl animate-ping"
										style={{ animationDuration: '10s' }}
									></div>
								</div>

								<div
									className="absolute inset-0 rounded-xl border border-[#5c5cf908] animate-pulse"
									style={{ animationDuration: '6s' }}
								></div>

								<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center text-[#5C5CF9] relative z-10">
									Pro
								</h2>
								<div className="flex items-center justify-center mt-1 relative z-10">
									<span className="text-center text-2xl font-medium bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] bg-clip-text text-transparent">
										300 USD
									</span>
									<span className="text-[#8a8c90] ml-1">/month</span>
								</div>
								<p className="text-center font-medium text-[#8a8c90] mt-1 relative z-10">Multiple payment options</p>
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

								<div className="w-full max-w-[408px] mx-auto flex flex-col gap-3 relative z-10">
									<SignIn text="Already a subscriber? Sign In" />
									<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 max-sm:w-full">
										<PaymentButton paymentMethod="llamapay" type="api" />
										<PaymentButton paymentMethod="stripe" type="api" />
									</div>
								</div>
							</div>
							<div className="price-card py-8 px-5 md:w-[400px] flex flex-col max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 transition-all duration-300 hover:transform hover:scale-[1.02] bg-gradient-to-br from-[#222429] to-[#222429] rounded-xl border border-[#39393E] shadow-md relative overflow-hidden">
								<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
								<div className="absolute top-[-50px] right-[-50px] w-[100px] h-[100px] rounded-full bg-gray-500 opacity-5 blur-3xl"></div>
								<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center">Enterprise</h2>
								<span className="h-8"></span>
								<span className="h-7"></span>
								<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Direct raw access to our database</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Hourly data</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Access to non-public data, such as TVL breakdowns by token address</span>
									</li>
								</ul>
								<a
									className="mt-auto font-medium rounded-lg border border-[#5C5CF9] dark:border-[#5C5CF9] bg-[#5C5CF9] dark:bg-[#5C5CF9] hover:bg-[#4A4AF0] dark:hover:bg-[#4A4AF0] text-white transition-all duration-200 py-[14px] shadow-sm hover:shadow-md group flex items-center gap-2 justify-center w-full ${shadowClass} disabled:cursor-not-allowed disabled:opacity-70 flex-nowrap"
									target="_blank"
									rel="noopener noreferrer"
									href="mailto:sales@defillama.com"
								>
									Contact Us
								</a>
							</div>
							{/* <div className="price-card py-8 px-5 lg:flex-1 flex flex-col max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 transition-all duration-300 hover:transform hover:scale-[1.02] bg-gradient-to-br from-[#222429] to-[#222429] rounded-xl border border-[#39393E] shadow-md relative overflow-hidden">
								<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-30"></div>
								<div className="absolute top-[-50px] right-[-50px] w-[100px] h-[100px] rounded-full bg-amber-200 opacity-5 blur-3xl"></div>
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
										render={<button />}
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
							</div> */}
						</div>
					</div>
				)}
				<div className="flex items-center justify-center flex-nowrap gap-2 md:hidden mb-3">
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
				</div>
			</div>
		</>
	)
}

const ProgressBar = ({ pct }: { pct: number }) => {
	return (
		<div className="h-2 rounded-full w-full bg-[#2a2c32] overflow-hidden shadow-inner backdrop-blur-sm relative">
			<div
				className="h-full rounded-full transition-all duration-1000 ease-out"
				style={{
					width: `${pct}%`,
					background: `linear-gradient(90deg, #5c5cf9, #7b7bff)`,
					boxShadow: '0 0 12px rgba(92, 92, 249, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
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
