import { FormEvent, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LocalLoader } from '~/components/Loaders'
import { FreeCard } from '~/components/SubscribeCards/FreeCard'
import { SubscribeAPICard } from '~/components/SubscribeCards/SubscribeAPICard'
import { SubscribeEnterpriseCard } from '~/components/SubscribeCards/SubscribeEnterpriseCard'
import { SubscribeProCard } from '~/components/SubscribeCards/SubscribeProCard'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { AccountInfo } from './AccountInfo'
import { AccountStatus } from './components/AccountStatus'
import { EmailChangeModal } from './components/EmailChangeModal'
import { EmailVerificationWarning } from './components/EmailVerificationWarning'
import { ReturnModal } from './components/ReturnModal'
import { TrialActivation } from './components/TrialActivation'
import { SignIn } from './SignIn'

export function SubscribeHome({ returnUrl, isTrial }: { returnUrl?: string; isTrial?: boolean }) {
	const { isAuthenticated, loaders, user, changeEmail, addEmail, resendVerification } = useAuthContext()
	const { subscription, isSubscriptionFetching, apiSubscription } = useSubscribe()
	const [showEmailForm, setShowEmailForm] = useState(false)
	const [newEmail, setNewEmail] = useState('')
	const [billingInterval, setBillingInterval] = useState<'year' | 'month'>('month')
	const isWalletUser = user?.email?.includes('@defillama.com')
	const handleEmailChange = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (isWalletUser) {
			await addEmail(newEmail)
		} else {
			changeEmail(newEmail)
		}
		setNewEmail('')
		setShowEmailForm(false)
	}

	const handleResendVerification = () => {
		if (user?.email) {
			resendVerification(user.email)
		}
	}

	const isSubscribed = subscription?.status === 'active'
	const [isClient, setIsClient] = useState(false)

	const queryClient = useQueryClient()
	const [showReturnModal, setShowReturnModal] = useState(false)
	const [hasShownModal, setHasShownModal] = useState(false)

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
			const containerVisibleWidth = ref.offsetWidth
			const containerCenter = scrollLeft + containerVisibleWidth / 2

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

		ref.addEventListener('scroll', calculateActiveCard, { passive: true })
		calculateActiveCard()
		window.addEventListener('resize', calculateActiveCard)

		return () => {
			ref.removeEventListener('scroll', calculateActiveCard)
			window.removeEventListener('resize', calculateActiveCard)
		}
	}, [isClient])

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (isAuthenticated && returnUrl && !hasShownModal && !loaders.userLoading) {
			setShowReturnModal(true)
			setHasShownModal(true)
		}
	}, [isAuthenticated, returnUrl, hasShownModal, loaders.userLoading])

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
				{isSubscribed ? null : (
					<p className="text-center text-[#919296]">
						Upgrade now for access to LlamaFeed, increased api limits and premium api endpoints.
					</p>
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

				{isAuthenticated && !isSubscribed && (
					<>
						<AccountStatus
							user={user}
							isVerified={user?.verified}
							isSubscribed={isSubscribed}
							subscription={subscription}
							onEmailChange={() => setShowEmailForm(true)}
						/>
					{!user?.verified && !isWalletUser && user?.email && (
						<EmailVerificationWarning
							email={user.email}
							onResendVerification={handleResendVerification}
							isLoading={loaders.resendVerification}
						/>
					)}
					</>
				)}
				<EmailChangeModal
					isOpen={showEmailForm}
					onClose={() => setShowEmailForm(false)}
					onSubmit={handleEmailChange}
					email={newEmail}
					onEmailChange={setNewEmail}
					isLoading={isWalletUser ? loaders.addEmail : loaders.changeEmail}
					isWalletUser={isWalletUser}
				/>
				{isAuthenticated && isSubscribed ? (
					<div className="mx-auto mt-6 w-full max-w-[1200px]">
						<AccountInfo />
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
									<span className="rounded-md bg-[#7B7BFF] px-2 py-0.5 text-xs font-semibold text-white">2 months free</span>
								</button>
							</div>
						</div>
						<div
							ref={pricingContainer}
							className="relative z-10 grid grid-cols-1 gap-4 *:*:max-w-[408px]! *:max-w-full! *:items-center lg:grid-cols-3"
						>
							<div
								className={`relative flex w-full shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-8 shadow-md backdrop-blur-md transition-all duration-300 not-first:hover:transform md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 md:hover:scale-[1.02]`}
							>
								<FreeCard />
							</div>
							<div
								className={`relative flex w-full shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-8 shadow-md backdrop-blur-md transition-all duration-300 not-first:hover:transform md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 md:hover:scale-[1.02]`}
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
								className={`relative flex w-full shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-8 shadow-md backdrop-blur-md transition-all duration-300 not-first:hover:transform md:w-auto md:max-w-[400px] md:flex-1 md:shrink md:snap-none md:px-5 md:hover:scale-[1.02]`}
							>
								<SubscribeAPICard
									context="page"
									isLegacyActive={apiSubscription?.status === 'active' && apiSubscription?.provider === 'legacy'}
									billingInterval={billingInterval}
								/>
							</div>
							<div
								className={`col-span-full rounded-xl border border-[#4a4a50] bg-[#22242930] px-5 py-8 shadow-md backdrop-blur-md transition-all duration-300 hover:transform md:px-5 md:hover:scale-[1.02]`}
							>
								<span className="mx-auto flex w-full flex-col md:w-auto md:max-w-[400px]">
									<h2 className="text-center text-[2rem] font-extrabold whitespace-nowrap">Enterprise</h2>
									<SubscribeEnterpriseCard />
								</span>
							</div>
						</div>
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
