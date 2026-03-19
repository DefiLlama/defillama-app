import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { LLAMA_AI_SHOW_WALKTHROUGH, readAppStorage, writeAppStorage } from '~/contexts/LocalStorage'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const ONBOARDING_OPTIONS = [
	{
		id: 'llamaai',
		label: 'LlamaAI',
		description: 'Research & analysis',
		iconType: 'svg' as const,
		color: '#C99A4A',
		destination: '/ai/chat'
	},
	{
		id: 'csv',
		label: 'CSV Downloads',
		description: 'Export any dataset',
		iconType: 'icon' as const,
		iconName: 'download-cloud' as const,
		color: '#2564eb',
		destination: '/downloads'
	},
	{
		id: 'dashboards',
		label: 'Pro Dashboards',
		description: 'Build custom views',
		iconType: 'icon' as const,
		iconName: 'layout-grid' as const,
		color: '#e04dc0',
		destination: '/pro'
	},
	{
		id: 'llamafeed',
		label: 'LlamaFeed',
		description: 'Real-time premium insights',
		iconType: 'icon' as const,
		iconName: 'activity' as const,
		color: '#8b5cf6',
		destination: 'https://llamafeed.io'
	},
	{
		id: 'sheets',
		label: 'DefiLlama Sheets',
		description: 'Blockchain data in spreadsheets',
		iconType: 'icon' as const,
		iconName: 'sheets' as const,
		color: '#22c55e',
		destination: '/sheets'
	},
	{
		id: 'exploring',
		label: 'Just exploring everything',
		description: null,
		iconType: 'icon' as const,
		iconName: 'earth' as const,
		color: '#8a8c90',
		destination: null
	}
] as const

const PRIORITY_ORDER = ['llamaai', 'dashboards', 'csv', 'llamafeed', 'sheets'] as const

export function WelcomeOnboarding() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { isAuthenticated } = useAuthContext()
	const { hasActiveSubscription, isSubscriptionLoading } = useSubscribe()
	const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set())

	useEffect(() => {
		if (!isSubscriptionLoading && !isAuthenticated) {
			void router.replace('/subscription')
		}
	}, [isSubscriptionLoading, isAuthenticated, router])

	// Invalidate subscription cache once on mount when arriving from Stripe redirect.
	// StripeCheckoutModal redirects directly to /welcome, bypassing /account?success=true
	// where the cache invalidation previously happened.
	const hasInvalidatedRef = useRef(false)
	useEffect(() => {
		if (isAuthenticated && !hasActiveSubscription && !isSubscriptionLoading && !hasInvalidatedRef.current) {
			hasInvalidatedRef.current = true
			void queryClient.invalidateQueries({ queryKey: ['subscription'] })
		}
	}, [isAuthenticated, hasActiveSubscription, isSubscriptionLoading, queryClient])

	const toggleFeature = useCallback((id: string) => {
		setSelectedFeatures((prev) => {
			if (prev.has(id)) {
				const next = new Set(prev)
				next.delete(id)
				return next
			}
			if (id === 'exploring') {
				return new Set(['exploring'])
			}
			const next = new Set(prev)
			next.delete('exploring')
			next.add(id)
			return next
		})
	}, [])

	const handleContinue = useCallback(() => {
		const features = Array.from(selectedFeatures)

		trackUmamiEvent('onboarding-intent', { features })

		const storage = readAppStorage()
		storage.ONBOARDING_INTENT = features
		if (selectedFeatures.has('llamaai')) {
			storage[LLAMA_AI_SHOW_WALKTHROUGH] = true
		}
		writeAppStorage(storage)

		if (selectedFeatures.has('exploring')) {
			void router.push('/')
			return
		}

		const navigate = (url: string) => {
			if (url.startsWith('http')) {
				window.location.href = url
			} else {
				void router.push(url)
			}
		}

		// Always clean up the returnUrl regardless of path taken
		const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('onboarding_returnUrl') : null
		if (returnUrl) sessionStorage.removeItem('onboarding_returnUrl')

		if (features.length === 1) {
			const option = ONBOARDING_OPTIONS.find((o) => o.id === features[0])
			if (option?.destination) {
				if (option.id === 'csv' && returnUrl) {
					navigate(returnUrl)
				} else {
					navigate(option.destination)
				}
				return
			}
		}

		for (const id of PRIORITY_ORDER) {
			if (selectedFeatures.has(id)) {
				const option = ONBOARDING_OPTIONS.find((o) => o.id === id)
				if (option?.destination) {
					navigate(option.destination)
					return
				}
			}
		}
	}, [selectedFeatures, router])

	if (isSubscriptionLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39393E] border-t-[#5C5CF9]" />
					<p className="text-[#8a8c90]">Loading your subscription...</p>
				</div>
			</div>
		)
	}

	if (!isSubscriptionLoading && !hasActiveSubscription && isAuthenticated) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5C5CF9]/10">
						<Icon name="clock" height={28} width={28} className="text-[#5C5CF9]" />
					</div>
					<h2 className="text-xl font-bold text-white">Processing your payment...</h2>
					<p className="max-w-sm text-[#8a8c90]">
						This usually takes a few seconds. If it doesn&apos;t update, try refreshing.
					</p>
					<button
						onClick={() => window.location.reload()}
						className="rounded-lg border border-[#39393E] px-4 py-2 text-sm text-[#8a8c90] transition-colors hover:bg-[#2a2b30] hover:text-white"
					>
						Refresh
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="mx-auto flex w-full max-w-[580px] flex-col items-center px-4 py-14 animate-[fadein_0.3s_ease-out]">
			<div className="mb-8 flex flex-col items-center gap-1.5 text-center">
				<span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#5C5CF9]/25 bg-[#5C5CF9]/8 px-3 py-1 text-xs font-medium tracking-wide text-[#7B7BFF]">
					<Icon name="check-circle" height={13} width={13} />
					Pro activated
				</span>
				<h1 className="text-2xl font-bold tracking-tight text-white">Welcome to DefiLlama Pro</h1>
				<p className="text-sm text-[#8a8c90]">What brought you here? Pick all that apply.</p>
			</div>

			<div className="flex w-full flex-col gap-2">
				{ONBOARDING_OPTIONS.map((option, i) => {
					const isSelected = selectedFeatures.has(option.id)
					const c = option.color
					return (
						<button
							key={option.id}
							onClick={() => toggleFeature(option.id)}
							style={{
								animationDelay: `${i * 40}ms`,
								...(isSelected ? { borderColor: `${c}66`, backgroundColor: `${c}0f` } : {})
							}}
							className={`group flex items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-all duration-200 animate-[fadein_0.2s_ease-out_both] ${
								isSelected ? '' : 'border-[#2a2b30] bg-[#1a1b1f] hover:border-[#39393E] hover:bg-[#1e1f24]'
							}`}
							role="checkbox"
							aria-checked={isSelected}
						>
							<div
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
								style={{
									backgroundColor: isSelected ? `${c}26` : `${c}14`
								}}
							>
								{option.iconType === 'svg' ? (
									<svg className="h-[18px] w-[18px]" style={{ color: isSelected ? '#FDE0A9' : c }}>
										<use href="/assets/llamaai/ask-llamaai-3.svg#ai-icon" />
									</svg>
								) : (
									<Icon
										name={option.iconName}
										height={18}
										width={18}
										className="transition-colors duration-200"
										style={{ color: isSelected ? c : '#8a8c90' }}
									/>
								)}
							</div>
							<div className="flex min-w-0 flex-col">
								<span className={`text-sm font-medium leading-tight ${isSelected ? 'text-white' : 'text-[#e0e0e3]'}`}>
									{option.label}
								</span>
								{option.description ? (
									<span className="mt-0.5 text-xs leading-tight text-[#6b6e73]">{option.description}</span>
								) : null}
							</div>
							<div className="ml-auto shrink-0">
								<div
									className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-all duration-200 ${
										isSelected ? '' : 'border-[#39393E] group-hover:border-[#555]'
									}`}
									style={isSelected ? { borderColor: c, backgroundColor: c } : undefined}
								>
									{isSelected ? <Icon name="check" height={10} width={10} className="text-white" /> : null}
								</div>
							</div>
						</button>
					)
				})}
			</div>

			<div className="mt-6 flex w-full flex-col items-center gap-2">
				<button
					onClick={handleContinue}
					disabled={selectedFeatures.size === 0}
					className="w-full rounded-xl bg-[#5C5CF9] py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-[0_0_24px_rgba(92,92,249,0.2)] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
				>
					Get started
				</button>
				<button
					onClick={() => void router.push('/account')}
					className="py-1 text-xs text-[#6b6e73] transition-colors hover:text-[#b4b7bc]"
				>
					Skip
				</button>
			</div>
		</div>
	)
}
