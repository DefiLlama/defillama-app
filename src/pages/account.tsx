import * as Ariakit from '@ariakit/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { ManageAccount } from '~/containers/Account/ManageAccount'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'
import Layout from '~/layout'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Account() {
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
				canonicalUrl="/account"
			>
				<div className="mx-auto w-full max-w-[573px] py-6">
					<ManageAccount />
				</div>

				<Ariakit.DialogProvider open={showSuccessModal} setOpen={() => setShowSuccessModal(false)}>
					<Ariakit.Dialog
						backdrop={<div className="bg-black/80" />}
						className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[380px]"
						portal
						unmountOnHide
					>
						<div className="flex flex-col items-center gap-6 bg-white px-5 py-8 dark:bg-(--sub-surface-dark)">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--sub-brand-primary)/10">
								<Icon name="check" height={32} width={32} className="text-(--sub-brand-primary)" />
							</div>
							<div className="flex flex-col gap-2 text-center">
								<h2 className="text-xl font-semibold text-(--sub-ink-primary) dark:text-white">Payment Successful!</h2>
								<p className="text-sm text-(--sub-text-muted)">
									Your subscription has been activated. Welcome to DefiLlama Pro!
								</p>
							</div>
							<Ariakit.DialogDismiss className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white">
								Continue
							</Ariakit.DialogDismiss>
						</div>
					</Ariakit.Dialog>
				</Ariakit.DialogProvider>
			</Layout>
		</WalletProvider>
	)
}
