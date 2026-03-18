import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { AccountInfo } from '~/containers/Subscribtion/AccountInfo'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Account() {
	const router = useRouter()
	const success = Array.isArray(router.query.success) ? router.query.success[0] : router.query.success
	const topupSuccess = Array.isArray(router.query.topup) ? router.query.topup[0] : router.query.topup
	const queryClient = useQueryClient()
	const { isAuthenticated } = useAuthContext()
	const successProcessedRef = useRef(false)
	const topupProcessedRef = useRef(false)

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
		void queryClient.invalidateQueries({ queryKey: ['subscription'] })
		void router.replace('/welcome')
	}, [success, isAuthenticated, queryClient, router])

	return (
		<WalletProvider>
			<SubscribeLayout
				title="My Account - DefiLlama Pro"
				description="Manage your DefiLlama Pro subscription, billing, and account settings."
			>
				<div className="mx-auto w-full max-w-[1200px] px-5">
					<AccountInfo />
				</div>
			</SubscribeLayout>
		</WalletProvider>
	)
}
