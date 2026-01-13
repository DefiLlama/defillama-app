import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { LogosCarousel } from '~/components/LogosCarousel'
import { FreeCard } from '~/components/SubscribeCards/FreeCard'
import { SubscribeAPICard } from '~/components/SubscribeCards/SubscribeAPICard'
import { SubscribeEnterpriseCard } from '~/components/SubscribeCards/SubscribeEnterpriseCard'
import { SubscribeProCard } from '~/components/SubscribeCards/SubscribeProCard'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { AccountStatus } from './components/AccountStatus'
import { EmailVerificationWarning } from './components/EmailVerificationWarning'
import { ReturnModal } from './components/ReturnModal'
import { SignInModal } from './SignIn'

export function SubscribeHome({ returnUrl }: { returnUrl?: string }) {
	const router = useRouter()
	const { isAuthenticated, loaders, user, resendVerification } = useAuthContext()
	const isWalletUser = user?.email?.includes('@defillama.com')

	const { subscription, isSubscriptionLoading, apiSubscription, llamafeedSubscription, getPortalSessionUrl } =
		useSubscribe()
	const [billingInterval, setBillingInterval] = useState<'year' | 'month'>('month')
	const isSubscribed = subscription?.status === 'active'
	const [isClient, setIsClient] = useState(false)
	const [showEmailForm, setShowEmailForm] = useState(false)

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

	const handleResendVerification = async () => {
		if (user?.email) {
			resendVerification(user.email)
		}
	}

	if (loaders && (loaders.userLoading || (isClient && (isSubscriptionLoading || !subscription)))) {
		return (
			<div className="flex h-[60dvh] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<>
			<div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 pb-[64px] xl:max-w-7xl 2xl:max-w-[1440px]">
				{/* Premium Hero Section */}
				<div className="relative flex flex-col items-center gap-8 pt-0 md:pt-0">
					{/* Animated badge */}
					{!isSubscribed && (
						<div className="animate-[fadeInDown_0.8s_ease-out] flex items-center gap-2 rounded-full border border-[#5C5CF9]/30 bg-[#5C5CF9]/5 px-4 py-2 backdrop-blur-sm">
							<div className="h-2 w-2 rounded-full bg-[#5C5CF9] animate-pulse" />
							<span className="text-xs font-medium text-[#5C5CF9]">Unlock unlimited potential</span>
						</div>
					)}

					{/* Logo with improved glow */}
					<div className="relative mx-auto aspect-square h-[120px] w-[120px] animate-[fadeInUp_0.8s_ease-out] rounded-full object-contain">
						<div
							style={{
								filter: 'blur(80px)',
								background: 'linear-gradient(135deg, #5C5EFC 0%, #462A92 100%)',
								animation: 'pulse 3s ease-in-out infinite'
							}}
							className="absolute -inset-4 z-0 rounded-full"
						/>
						<img
							src="/assets/llama.webp"
							height={120}
							width={120}
							className="z-10 mx-auto aspect-square rounded-full object-contain shadow-2xl"
							alt="DefiLlama"
						/>
					</div>

					{/* Premium headline */}
					<div className="relative flex flex-col items-center gap-4">
						<h1 className="animate-[fadeInUp_1s_ease-out] text-center text-4xl md:text-5xl font-extrabold leading-tight text-white">
							DefiLlama <span className="bg-gradient-to-r from-[#5C5CF9] to-[#00D4FF] bg-clip-text text-transparent">Pro</span>
						</h1>
						{!isSubscribed && (
							<p className="animate-[fadeInUp_1.2s_ease-out] text-center max-w-2xl text-lg text-[#A0A3A8] leading-relaxed">
								Experience the most powerful DeFi analytics platform. Unlock <span className="font-semibold text-white">LlamaAI</span>, advanced dashboards, premium API endpoints, and exclusive market insights.
							</p>
						)}
					</div>

					{/* CTA Section */}
					{!isSubscribed && (
						<div className="animate-[fadeInUp_1.4s_ease-out] mx-auto w-full max-w-[440px] space-y-4">
							{isAuthenticated ? (
								<>
									<button
										onClick={() => {
											const proCardElement = document.querySelector('[data-plan="pro"]')
											if (proCardElement) {
												proCardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
											}
										}}
										className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] px-8 py-4 font-semibold text-white shadow-2xl shadow-[#5C5CF9]/40 transition-all duration-300 hover:shadow-[#5C5CF9]/60 hover:from-[#4A4AF0] hover:to-[#6A6AF5]"
									>
										<span className="relative flex items-center justify-center gap-2">
											Explore Plans
											<Icon name="arrow-right" height={18} width={18} className="transition-transform group-hover:translate-x-1" />
										</span>
									</button>
									<button
										onClick={() => router.push('/account')}
										className="w-full rounded-lg border border-[#4a4a50] bg-[#22242930] px-8 py-3 font-medium text-white transition-all duration-200 hover:border-[#5C5CF9]/50 hover:bg-[#5C5CF9]/10 backdrop-blur-sm"
									>
										<Icon name="settings" height={16} width={16} className="mr-2 inline" />
										Manage Account
									</button>
								</>
							) : (
								<>
									<SignInModal
										text="Get Started"
										className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] px-8 py-4 font-semibold text-white shadow-2xl shadow-[#5C5CF9]/40 transition-all duration-300 hover:shadow-[#5C5CF9]/60 hover:from-[#4A4AF0] hover:to-[#6A6AF5]"
										pendingActionMessage="Sign in or create an account to subscribe to the Pro plan."
										defaultFlow="signup"
									/>
									<div className="text-center">
										<p className="text-xs text-[#8a8c90]">
											Crypto & Card payments • Cancel anytime
										</p>
									</div>
								</>
							)}
						</div>
					)}
				</div>

				{isAuthenticated && !user?.verified && !isWalletUser && user?.email && (
					<div className="mx-auto w-full max-w-3xl animate-[fadeInUp_0.8s_ease-out]">
						<EmailVerificationWarning
							email={user.email}
							onResendVerification={handleResendVerification}
							isLoading={loaders.resendVerification}
						/>
					</div>
				)}

				{isAuthenticated && isSubscribed && (
					<div className="animate-[fadeInUp_0.8s_ease-out] mx-auto w-full max-w-[600px]">
						<div className="flex flex-col items-center gap-4 rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center backdrop-blur-sm">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
								<Icon name="check" height={32} width={32} className="text-green-400" />
							</div>
							<div className="flex flex-col gap-2">
								<h2 className="text-2xl font-bold text-white">You're all set!</h2>
								<p className="text-[#8a8c90]">Enjoy your premium DefiLlama experience</p>
							</div>
							<button
								onClick={() => router.push('/account')}
								className="mt-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-medium text-white transition-all duration-300 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/20"
							>
								Manage Subscription
							</button>
						</div>
					</div>
				)}


			{/* Logos Carousel Section */}
			<div className="relative z-10 mb-6">
				<p className="text-center text-sm font-semibold text-[#8a8c90] uppercase tracking-widest mb-0 mt-8 md:-mb-4">Trusted by Institutions Worldwide</p>
				<LogosCarousel
					logos={[
						{ src: '/icons/us-treasury.svg', alt: 'U.S. Treasury' },
						{ src: '/icons/cftc.svg', alt: 'CFTC' },
						{ src: '/icons/ecb-1.svg', alt: 'European Central Bank' },
						{ src: '/icons/mas.svg', alt: 'MAS Singapore' },
						{ src: '/icons/bis.svg', alt: 'Bank for International Settlements' },
						{ src: '/icons/nber.svg', alt: 'NBER' },
						{ src: '/icons/imf.svg', alt: 'International Monetary Fund' },
						{ src: '/icons/boc.svg', alt: 'Bank of Canada' },
						{ src: '/icons/boe.svg', alt: 'Bank of England' },
						{ src: '/icons/binance.svg', alt: 'Binance' },
						{ src: '/icons/okx.svg', alt: 'OKX' },
						{ src: '/icons/coinbase.svg', alt: 'Coinbase' },
					]}
					speed="slow"
					logoWidth="md"
				/>
			</div>

			{/* Pricing Section */}
			<div className="relative">
				{/* Billing Toggle - Enhanced */}
				<div className="relative z-10 mb-20 flex flex-col items-center gap-6">
						<div>
							<h2 className="text-center text-2xl font-bold text-white mb-4">Choose Your Plan</h2>
							<div className="relative inline-flex items-center rounded-full bg-[#22242930] p-1.5 backdrop-blur-md border border-[#4a4a50]/50">
								<button
									onClick={() => setBillingInterval('month')}
									className={`relative z-10 rounded-full px-6 py-2.5 font-semibold text-sm transition-all duration-300 ${
										billingInterval === 'month'
											? 'bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] text-white shadow-lg shadow-[#5C5CF9]/30'
											: 'text-[#A0A3A8] hover:text-white'
									}`}
								>
									Monthly
								</button>
								<button
									onClick={() => setBillingInterval('year')}
									className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold text-sm transition-all duration-300 ${
										billingInterval === 'year'
											? 'bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] text-white shadow-lg shadow-[#5C5CF9]/30'
											: 'text-[#A0A3A8] hover:text-white'
									}`}
								>
									Annually
									<span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1 text-xs font-bold text-white">
										Save 17%
									</span>
								</button>
							</div>
						</div>
				</div>

				{/* Pricing Cards - Redesigned */}
				<div ref={pricingContainer} className="relative z-10 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-10 mb-10 lg:auto-rows-max">
						{/* Free Card - Position based on auth */}
						<div
							className={`group relative overflow-hidden rounded-2xl border border-[#5C5CF9]/30 bg-gradient-to-br from-[#1a1f35]/40 to-[#0f1119]/60 backdrop-blur-sm transition-all duration-300 hover:border-[#5C5CF9]/50 hover:-translate-y-2 ${
								isAuthenticated ? 'lg:order-1' : 'lg:order-1'
							}`}
						>
							<div className="absolute inset-0 bg-gradient-to-br from-[#5C5CF9]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="relative p-8 flex flex-col h-full">
								<FreeCard />
							</div>
						</div>

						{/* Pro Card - Featured */}
						<div
							data-plan="pro"
							className={`group relative overflow-visible rounded-2xl bg-gradient-to-br from-[#5C5CF9]/20 to-[#462A92]/20 backdrop-blur-md transition-all duration-300 lg:order-2 lg:scale-[1.03] lg:-translate-y-3 lg:hover:-translate-y-5 ${
								isAuthenticated ? 'lg:row-span-2' : ''
							}`}
							style={{
								boxShadow: '0 0 0 1.5px #5C5CF9, inset 0 0 20px rgba(92, 92, 249, 0.1)'
							}}
						>
							{/* Pro Badge - Absolutely Positioned */}
							<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-50">
								<div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] px-4 py-2.5 border border-[#5C5CF9]/50 shadow-lg shadow-[#5C5CF9]/30">
									<div className="h-2 w-2 rounded-full bg-white animate-pulse" />
									<span className="text-xs font-bold text-white tracking-wide">MOST POPULAR</span>
								</div>
							</div>

							<div className="relative z-10 flex flex-col h-full p-8 pt-10">

								<SubscribeProCard
									context="page"
									active={subscription?.status === 'active' && subscription?.type === 'llamafeed'}
									billingInterval={billingInterval}
									currentBillingInterval={llamafeedSubscription?.billing_interval}
								/>
							</div>
						</div>

						{/* API Card */}
						<div
							className={`group relative overflow-hidden rounded-2xl border border-[#5C5CF9]/30 bg-gradient-to-br from-[#1a1f35]/40 to-[#0f1119]/60 backdrop-blur-sm transition-all duration-300 hover:border-[#5C5CF9]/50 hover:-translate-y-2 ${
								isAuthenticated ? 'lg:order-3' : 'lg:order-3'
							}`}
						>
							<div className="absolute inset-0 bg-gradient-to-br from-[#5C5CF9]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="relative p-8 flex flex-col h-full">
								<SubscribeAPICard
									context="page"
									isLegacyActive={apiSubscription?.status === 'active' && apiSubscription?.provider === 'legacy'}
									billingInterval={billingInterval}
									currentBillingInterval={apiSubscription?.billing_interval || 'month'}
									active={apiSubscription?.status === 'active' && apiSubscription?.provider !== 'legacy'}
								/>
							</div>
						</div>
				</div>

				{/* Enterprise Card - Refined Compact Design */}
				<div className="relative group">
						<div className="relative overflow-hidden rounded-2xl border border-[#5C5CF9]/30 bg-gradient-to-br from-[#1a1f35]/40 to-[#0f1119]/60 backdrop-blur-sm p-8 md:p-10 transition-all duration-300 hover:border-[#5C5CF9]/50 hover:bg-gradient-to-br hover:from-[#1a1f35]/60 hover:to-[#0f1119]/80 hover:-translate-y-2">
							<SubscribeEnterpriseCard />
						</div>
				</div>

				{isAuthenticated && user && !isSubscribed && (
						<div className="relative z-10 mt-12 w-full">
							<h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
								<Icon name="users" height={20} width={20} className="text-[#5C5CF9]" />
								Account Settings
							</h3>
							<AccountStatus
								isAuthenticated={isAuthenticated}
								user={user}
								isVerified={user?.verified}
								isSubscribed={isSubscribed}
								subscription={subscription}
								onEmailChange={() => setShowEmailForm(true)}
								getPortalSessionUrl={getPortalSessionUrl}
							/>
						</div>
					)}
				</div>
			</div>

			{returnUrl && (
				<ReturnModal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} returnUrl={returnUrl} />
			)}
		</>
	)
}
