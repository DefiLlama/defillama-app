import { Tooltip, TooltipAnchor, useTooltipState } from 'ariakit'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useGithubAuth, useIsSubscribed } from '~/containers/Subscribe/queries'
import { GithubApiKey, SignInWithGithub } from './Github'
import { ProApiKey, SubscribeOnChain } from './Pro'

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
						Upgrade now for increased api limits and premium api endpoints. DefiLlama contributors will have free 3
						month access to premium API.
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
							<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center">Open API</h2>
							<p className="text-center text-2xl font-medium mt-3">Free</p>
							<p className="text-center font-medium text-[#8a8c90]">
								Check the{' '}
								<a
									href="https://defillama.com/docs/api"
									target="_blank"
									rel="noreferrer noopener"
									className="underline"
								>
									open API doc
								</a>
							</p>
							<ul className="flex flex-col mx-auto gap-4 mt-11 mb-auto">
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to TVL, revenue/fees and prices</span>
								</li>
								<li className="text-[#8a8c90] flex flex-nowrap gap-[10px]">
									<Icon name="x" height={16} width={16} className="relative top-1" />
									<span>Access to all data (unlocks, active users, token liq...)</span>
								</li>
								<li className="px-[26px] flex flex-col gap-1">
									<span>10-200 requests/minutes</span>
									<ProgressBar pct={12} />
								</li>
								<li className="px-[26px] flex flex-col gap-1">
									<span>0 calls/month</span>
									<ProgressBar pct={0} />
								</li>
								<li className="px-[26px] flex flex-col gap-1">Support on public Discord</li>
							</ul>
							<a
								href="https://defillama.com/docs/api"
								target="_blank"
								rel="noreferrer noopener"
								className="flex-shrink-0 relative -top-2 font-medium rounded-lg border border-[#39393E] py-[14px] w-full max-w-[200px] text-center mx-auto mt-16"
							>
								Open API doc
							</a>
						</div>
						<div className="price-card py-10 px-5 lg:flex-1 flex flex-col border-l border-[#39393E] max-lg:w-[85vw] flex-shrink-0">
							<h2 className="whitespace-nowrap text-[2rem] font-[800] text-center text-[#5C5CF9]">Pro API</h2>
							<p className="text-center text-2xl font-medium mt-3">
								300 USD <span className="text-[#8a8c90]">/month</span>
							</p>
							<p className="text-center font-medium text-[#8a8c90]">Multiple payment options</p>
							<ul className="flex flex-col mx-auto gap-4 mt-11 mb-auto">
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to TVL, revenue/fees and prices</span>
								</li>
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to all data (unlocks, active users, token liq...)</span>
								</li>
								<li className="px-[26px] flex flex-col gap-1">
									<span>1000 requests/minute</span>
									<ProgressBar pct={100} />
								</li>
								<li className="px-[26px] flex flex-col gap-1">
									<span>1M calls/month</span>
									<ProgressBar pct={100} />
								</li>
								<li className="px-[26px] flex flex-col gap-1">Priority support</li>
							</ul>

							<div className="flex flex-col gap-2 mt-16 relative -bottom-6">
								<SubscribeOnChain />
								<a
									href="https://defillama.com/docs/api"
									target="_blank"
									rel="noreferrer noopener"
									className="text-[#8a8c90] text-center mx-auto flex flex-nowrap items-center gap-2"
								>
									<span className="underline">Or pay with Stripe</span>
									<Icon name="card" height={16} width={16} />
								</a>
							</div>
						</div>
						<div className="price-card py-10 px-5 lg:flex-1 flex flex-col border-l border-[#39393E] max-lg:w-[85vw] flex-shrink-0">
							<h2 className="text-[2rem] font-[800] text-center flex flex-nowrap items-center justify-center gap-1">
								<span>Contributor</span>

								<TooltipAnchor
									state={tooltip}
									className="flex flex-nowrap items-center justify-center gap-1 relative top-1"
								>
									<span className="sr-only">Availability</span>
									<Icon name="circle-help" height={16} width={16} />
								</TooltipAnchor>
								<Tooltip
									state={tooltip}
									className="bg-black border border-[#39393E] rounded-2xl relative z-10 p-4 max-w-sm text-sm"
								>
									Only available to users who have contributed 5 commits or more over at least 2 months on the following
									repos:{' '}
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
							</h2>
							<p className="text-center text-2xl font-medium mt-3">Free</p>
							<p className="text-center font-medium text-[#8a8c90]">For all Github contributors</p>
							<ul className="flex flex-col mx-auto gap-4 mt-11 mb-auto">
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to TVL, revenue/fees and prices</span>
								</li>
								<li className="flex flex-nowrap gap-[10px]">
									<Icon name="check" height={16} width={16} className="relative top-1" />
									<span>Access to all data (unlocks, active users, token liq...)</span>
								</li>
								<li className="px-[26px] flex flex-col gap-1">
									<span>1000 requests/minute</span>
									<ProgressBar pct={100} />
								</li>
								<li className="px-[26px] flex flex-col gap-1">
									<span>200k calls/month</span>
									<ProgressBar pct={20} />
								</li>
								<li className="px-[26px] flex flex-col gap-1">Priority support</li>
							</ul>
							<SignInWithGithub />
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
					<button
						className="h-3 w-3 bg-[#39393E] data-[active=true]:bg-[#5c5cf9] rounded-full flex-shrink-0"
						data-active={activePriceCard === 3}
						disabled
					>
						<span className="sr-only">go to pricing type 3</span>
					</button>
				</div>
				<a
					href="https://defillama.com/pro-api/docs"
					target="_blank"
					rel="noreferrer noopener"
					className="text-center underline text-[#8a8c90]"
				>
					Click here a full lists of all endpoints available in Pro
				</a>
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
