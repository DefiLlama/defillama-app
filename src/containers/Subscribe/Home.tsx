import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useGithubAuth, useIsSubscribed } from '~/containers/Subscribe/queries'
import { GithubApiKey } from './Github'
import { ProApiKey, PayWithCrypto } from './Crypto'
import { SignIn } from './SignIn'

export function SubscribeHome() {
	const { data: githubAuthData } = useGithubAuth()
	const { data: isSubscribed } = useIsSubscribed()

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

	return (
		<>
			<div className="flex flex-col gap-3 w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] mx-auto pb-[64px] px-5 relative">
				<div className="relative h-[118px] w-[118px] aspect-square object-contain mx-auto rounded-full">
					<div
						style={{
							filter: 'blur(64px)',
							background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
						}}
						className="h-[132px] w-[132px] aspect-square object-contain mx-auto rounded-full absolute -z-10"
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

				<div
					className="h-[132px] w-[90%] mx-auto rounded-[50%] relative -bottom-[87px] -mb-[45px] -z-10"
					style={{
						filter: 'blur(64px)',
						background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
					}}
				/>

				{githubAuthData?.login ? (
					<div className="bg-[#222429] border border-[#39393E] rounded-2xl relative z-10 py-10 px-5 flex flex-col gap-1">
						<GithubApiKey data={githubAuthData} />
					</div>
				) : isSubscribed ? (
					<div className="bg-[#222429] border border-[#39393E] rounded-2xl relative z-10 py-10 px-5 flex flex-col gap-1">
						<ProApiKey />
					</div>
				) : (
					<div
						className="pricing-container bg-[#222429] border border-[#39393E] rounded-2xl flex flex-row relative z-10 overflow-x-auto max-lg:-mx-5"
						ref={pricingContainer}
					>
						<div className="price-card py-10 px-5 lg:flex-1 flex flex-col max-lg:w-[85vw] flex-shrink-0">
							<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center">Open</h2>
							<p className="text-center text-2xl font-medium mt-3">Free</p>
							<span className="h-5"></span>
							<ul className="flex flex-col mx-auto gap-4 py-11 mb-auto">
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to TVL, revenue/fees and prices</span>
								</li>
								<li className="text-[#8a8c90] flex flex-nowrap gap-[10px]">
									<Icon name="x" height={16} width={16} className="relative top-1" />
									<span>Access to all data (unlocks, active users, token liq...)</span>
								</li>
								<li className="text-[#8a8c90] flex flex-nowrap gap-[10px]">
									<Icon name="x" height={16} width={16} className="relative top-1" />
									<span>Access to LlamaFeed</span>
								</li>
								<li className="text-[#8a8c90] flex flex-nowrap gap-[10px]">
									<Icon name="x" height={16} width={16} className="relative top-1" />
									<span>Download CSV data</span>
								</li>
								<li className="px-[26px] flex flex-col gap-1">Support on public Discord</li>
								<p className="px-[26px]">
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
								<li className="px-[26px] flex flex-col gap-1">
									<span>10-200 requests/minutes</span>
									<ProgressBar pct={12} />
								</li>
							</ul>
						</div>
						<div className="price-card py-10 px-5 lg:flex-1 flex flex-col border-l border-[#39393E] max-lg:w-[85vw] flex-shrink-0">
							<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center text-[#5C5CF9]">Pro</h2>
							<p className="text-center text-2xl font-medium mt-3">
								300 USD <span className="text-[#8a8c90]">/month</span>
							</p>
							<p className="text-center font-medium text-[#8a8c90]">Multiple payment options</p>
							<ul className="flex flex-col mx-auto gap-4 py-11 mb-auto">
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to TVL, revenue/fees and prices</span>
								</li>
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to all data (unlocks, active users, token liq...)</span>
								</li>
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to LlamaFeed</span>
								</li>
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Download CSV data</span>
								</li>
								<li className="px-[26px] flex flex-col gap-1">Priority support</li>
								<p className="px-[26px]">
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
								<li className="px-[26px] flex flex-col gap-1">
									<span>1000 requests/minute</span>
									<ProgressBar pct={100} />
								</li>
								<li className="px-[26px] flex flex-col gap-1">
									<span>1M calls/month</span>
									<ProgressBar pct={100} />
								</li>
							</ul>

							<div className="w-full max-w-[408px] mx-auto flex flex-col gap-2">
								<SignIn text="Already a subscriber? Sign In" />
								<div className="flex flex-nowrap gap-2 relative max-sm:flex-col max-sm:*:w-full">
									<PayWithCrypto pro={true} />
									{/* <a
										href="https://defillama.com/docs/api"
										target="_blank"
										rel="noreferrer noopener"
										className="font-medium rounded-lg border border-[#5C5CF9] py-[14px] flex-1 text-center mx-auto shadow-[0px_0px_32px_0px_#5C5CF980] disabled:cursor-not-allowed flex items-center gap-1 justify-center flex-nowrap"
									>
										<Icon name="card" height={16} width={16} />
										<span>Pay with Stripe</span>
									</a> */}
								</div>
							</div>
						</div>
					</div>
				)}
				<div className="flex items-center justify-center flex-nowrap gap-2 lg:hidden mb-3">
					<button
						className="h-3 w-3 bg-[#39393E] data-[active=true]:bg-[#5c5cf9] rounded-full flex-shrink-0"
						data-active={activePriceCard === 1}
						disabled
					>
						<span className="sr-only">go to pricing type 1</span>
					</button>
					<button
						className="h-3 w-3 bg-[#39393E] data-[active=true]:bg-[#5c5cf9] rounded-full flex-shrink-0"
						data-active={activePriceCard === 2}
						disabled
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
		<div
			className="h-1 rounded-full w-full"
			style={{
				background: `linear-gradient(90deg, #5c5cf9 ${pct}%, #696a6d ${pct}%)`
			}}
		/>
	)
}
