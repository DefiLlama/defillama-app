// [DEV-TOOLBAR] This entire file should be deleted before production
import { createContext, useContext, useState, type ReactNode } from 'react'

export type DevScenario =
	| 'live'
	| 'free-wallet'
	| 'free-email'
	| 'free-email-unverified'
	| 'pro-monthly-llamapay'
	| 'pro-monthly-stripe'
	| 'pro-yearly'
	| 'api-monthly'
	| 'api-yearly'
	| 'free-trial'

const SCENARIO_LABELS: Record<DevScenario, string> = {
	live: 'Live (real data)',
	'free-wallet': 'Free — Wallet auth',
	'free-email': 'Free — Email auth',
	'free-email-unverified': 'Free — Unverified email',
	'pro-monthly-llamapay': 'Pro Monthly — LlamaPay',
	'pro-monthly-stripe': 'Pro Monthly — Stripe',
	'pro-yearly': 'Pro Yearly — Stripe',
	'api-monthly': 'API Monthly — Stripe',
	'api-yearly': 'API Yearly — Stripe',
	'free-trial': 'Free Trial — Pro'
}

const noop = () => {}
const noopAsync = () => Promise.resolve()
const noopMutation = { mutate: noop, mutateAsync: noopAsync, isPending: false } as any

function mockSub(overrides: Record<string, any>) {
	return {
		PK: 'mock',
		checkoutUrl: '',
		id: 'mock-sub-id',
		status: 'inactive' as string,
		updatedAt: new Date().toISOString(),
		expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
		type: '' as string,
		provider: '' as string,
		billing_interval: undefined as 'year' | 'month' | undefined,
		overage: false,
		metadata: undefined as any,
		started_at: undefined as string | undefined,
		...overrides
	}
}

function buildMockAuth(scenario: DevScenario) {
	const isTrial = scenario === 'free-trial'
	const isEmail = !scenario.includes('wallet') || isTrial
	const isUnverified = scenario.includes('unverified')

	return {
		user: {
			id: 'dev-user',
			email: isEmail ? '0xdefillama_user@gmail.com' : '',
			walletAddress: !isEmail ? '0x23e6a41bF2b3b11b6739B40e2E34BB2904e4bC8d5a' : '',
			verified: isTrial ? true : !isUnverified,
			promotionalEmails: 'on' as const,
			has_active_subscription: isTrial ? true : !scenario.startsWith('free'),
			flags: isTrial ? { is_trial: true } : {},
			ethereum_email: ''
		} as any,
		logout: noop,
		changeEmail: noop,
		resetPasswordMutation: noopMutation,
		addEmail: noopAsync as any,
		addWallet: noopAsync as any,
		resendVerification: noop,
		setPromotionalEmails: noop,
		isAuthenticated: true,
		hasActiveSubscription: isTrial ? true : !scenario.startsWith('free'),
		isTrial,
		loaders: {
			login: false,
			signup: false,
			logout: false,
			addWallet: false,
			changeEmail: false,
			resendVerification: false,
			addEmail: false,
			setPromotionalEmails: false,
			userLoading: false
		}
	}
}

function buildMockSubscribe(scenario: DevScenario) {
	const isTrial = scenario === 'free-trial'
	const isPro = scenario.startsWith('pro')
	const isApi = scenario.startsWith('api')
	const isYearly = scenario.includes('yearly')
	const isLlamapay = scenario.includes('llamapay')
	const provider = isLlamapay ? 'llamapay' : 'stripe'

	const trialSub = isTrial
		? mockSub({
				status: 'active',
				type: 'llamafeed',
				provider: 'stripe',
				billing_interval: 'month',
				metadata: { isTrial: true, trial_started_at: new Date(Date.now() - 9 * 86400000).toISOString() },
				expires_at: new Date(Date.now() + 5 * 86400000).toISOString()
			})
		: null

	const activeSub = isTrial
		? trialSub!
		: isPro || isApi
			? mockSub({
					status: 'active',
					type: isPro ? 'llamafeed' : 'api',
					provider,
					billing_interval: isYearly ? 'year' : 'month',
					overage: false
				})
			: mockSub({ status: 'inactive' })

	return {
		apiSubscription: isApi ? activeSub : mockSub({ status: 'inactive' }),
		llamafeedSubscription: isTrial ? trialSub! : isPro ? activeSub : mockSub({ status: 'inactive' }),
		legacySubscription: mockSub({ status: 'inactive' }),
		subscription: activeSub,
		hasActiveSubscription: activeSub.status === 'active',
		apiKey: isApi ? '953acbba3a8b3760f0dca63137996c9637c630b46a32086e2d531065f751a722' : null,
		isApiKeyLoading: false,
		generateNewKeyMutation: noopMutation,
		credits: isApi ? 855643 : null,
		isCreditsLoading: false,
		refetchCredits: noop,
		usageStats: isApi
			? {
					windowDays: 30,
					stats: Array.from({ length: 14 }, (_, i) => {
						const d = new Date()
						d.setDate(d.getDate() - (13 - i))
						return {
							date: d.toISOString().split('T')[0],
							totalRequests: Math.floor(Math.random() * 120) + 10,
							routes: {
								'api/metrics': Math.floor(Math.random() * 40),
								'bridges/bridgedaystats': Math.floor(Math.random() * 30),
								'api/lite': Math.floor(Math.random() * 25),
								'bridges/bridgevolume': Math.floor(Math.random() * 20),
								'coins/prices': Math.floor(Math.random() * 15),
								'dat/institutions': Math.floor(Math.random() * 10)
							}
						}
					})
				}
			: null,
		isUsageStatsLoading: false,
		isUsageStatsError: false,
		handleSubscribe: noop as any,
		getPortalSessionUrl: noopAsync as any,
		createPortalSession: noopAsync as any,
		enableOverage: noopAsync as any,
		isEnableOverageLoading: false,
		cancelSubscription: noopAsync as any,
		isCancelSubscriptionLoading: false,
		isPortalSessionLoading: false,
		isSubscriptionLoading: false,
		isSubscriptionError: false,
		isLoading: false,
		loading: null,
		error: null,
		endTrialSubscription: noopAsync as any,
		isEndTrialLoading: false,
		isTrialAvailable: false
	}
}

export interface DevOverrides {
	auth: ReturnType<typeof buildMockAuth>
	subscribe: ReturnType<typeof buildMockSubscribe>
}

const DevContext = createContext<DevOverrides | null>(null)

export function useDevOverrides() {
	return useContext(DevContext)
}

function ToolbarUI({
	scenario,
	onChange
}: {
	scenario: DevScenario
	onChange: (s: DevScenario) => void
}) {
	return (
		<div className="sticky top-0 z-50 flex flex-wrap items-center gap-1.5 border-b border-yellow-500/30 bg-yellow-950/80 px-3 py-2 backdrop-blur-sm">
			<span className="mr-1 text-xs font-medium text-yellow-400">DEV</span>
			{Object.entries(SCENARIO_LABELS).map(([key, label]) => (
				<button
					key={key}
					onClick={() => onChange(key as DevScenario)}
					className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
						scenario === key
							? 'bg-yellow-500 text-yellow-950'
							: 'bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'
					}`}
				>
					{label}
				</button>
			))}
		</div>
	)
}

export function DevToolbar({ children }: { children: ReactNode }) {
	const [scenario, setScenario] = useState<DevScenario>('live')

	const overrides =
		scenario === 'live' ? null : { auth: buildMockAuth(scenario), subscribe: buildMockSubscribe(scenario) }

	return (
		<DevContext.Provider value={overrides}>
			<ToolbarUI scenario={scenario} onChange={setScenario} />
			{children}
		</DevContext.Provider>
	)
}
