import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { DevToolbar } from '~/containers/Account2/DevToolbar' // [DEV-TOOLBAR] remove before production
import { ManageAccount } from '~/containers/Account2/ManageAccount'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Account2() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { isAuthenticated } = useAuthContext()
	const topupProcessedRef = useRef(false)
	const topupSuccess = Array.isArray(router.query.topup) ? router.query.topup[0] : router.query.topup

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
			</Layout>
		</WalletProvider>
	)
}
