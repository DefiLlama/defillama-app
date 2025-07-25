import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useState } from 'react'
import toast from 'react-hot-toast'
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
				toast.success('Trial activated successfully! You now have 24 hours of Llama+ access.')
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
			<div className="relative bg-[#22242930] backdrop-blur-md rounded-xl border border-[#4a4a50] shadow-md overflow-hidden p-6 mt-4 transition-all duration-300">
				<div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-orange-500 to-transparent opacity-40"></div>
				<div className="absolute top-[-30px] right-[-30px] w-[80px] h-[80px] rounded-full bg-orange-500 opacity-10 blur-2xl"></div>
				<h2 className="text-2xl font-bold mb-4 bg-linear-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
					Trial Already Used
				</h2>
				<p className="text-[#919296] mb-6">
					You've already experienced Llama+ premium features! Ready to continue with a full subscription?
				</p>
				<div className="flex items-center gap-2 text-sm text-[#919296]">
					<svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
		<div className="relative bg-[#22242930] backdrop-blur-md rounded-xl border border-[#4a4a50] shadow-md overflow-hidden p-6 mt-4 transition-all duration-300 hover:border-[#5c5cf9]/50">
			<div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#5c5cf9] to-transparent opacity-40"></div>
			<div className="absolute top-[-30px] right-[-30px] w-[80px] h-[80px] rounded-full bg-[#5c5cf9] opacity-10 blur-2xl"></div>

			<div className="flex items-center gap-3 mb-4">
				<div className="p-2 bg-[#5c5cf9]/10 rounded-lg">
					<svg className="w-6 h-6 text-[#5c5cf9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h2 className="text-2xl font-bold bg-linear-to-r from-[#5C5CF9] to-[#8A8AFF] bg-clip-text text-transparent">
					Activate Your 24-Hour Llama+ Trial
				</h2>
			</div>

			<p className="text-[#b4b7bc] mb-6 leading-relaxed">Experience Llama+ for free!</p>

			<div className="bg-[#1a1b1f]/50 border border-[#39393E] rounded-lg p-3 mb-4">
				<p className="text-xs text-[#919296] flex items-start gap-2">
					<svg className="w-4 h-4 text-[#5c5cf9] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				className="w-full py-3 px-4 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] hover:from-[#4A4AF0] hover:to-[#5A5AF5] text-white font-medium transition-all duration-200 shadow-lg hover:shadow-[#5C5CF9]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{isActivating ? (
					<>
						<svg
							className="animate-spin h-5 w-5 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span>Activating Trial...</span>
					</>
				) : (
					<>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						<span>Start Free Trial Now</span>
					</>
				)}
			</button>
		</div>
	)
}
