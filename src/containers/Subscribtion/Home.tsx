import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { SignIn } from './SignIn'
import { PaymentButton } from './Crypto'
import { AccountInfo } from './AccountInfo'
import { LocalLoader } from '~/components/LocalLoader'
import { ProgressBar } from '~/components/ProgressBar/ProgressBar'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'

export function SubscribeHome() {
	const { isAuthenticated, user, loaders } = useAuthContext()
	const { subscription, isSubscriptionFetching } = useSubscribe()
	const isSubscribed = subscription?.status === 'active'
	const [isClient, setIsClient] = useState(false)

	const pricingContainer = useRef<HTMLDivElement>(null)
	const [activePriceCard, setActivePriceCard] = useState(0)

	useEffect(() => {
		const ref = pricingContainer.current
		if (!ref) return

		const calculateActiveCard = () => {
			if (ref.children.length === 0) return
			const cardWidth = (ref.children[0] as HTMLElement).offsetWidth
			const gapWidth = 16
			const scrollLeft = ref.scrollLeft
			let closestIndex = 0
			let minDistance = Infinity
			const containerCenter = scrollLeft + ref.offsetWidth / 2

			for (let i = 0; i < ref.children.length; i++) {
				const cardElement = ref.children[i] as HTMLElement
				const cardCenter = cardElement.offsetLeft + cardWidth / 2
				const distance = Math.abs(containerCenter - cardCenter)

				if (distance < minDistance) {
					minDistance = distance
					closestIndex = i
				}
			}
			setActivePriceCard(closestIndex)
		}

		ref.addEventListener('scrollend', calculateActiveCard)
		calculateActiveCard()

		window.addEventListener('resize', calculateActiveCard)

		return () => {
			ref.removeEventListener('scrollend', calculateActiveCard)
			window.removeEventListener('resize', calculateActiveCard)
		}
	}, [isClient])

	useEffect(() => {
		setIsClient(true)
	}, [])

	if (
		loaders &&
		(loaders.userLoading || loaders.userFetching || (isClient && (isSubscriptionFetching || !subscription)))
	) {
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
							ref={pricingContainer}
							className="pricing-container flex flex-row relative z-10 overflow-x-auto sm:overflow-hidden scroll-smooth snap-x snap-mandatory max-md:-mx-2 max-md:pl-2 gap-4 py-4 justify-start"
						>
							<SubscribePlusCard context="page" />
							<div
								className="price-card py-8 px-5 md:w-[400px] flex flex-col max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 relative -top-2 transition-all duration-300 hover:transform hover:scale-[1.02] bg-[#22242966] backdrop-blur-xl rounded-xl border-2 border-[#6e6edb] shadow-2xl overflow-hidden"
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
								<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center text-[#5C5CF9] relative z-10">
									Pro
								</h2>
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
							<div className="price-card py-8 px-5 md:w-[400px] flex flex-col max-lg:w-[92vw] max-lg:px-4 max-lg:snap-center flex-shrink-0 relative transition-all duration-300 hover:transform hover:scale-[1.02] bg-[#22242930] backdrop-blur-md rounded-xl border border-[#4a4a50] shadow-md overflow-hidden">
								<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-20"></div>
								<div className="absolute top-[-30px] right-[-30px] w-[80px] h-[80px] rounded-full bg-gray-600 opacity-5 blur-2xl"></div>
								<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center">Enterprise</h2>
								<span className="h-8"></span>
								<span className="h-7"></span>
								<ul className="flex flex-col mx-auto gap-3 py-6 mb-auto w-full max-sm:text-sm">
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>All features included in Llama+ and Pro tiers</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Direct raw access to our database</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Custom bespoke solutions that fit your needs</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Hourly data</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Access to non-public data, such as TVL breakdowns by token address</span>
									</li>
									<li className="flex flex-nowrap gap-[10px] items-start">
										<Icon name="check" height={16} width={16} className="relative top-1 text-green-400 flex-shrink-0" />
										<span>Custom data licensing agreements</span>
									</li>
								</ul>
								<a
									className="mt-auto font-medium rounded-lg border border-[#5C5CF9] dark:border-[#5C5CF9] bg-[#5C5CF9] dark:bg-[#5C5CF9] hover:bg-[#4A4AF0] dark:hover:bg-[#4A4AF0] text-white transition-all duration-200 py-[14px] shadow-sm hover:shadow-md group flex items-center gap-2 justify-center w-full disabled:cursor-not-allowed disabled:opacity-70 flex-nowrap"
									target="_blank"
									rel="noopener noreferrer"
									href="mailto:sales@defillama.com"
								>
									<Icon name="mail" height={16} width={16} />
									Contact Us
								</a>
							</div>
						</div>
						<div className="flex md:hidden justify-center gap-2 mt-4">
							{[0, 1, 2].map((index) => (
								<button
									key={index}
									className={`w-2 h-2 rounded-full transition-colors duration-300 ${
										activePriceCard === index ? 'bg-white' : 'bg-gray-500'
									}`}
									aria-label={`Go to slide ${index + 1}`}
									onClick={() => {
										const ref = pricingContainer.current
										if (ref && ref.children[index]) {
											const cardElement = ref.children[index] as HTMLElement
											ref.scrollTo({ left: cardElement.offsetLeft, behavior: 'smooth' })
										}
									}}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		</>
	)
}
