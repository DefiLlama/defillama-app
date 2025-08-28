import { useState } from 'react'
import { useRouter } from 'next/router'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '~/components/Loaders'
import { AUTH_SERVER } from '~/constants'
import { useAuthContext } from '../auth'

interface TrialActivationProps {
	onSuccess?: () => void
	hasUsedTrial?: boolean
}

export function TrialActivation({ onSuccess, hasUsedTrial }: TrialActivationProps) {
	const [isActivating, setIsActivating] = useState(false)
	const { authorizedFetch } = useAuthContext()
	const router = useRouter()
	const queryClient = useQueryClient()

	const activateTrial = async () => {
		setIsActivating(true)
		try {
			const response = await authorizedFetch(`${AUTH_SERVER}/trial/activate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			})

			if (response && response.ok) {
				toast.success('Trial activated successfully! You now have 24 hours of Pro access.')
				queryClient.invalidateQueries({ queryKey: ['subscription'] })
				onSuccess?.()
				setTimeout(() => {
					window.location.reload()
				}, 1000)
			} else if (response) {
				const data = await response.json()
				const errorMessage = data.message || 'Failed to activate trial'

				if (errorMessage.includes('already used their trial')) {
					toast.error(
						'You have already used your trial subscription. Please subscribe to continue using premium features.'
					)
				} else if (errorMessage.includes('already has an active subscription')) {
					toast.error('You already have an active subscription.')
				} else if (errorMessage.includes('already has an active trial')) {
					toast.error('Your trial is already active.')
				} else {
					toast.error(errorMessage)
				}
			}
		} catch (error) {
			console.error('Error activating trial:', error)
			toast.error('Failed to activate trial. Please try again.')
		} finally {
			setIsActivating(false)
		}
	}

	if (hasUsedTrial) {
		return (
			<div className="relative mt-4 overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md transition-all duration-300">
				<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-orange-500 to-transparent opacity-40"></div>
				<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-orange-500 opacity-10 blur-2xl"></div>
				<h2 className="mb-4 bg-linear-to-r from-orange-400 to-orange-600 bg-clip-text text-2xl font-bold text-transparent">
					Trial Already Used
				</h2>
				<p className="mb-6 text-[#919296]">
					You've already experienced Pro premium features! Ready to continue with a full subscription?
				</p>
				<div className="flex items-center gap-2 text-sm text-[#919296]">
					<svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Choose a subscription plan below to continue</span>
				</div>
			</div>
		)
	}

	return (
		<div className="relative mt-4 overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] p-6 shadow-md backdrop-blur-md transition-all duration-300 hover:border-[#5c5cf9]/50">
			<div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-[#5c5cf9] to-transparent opacity-40"></div>
			<div className="absolute top-[-30px] right-[-30px] h-[80px] w-[80px] rounded-full bg-[#5c5cf9] opacity-10 blur-2xl"></div>

			<div className="mb-4 flex items-center gap-3">
				<div className="rounded-lg bg-[#5c5cf9]/10 p-2">
					<svg className="h-6 w-6 text-[#5c5cf9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h2 className="bg-linear-to-r from-[#5C5CF9] to-[#8A8AFF] bg-clip-text text-2xl font-bold text-transparent">
					Activate Your 24-Hour Pro Trial
				</h2>
			</div>

			<p className="mb-6 leading-relaxed text-[#b4b7bc]">Experience Pro for free!</p>

			<div className="mb-4 rounded-lg border border-[#39393E] bg-[#1a1b1f]/50 p-3">
				<p className="flex items-start gap-2 text-xs text-[#919296]">
					<svg className="mt-0.5 h-4 w-4 shrink-0 text-[#5c5cf9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>
						This is a one-time offer. Your trial starts immediately upon activation and expires after 24 hours.
					</span>
				</p>
			</div>

			<button
				onClick={activateTrial}
				disabled={isActivating}
				className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isActivating ? (
					<>
						<LoadingSpinner size={20} />
						<span>Activating Trial...</span>
					</>
				) : (
					<>
						<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						<span>Start Free Trial Now</span>
					</>
				)}
			</button>
		</div>
	)
}
