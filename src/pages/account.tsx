import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { AUTH_SERVER } from '~/constants'
import { AccountInfo } from '~/containers/Subscribtion/AccountInfo'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Account() {
	const router = useRouter()
	const { session_id } = router.query
	const queryClient = useQueryClient()
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [paymentStatus, setPaymentStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
	const [error, setError] = useState<string | null>(null)
	const [showPaymentModal, setShowPaymentModal] = useState(false)

	useEffect(() => {
		if (!session_id || !isAuthenticated) return

		setPaymentStatus('verifying')
		setShowPaymentModal(true)

		const verifySession = async () => {
			try {
				const response = await authorizedFetch(
					`${AUTH_SERVER}/subscription/verify-session`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ sessionId: session_id })
					},
					true
				)

				const data = await response.json()

				if (!response.ok) {
					throw new Error(data.message || 'Failed to verify session')
				}

				await queryClient.invalidateQueries({ queryKey: ['subscription'] })
				setPaymentStatus('success')
			} catch (err) {
				console.error('Error verifying session:', err)
				setError(err instanceof Error ? err.message : 'Failed to verify payment')
				setPaymentStatus('error')
			}
		}

		verifySession()
	}, [session_id, authorizedFetch, isAuthenticated, queryClient, router])

	return (
		<WalletProvider>
			<SubscribeLayout>
				<div className="mx-auto w-full max-w-[1200px] px-5 pb-[64px]">
					<AccountInfo />
				</div>

				{/* Payment Result Modal */}
				{showPaymentModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
						<div className="relative w-full max-w-md rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 shadow-2xl">
							{paymentStatus === 'verifying' && (
								<div className="flex flex-col items-center gap-4 py-6">
									<div className="h-16 w-16 animate-spin rounded-full border-4 border-[#5C5CF9]/20 border-t-[#5C5CF9]" />
									<h2 className="text-center text-xl font-bold text-white">Verifying your payment...</h2>
									<p className="text-center text-[#8a8c90]">Please wait while we confirm your subscription.</p>
								</div>
							)}

							{paymentStatus === 'success' && (
								<div className="flex flex-col items-center gap-6 py-6">
									<div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
										<Icon name="check" height={40} width={40} className="text-green-400" />
									</div>
									<div className="flex flex-col gap-2 text-center">
										<h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
										<p className="text-[#8a8c90]">Your subscription has been activated.</p>
									</div>
									<button
										onClick={() => {
											router.replace('/account', undefined, { shallow: true })
											setShowPaymentModal(false)
										}}
										className="rounded-lg bg-[#5C5CF9] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
									>
										Continue
									</button>
								</div>
							)}

							{paymentStatus === 'error' && (
								<div className="flex flex-col items-center gap-6 py-6">
									<div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
										<Icon name="x" height={40} width={40} className="text-red-400" />
									</div>
									<div className="flex flex-col gap-2 text-center">
										<h2 className="text-2xl font-bold text-white">Payment Verification Failed</h2>
										<p className="text-[#8a8c90]">{error || 'There was a problem verifying your payment.'}</p>
									</div>
									<div className="flex gap-3">
										<button
											onClick={() => setShowPaymentModal(false)}
											className="rounded-lg border border-[#39393E] bg-[#1a1b1f] px-6 py-3 font-medium text-white transition-colors hover:bg-[#39393E]"
										>
											Close
										</button>
										<a
											href="mailto:support@defillama.com"
											className="rounded-lg bg-[#5C5CF9] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
										>
											Contact Support
										</a>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</SubscribeLayout>
		</WalletProvider>
	)
}
