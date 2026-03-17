import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { AccountInfo } from '~/containers/Subscribtion/AccountInfo'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Account() {
	const router = useRouter()
	const success = Array.isArray(router.query.success) ? router.query.success[0] : router.query.success
	const topupSuccess = Array.isArray(router.query.topup) ? router.query.topup[0] : router.query.topup
	const queryClient = useQueryClient()
	const { isAuthenticated } = useAuthContext()
	const { hasActiveSubscription, isSubscriptionLoading } = useSubscribe()
	const successProcessedRef = useRef(false)
	const topupProcessedRef = useRef(false)
	const successFlowIdRef = useRef(0)
	const [activeFlowId, setActiveFlowId] = useState<number | null>(null)

	useEffect(() => {
		if (success !== 'true') {
			successProcessedRef.current = false
		}
	}, [success])

	useEffect(() => {
		if (topupSuccess !== 'success' || !isAuthenticated || topupProcessedRef.current) return

		topupProcessedRef.current = true
		void queryClient.invalidateQueries({ queryKey: ['ai-balance'] })
		toast.success('Top-up successful! Your LlamaAI Balance has been updated.')

		const { topup: _ignored, ...nextQuery } = router.query
		void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [topupSuccess, isAuthenticated, queryClient, router])

	useEffect(() => {
		if (topupSuccess !== 'success') {
			topupProcessedRef.current = false
		}
	}, [topupSuccess])

	useEffect(() => {
		if (success !== 'true' || !isAuthenticated || successProcessedRef.current) return

		successProcessedRef.current = true
		successFlowIdRef.current += 1
		setActiveFlowId(successFlowIdRef.current)
		void queryClient.invalidateQueries({ queryKey: ['subscription'] })

		const { success: _ignoredSuccess, ...nextQuery } = router.query
		void router.replace(
			{
				pathname: router.pathname,
				query: nextQuery
			},
			undefined,
			{ shallow: true }
		)
	}, [success, isAuthenticated, queryClient, router])

	const showSuccessModal = activeFlowId != null && !isSubscriptionLoading && hasActiveSubscription

	const handleCloseSuccessModal = () => {
		setActiveFlowId(null)
	}

	return (
		<WalletProvider>
			<SubscribeLayout
				title="My Account - DefiLlama Pro"
				description="Manage your DefiLlama Pro subscription, billing, and account settings."
			>
				<div className="mx-auto w-full max-w-[1200px] px-5">
					<AccountInfo />
				</div>

				{showSuccessModal ? (
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
				) : null}
			</SubscribeLayout>
		</WalletProvider>
	)
}
