import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { AccountInfo } from '~/containers/Subscribtion/AccountInfo'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Account() {
	const router = useRouter()
	const { success } = router.query
	const queryClient = useQueryClient()
	const { isAuthenticated } = useAuthContext()
	const { hasActiveSubscription, isSubscriptionLoading } = useSubscribe()
	const [showSuccessModal, setShowSuccessModal] = useState(false)
	const [hasProcessedSuccess, setHasProcessedSuccess] = useState(false)
	const [hasShownSuccessModal, setHasShownSuccessModal] = useState(false)

	useEffect(() => {
		if (success === 'true' && isAuthenticated && !hasProcessedSuccess) {
			queryClient.invalidateQueries({ queryKey: ['subscription'] })
			setHasProcessedSuccess(true)
			router.replace('/account', undefined, { shallow: true })
		}
	}, [success, isAuthenticated, hasProcessedSuccess, queryClient, router])

	useEffect(() => {
		if (hasProcessedSuccess && !isSubscriptionLoading && hasActiveSubscription && !hasShownSuccessModal) {
			setShowSuccessModal(true)
			setHasShownSuccessModal(true)
		}
	}, [hasProcessedSuccess, isSubscriptionLoading, hasActiveSubscription, hasShownSuccessModal])

	const handleCloseSuccessModal = () => {
		setShowSuccessModal(false)
		setHasProcessedSuccess(false)
	}

	return (
		<WalletProvider>
			<SubscribeLayout>
				<div className="mx-auto w-full max-w-[1200px] px-5 pb-[64px]">
					<AccountInfo />
				</div>

				{showSuccessModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
						<div className="relative w-full max-w-md rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 shadow-2xl">
							<div className="flex flex-col items-center gap-6 py-6">
								<div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
									<Icon name="check" height={40} width={40} className="text-green-400" />
								</div>
								<div className="flex flex-col gap-2 text-center">
									<h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
									<p className="text-[#8a8c90]">Your subscription has been activated. Welcome to DeFiLlama Pro!</p>
								</div>
								<button
									onClick={handleCloseSuccessModal}
									className="rounded-lg bg-[#5C5CF9] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
								>
									Continue
								</button>
							</div>
						</div>
					</div>
				)}
			</SubscribeLayout>
		</WalletProvider>
	)
}
