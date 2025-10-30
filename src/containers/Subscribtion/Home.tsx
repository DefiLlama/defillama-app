import { FormEvent, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { FreeCard } from '~/components/SubscribeCards/FreeCard'
import { SubscribeAPICard } from '~/components/SubscribeCards/SubscribeAPICard'
import { SubscribeEnterpriseCard } from '~/components/SubscribeCards/SubscribeEnterpriseCard'
import { SubscribeProCard } from '~/components/SubscribeCards/SubscribeProCard'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { ReturnModal } from './components/ReturnModal'
import { TrialActivation } from './components/TrialActivation'
import { SignIn } from './SignIn'

export function SubscribeHome({ returnUrl, isTrial }: { returnUrl?: string; isTrial?: boolean }) {
	const router = useRouter()
	const { isAuthenticated, loaders, user } = useAuthContext()
	const { subscription, isSubscriptionFetching, apiSubscription } = useSubscribe()
	const [billingInterval, setBillingInterval] = useState<'year' | 'month'>('month')
	const isSubscribed = subscription?.status === 'active'
	const [isClient, setIsClient] = useState(false)

	const queryClient = useQueryClient()
	const [showReturnModal, setShowReturnModal] = useState(false)
	const [hasShownModal, setHasShownModal] = useState(false)

	const pricingContainer = useRef<HTMLDivElement>(null)

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (isAuthenticated && returnUrl && !hasShownModal && !loaders.userLoading) {
			const justSignedUp = sessionStorage.getItem('just_signed_up') === 'true'
			const accountAge = user?.created ? Date.now() - new Date(user.created).getTime() : Infinity
			const isRecentAccount = accountAge < 10000

			if (justSignedUp) {
				sessionStorage.removeItem('just_signed_up')
			}

			if (!justSignedUp && !isRecentAccount) {
				setShowReturnModal(true)
				setHasShownModal(true)
			}
		}
	}, [isAuthenticated, returnUrl, hasShownModal, loaders.userLoading, user?.created])

	useEffect(() => {
		setHasShownModal(false)
	}, [returnUrl])

	if (
		loaders &&
		(loaders.userLoading || loaders.userFetching || (isClient && (isSubscriptionFetching || !subscription)))
	) {
		return (
			<div className="flex h-[60dvh] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<>
			<div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 pb-[64px] xl:max-w-7xl 2xl:max-w-[1440px]">
				<div className="relative mx-auto aspect-square h-[118px] w-[118px] rounded-full object-contain">
					<div
						style={{
							filter: 'blur(64px)',
							background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
						}}
						className="absolute z-0 mx-auto aspect-square h-[132px] w-[132px] rounded-full object-contain"
					/>
					<img
						src="/icons/llama.webp"
						height={118}
						width={118}
						className="z-10 mx-auto aspect-square rounded-full object-contain"
						alt=""
					/>
				</div>
				<h1 className="text-center text-[2rem] font-extrabold">DefiLlama</h1>
				{!isSubscribed && (
					<div className="mx-auto flex max-w-[600px] flex-col gap-4">
						<p className="text-center text-[#919296]">
							Upgrade now for access to LlamaFeed, Custom Dashboards, CSV data downloads and more.
						</p>
						{isAuthenticated ? (
							<div className="mx-auto w-full max-w-[400px]">
								<button
									onClick={() => {
										const proCardElement = document.querySelector('[data-plan="pro"]')
										if (proCardElement) {
											proCardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
										}
									}}
									className="w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] px-6 py-3.5 font-semibold text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/30"
								>
									Get Pro for ${billingInterval === 'year' ? '490' : '49'}
									{billingInterval === 'year' ? '/year' : '/month'}
								</button>
								<p className="mt-2 text-center text-xs text-[#8a8c90]">Cancel anytime • Crypto and Card payments</p>
								<button
									onClick={() => router.push('/account')}
									className="mt-3 flex w-full items-center justify-center gap-2 text-sm text-[#8a8c90] transition-colors hover:text-white"
								>
									<Icon name="settings" height={14} width={14} />
									Manage Account
								</button>
							</div>
						) : (
							<div className="mx-auto w-full max-w-[400px] lg:hidden">
								<SignIn
									text={`Get Pro for $${billingInterval === 'year' ? '490' : '49'}${billingInterval === 'year' ? '/year' : '/month'}`}
									className="w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] px-6 py-3.5 font-semibold text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/30"
									pendingActionMessage="Sign in or create an account to subscribe to the Pro plan."
									defaultFlow="signup"
								/>
								<p className="mt-2 text-center text-xs text-[#8a8c90]">Cancel anytime • Crypto and Card payments</p>
							</div>
						)}
					</div>
				)}

				{!isAuthenticated && isTrial && (
					<div className="relative mt-4 overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md transition-all duration-300">
						<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-[#5c5cf9] to-transparent opacity-40"></div>
						<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-[#5c5cf9] opacity-10 blur-2xl"></div>

						<div className="mb-4 flex items-center gap-3">
							<div className="rounded-lg bg-[#5c5cf9]/10 p-2">
								<svg className="h-6 w-6 text-[#5c5cf9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h2 className="bg-linear-to-r from-[#5C5CF9] to-[#8A8AFF] bg-clip-text text-2xl font-bold text-transparent">
								Welcome to Your Free Trial!
							</h2>
						</div>

						<p className="mb-6 leading-relaxed text-[#b4b7bc]">
							You've been invited to experience Pro for free! Sign in or create an account to activate your exclusive
							24-hour trial access.
						</p>

						<SignIn
							text="Sign In to Activate Trial"
							className="w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20"
						/>
					</div>
				)}

				{isAuthenticated && isTrial && !isSubscribed && (
					<TrialActivation
						onSuccess={() => {
							queryClient.invalidateQueries({ queryKey: ['subscription'] })
							window.location.reload()
						}}
					/>
				)}

				{isAuthenticated && isTrial && isSubscribed && subscription?.provider === 'trial' && (
					<div className="relative mt-4 overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md transition-all duration-300">
						<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-green-500 to-transparent opacity-40"></div>
						<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-green-500 opacity-10 blur-2xl"></div>

						<div className="mb-4 flex items-center gap-3">
							<div className="rounded-lg bg-green-500/10 p-2">
								<svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h2 className="bg-linear-to-r from-green-400 to-green-600 bg-clip-text text-2xl font-bold text-transparent">
								Trial Active
							</h2>
						</div>

						<p className="mb-4 text-[#b4b7bc]">
							Your 24-hour trial is currently active. Enjoy full access to all premium features!
						</p>

						{subscription?.expires_at && (
							<div className="rounded-lg border border-[#39393E] bg-[#1a1b1f]/50 p-3">
								<div className="flex items-center gap-2 text-sm">
									<svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span className="text-[#919296]">
										Expires: {new Date(parseFloat(subscription.expires_at) * 1000).toLocaleString()}
									</span>
								</div>
							</div>
						)}
					</div>
				)}

				{isAuthenticated && isSubscribed ? null : (
					<div
						className="relative -bottom-15 z-0 mx-auto -mb-[45px] h-[64px] w-[90%] rounded-[50%]"
						style={{
							filter: 'blur(64px)',
							background: 'linear-gradient(90deg, #5C5EFC 0%, #462A92 100%)'
						}}
					/>
				)}

				{isAuthenticated && isSubscribed ? (
					<div className="mx-auto mt-6 flex w-full max-w-[600px] flex-col items-center gap-4">
						<div className="flex flex-col items-center gap-4 rounded-xl border border-[#39393E] bg-[#1a1b1f] p-8 text-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
								<Icon name="check" height={32} width={32} className="text-green-400" />
							</div>
							<h2 className="text-2xl font-bold text-white">You're subscribed!</h2>
							<p className="text-[#8a8c90]">Manage your subscription and view your account details.</p>
							<button
								onClick={() => router.push('/account')}
								className="rounded-lg bg-[#5C5CF9] px-8 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
							>
								Go to Account
							</button>
						</div>
					</div>
				) : (
					<div className="relative">
						<div className="relative z-10 mb-6 flex items-center justify-center">
							<div className="relative inline-flex items-center rounded-xl bg-[#22242930] p-1 backdrop-blur-sm">
								<button
									onClick={() => setBillingInterval('month')}
									className={`relative z-10 rounded-lg px-6 py-2 font-medium transition-all duration-200 ${
										billingInterval === 'month'
											? 'bg-[#5C5CF9] text-white shadow-lg shadow-[#5C5CF9]/20'
											: 'text-[#8a8c90] hover:text-white'
									}`}
								>
									Monthly
								</button>
								<button
									onClick={() => setBillingInterval('year')}
									className={`relative z-10 flex items-center gap-2 rounded-lg px-6 py-2 font-medium transition-all duration-200 ${
										billingInterval === 'year'
											? 'bg-[#5C5CF9] text-white shadow-lg shadow-[#5C5CF9]/20'
											: 'text-[#8a8c90] hover:text-white'
									}`}
								>
									Yearly
									<span className="rounded-md bg-[#7B7BFF] px-2 py-0.5 text-xs font-semibold text-white">
										2 months free
									</span>
								</button>
							</div>
						</div>
						<div ref={pricingContainer} className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
							<div
								data-plan="pro"
								className={`relative flex flex-col overflow-hidden rounded-xl border-2 border-[#5C5CF9]/50 bg-[#22242930] px-4 py-6 shadow-lg shadow-[#5C5CF9]/20 backdrop-blur-md transition-all duration-300 lg:order-2 lg:py-8 lg:hover:scale-[1.02] ${isAuthenticated ? 'order-1' : 'order-2'}`}
							>
								<SubscribeProCard
									context="page"
									active={
										subscription?.status === 'active' &&
										subscription?.type === 'llamafeed' &&
										subscription?.provider !== 'trial'
									}
									billingInterval={billingInterval}
								/>
							</div>
							<div
								className={`relative flex flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-6 shadow-md backdrop-blur-md transition-all duration-300 lg:order-1 lg:py-8 lg:hover:scale-[1.02] ${isAuthenticated ? 'order-2' : 'order-1'}`}
							>
								<FreeCard />
							</div>
							<div className="relative order-3 flex flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-6 shadow-md backdrop-blur-md transition-all duration-300 lg:py-8 lg:hover:scale-[1.02]">
								<SubscribeAPICard
									context="page"
									isLegacyActive={apiSubscription?.status === 'active' && apiSubscription?.provider === 'legacy'}
									billingInterval={billingInterval}
								/>
							</div>
						</div>
						<div className="relative z-10 mt-4 rounded-xl border border-[#4a4a50] bg-[#22242930] px-5 py-8 shadow-md backdrop-blur-md transition-all duration-300 hover:scale-[1.02]">
							<span className="mx-auto flex w-full flex-col md:w-auto md:max-w-[400px]">
								<h2 className="text-center text-[2rem] font-extrabold whitespace-nowrap">Enterprise</h2>
								<SubscribeEnterpriseCard />
							</span>
						</div>

						{isAuthenticated && (
							<div className="relative z-10 mt-6 flex flex-col items-center gap-3 rounded-xl border border-[#39393E] bg-[#1a1b1f]/50 p-6 backdrop-blur-sm">
								<Icon name="user" height={24} width={24} className="text-[#5C5CF9]" />
								<p className="text-center text-[#b4b7bc]">
									Already a subscriber or need to manage your account?
								</p>
								<button
									onClick={() => router.push('/account')}
									className="rounded-lg border border-[#5C5CF9]/30 bg-[#5C5CF9]/10 px-6 py-2.5 font-medium text-[#5C5CF9] transition-all hover:border-[#5C5CF9]/50 hover:bg-[#5C5CF9]/20"
								>
									Go to Account
								</button>
							</div>
						)}
					</div>
				)}
			</div>
			<div className="mx-auto mb-[64px] flex w-full max-w-6xl flex-col items-center justify-center gap-[64px] px-5 xl:max-w-7xl 2xl:max-w-[1440px]">
				<h2 className="text-[32px] font-extrabold">They trust us</h2>

				<div className="grid grid-cols-2 place-items-center gap-20 md:grid-cols-4 lg:grid-cols-5">
					<img src="/icons/us-treasury.svg" alt="U.S. Department of the Treasury" className="h-15 object-contain" />
					<img src="/icons/cftc.svg" alt="CFTC" className="h-[48px] object-contain" />
					<span className="flex flex-col gap-2">
						<img src="/icons/ecb-1.svg" alt="" className="h-7 object-contain" />
						<img src="/icons/ecb-2.svg" alt="European Central Bank" className="h-2.5 object-contain" />
					</span>
					<img src="/icons/mas.svg" alt="Monetary Authority of Singapore" className="h-15 object-contain" />
					<img src="/icons/bis.svg" alt="Bank of International Settlements" className="h-[48px] object-contain" />
					<img src="/icons/nber.svg" alt="National Bureau of Economic Research" className="h-15 object-contain" />
					<img src="/icons/imf.svg" alt="International Monetary Fund" className="h-7 object-contain" />
					<img src="/icons/boc.svg" alt="Bank of Canada" className="h-15 object-contain" />
					<img src="/icons/boe.svg" alt="Bank of England" className="h-7 object-contain" />
					<img src="/icons/binance.svg" alt="Binance" className="h-7 object-contain" />
					<img src="/icons/okx.svg" alt="OKX" className="h-7 object-contain" />
					<img src="/icons/chainlink.svg" alt="Chainlink" className="h-7 object-contain" />
					<img src="/icons/coinbase.svg" alt="Coinbase" className="h-7 object-contain" />
				</div>
			</div>
			{returnUrl && (
				<ReturnModal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} returnUrl={returnUrl} />
			)}
		</>
	)
}
