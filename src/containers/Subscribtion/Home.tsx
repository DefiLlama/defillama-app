import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { AccountInfo } from './AccountInfo'
import { LocalLoader } from '~/components/LocalLoader'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { AccountStatus } from './components/AccountStatus'
import { EmailChangeModal } from './components/EmailChangeModal'
import { SubscribeProCard } from '~/components/SubscribeCards/SubscribeProCard'
import { SubscribeEnterpriseCard } from '~/components/SubscribeCards/SubscribeEnterpriseCard'
import { ReturnModal } from './components/ReturnModal'

export function SubscribeHome({ returnUrl }: { returnUrl?: string }) {
	const { isAuthenticated, loaders, user, changeEmail, addEmail } = useAuthContext()
	const { subscription, isSubscriptionFetching } = useSubscribe()
	const [showEmailForm, setShowEmailForm] = useState(false)
	const [newEmail, setNewEmail] = useState('')
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
	const isSubscribed = subscription?.status === 'active'
	const [isClient, setIsClient] = useState(false)
	const router = useRouter()
	const [showReturnModal, setShowReturnModal] = useState(false)
	const [hasShownModal, setHasShownModal] = useState(false)

	const pricingContainer = useRef<HTMLDivElement>(null)
	const [activePriceCard, setActivePriceCard] = useState(0)
	console.log(user)
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

				{isAuthenticated && !isSubscribed && (
					<>
						<AccountStatus
							user={user}
							isVerified={user?.verified}
							isSubscribed={isSubscribed}
							subscription={subscription}
							onEmailChange={() => setShowEmailForm(true)}
						/>
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
					<div className="mt-6 w-full max-w-[1200px] mx-auto">
						<AccountInfo />
					</div>
				) : (
					<div className="relative">
						<div
							ref={pricingContainer}
							className="pricing-container flex flex-row relative z-10 overflow-x-auto scroll-smooth snap-x snap-mandatory max-md:-mx-2 max-md:pl-2 gap-4 py-4 justify-start md:overflow-visible md:justify-center"
						>
							<SubscribePlusCard context="page" />
							<SubscribeProCard context="page" />
							<SubscribeEnterpriseCard />
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
											// Calculate scroll position to center the card, considering container padding/margins
											const scrollLeft = cardElement.offsetLeft + cardElement.offsetWidth / 2 - ref.offsetWidth / 2
											ref.scrollTo({ left: scrollLeft, behavior: 'smooth' })
										}
									}}
								/>
							))}
						</div>
					</div>
				)}
			</div>
			<div className="flex flex-col items-center justify-center gap-[64px] mb-[64px] w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] mx-auto px-5">
				<h2 className="text-[32px] font-extrabold">They trust us</h2>

				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 place-items-center gap-20">
					<img
						src="/icons/federal-bank-ny.svg"
						alt="Federal Reserve Bank of New York"
						className="h-[28px] object-contain"
					/>
					<img src="/icons/us-treasury.svg" alt="U.S. Department of the Treasury" className="h-[60px] object-contain" />
					<img src="/icons/cftc.svg" alt="CFTC" className="h-[48px] object-contain" />
					<img src="/icons/jpmorgan.svg" alt="JPMorgan" className="h-[28px] object-contain" />
					<span className="flex flex-col gap-2">
						<img src="/icons/ecb-1.svg" alt="" className="h-[28px] object-contain" />
						<img src="/icons/ecb-2.svg" alt="European Central Bank" className="h-[10px] object-contain" />
					</span>
					<img src="/icons/mas.svg" alt="Monetary Authority of Singapore" className="h-[60px] object-contain" />
					<img src="/icons/bis.svg" alt="Bank of International Settlements" className="h-[48px] object-contain" />
					<img src="/icons/nber.svg" alt="National Bureau of Economic Research" className="h-[60px] object-contain" />
					<img src="/icons/imf.svg" alt="International Monetary Fund" className="h-[28px] object-contain" />
					<img src="/icons/boc.svg" alt="Bank of Canada" className="h-[60px] object-contain" />
					<img src="/icons/boe.svg" alt="Bank of England" className="h-[28px] object-contain" />
					<img src="/icons/binance.svg" alt="Binance" className="h-[28px] object-contain" />
					<img src="/icons/okx.svg" alt="OKX" className="h-[28px] object-contain" />
					<img src="/icons/chainlink.svg" alt="Chainlink" className="h-[28px] object-contain" />
					<img src="/icons/coinbase.svg" alt="Coinbase" className="h-[28px] object-contain" />
				</div>
			</div>
			{returnUrl && (
				<ReturnModal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} returnUrl={returnUrl} />
			)}
		</>
	)
}
