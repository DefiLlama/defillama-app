import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { DevToolbar } from '~/containers/Account2/DevToolbar' // [DEV-TOOLBAR] remove before production
import { ManageAccount } from '~/containers/Account2/ManageAccount'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import Layout from '~/layout'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Account2() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { isAuthenticated } = useAuthContext()
	const { hasActiveSubscription, isSubscriptionLoading } = useSubscribe()
	const topupProcessedRef = useRef(false)
	const successProcessedRef = useRef(false)
	const [showSuccessModal, setShowSuccessModal] = useState(false)

	const topupSuccess = Array.isArray(router.query.topup) ? router.query.topup[0] : router.query.topup
	const success = Array.isArray(router.query.success) ? router.query.success[0] : router.query.success

	// Handle ?topup=success
	useEffect(() => {
		if (topupSuccess !== 'success' || !isAuthenticated || topupProcessedRef.current) return
		topupProcessedRef.current = true
		void queryClient.invalidateQueries({ queryKey: ['ai-balance'] })
		toast.success('Top-up successful! Your External Data Balance has been updated.')
		const { topup: _ignored, ...nextQuery } = router.query
		void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [topupSuccess, isAuthenticated, queryClient, router])

	useEffect(() => {
		if (topupSuccess !== 'success') {
			topupProcessedRef.current = false
		}
	}, [topupSuccess])

	// Handle ?success=true (post-upgrade redirect from Stripe)
	useEffect(() => {
		if (success !== 'true' || !isAuthenticated || successProcessedRef.current) return
		successProcessedRef.current = true
		void queryClient.invalidateQueries({ queryKey: ['subscription'] })
		const { success: _ignored, ...nextQuery } = router.query
		void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [success, isAuthenticated, queryClient, router])

	useEffect(() => {
		if (success !== 'true') {
			successProcessedRef.current = false
		}
	}, [success])

	useEffect(() => {
		if (successProcessedRef.current && !isSubscriptionLoading && hasActiveSubscription) {
			setShowSuccessModal(true)
		}
	}, [isSubscriptionLoading, hasActiveSubscription])

	return (
		<WalletProvider>
			<Layout
				title="Manage Account - DefiLlama"
				description="Manage your DefiLlama account settings and authentication."
				canonicalUrl="/account2"
			>
				{/* [DEV-TOOLBAR] remove DevToolbar wrapper before production */}
				<DevToolbar>
					<div className="mx-auto w-full max-w-[573px] px-4 py-6">
						<ManageAccount />
					</div>
				</DevToolbar>

				{showSuccessModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
						<div className="flex w-full max-w-[380px] flex-col items-center gap-6 rounded-2xl border border-(--sub-c-ced8e6) bg-white px-5 py-8 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--sub-c-1f67d2)/10">
								<Icon name="check" height={32} width={32} className="text-(--sub-c-1f67d2)" />
							</div>
							<div className="flex flex-col gap-2 text-center">
								<h2 className="text-xl font-semibold text-(--sub-c-090b0c) dark:text-white">Payment Successful!</h2>
								<p className="text-sm text-(--sub-c-878787)">
									Your subscription has been activated. Welcome to DefiLlama Pro!
								</p>
							</div>
							<button
								onClick={() => setShowSuccessModal(false)}
								className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-c-1f67d2) text-sm font-medium text-white"
							>
								Continue
							</button>
						</div>
					</div>
				)}
			</Layout>
		</WalletProvider>
	)
}
