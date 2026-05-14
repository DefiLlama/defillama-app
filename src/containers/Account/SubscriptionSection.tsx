import { lazy, Suspense, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'
import type { Subscription } from '~/containers/Subscription/useSubscribe'
import { useAiBalance } from '~/containers/Subscription/useTopup'
import { ApiAccessCard } from './ApiAccessCard'
import { CancelSubscriptionModal } from './CancelSubscriptionModal'
import { EndTrialModal } from './EndTrialModal'
import { ExternalDataBalanceCard } from './ExternalDataBalanceCard'
import { SubscriptionCard } from './SubscriptionCard'
import { useTeam } from './Team/useTeam'
import { TrialSubscriptionCard } from './TrialSubscriptionCard'
import { TrialUpgradeBanner } from './TrialUpgradeBanner'

const TopupModal = lazy(() => import('~/components/TopupModal').then((m) => ({ default: m.TopupModal })))
const StripeCheckoutModal = lazy(() =>
	import('~/components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal }))
)

function parseExpiryDate(raw: string): string | null {
	const asDate = new Date(isNaN(Number(raw)) ? raw : Number(raw) * 1000)
	if (isNaN(asDate.getTime())) {
		console.error(`[parseExpiryDate] Invalid expiry date: "${raw}"`)
		return null
	}
	return asDate.toISOString()
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getSubscriptionTypeLabel(subscription: { billing_interval?: string; type: string }): string {
	const isYearly = subscription.billing_interval === 'year'
	if (subscription.type === 'api') {
		return isYearly ? 'Yearly ($3,000/year)' : 'Monthly ($300/month)'
	}
	return isYearly ? 'Yearly ($490/year)' : 'Monthly ($49/month)'
}

function getPaymentLabel(provider: string): string {
	if (provider === 'stripe') return 'Stripe'
	if (provider === 'llamapay') return 'LlamaPay'
	if (provider === 'legacy') return 'Legacy'
	if (provider === 'manual') return 'Manual'
	return provider
}

function getPlanName(type: string): string {
	if (type === 'api') return 'API'
	if (type === 'llamafeed') return 'Pro'
	return 'Free'
}

function SubscriptionCardWithProps({
	subscription,
	onManage,
	onCancel,
	isManageLoading,
	isCancelLoading
}: {
	subscription: Subscription
	onManage: () => void
	onCancel: () => void
	isManageLoading: boolean
	isCancelLoading: boolean
}) {
	const isCancelPending = subscription.metadata?.isCanceled === 'true'
	const expiryDate = parseExpiryDate(subscription.expires_at)
	return (
		<SubscriptionCard
			planName={getPlanName(subscription.type)}
			renewalDate={expiryDate ? formatDate(expiryDate) : 'Unknown'}
			subscriptionType={getSubscriptionTypeLabel(subscription)}
			subscriptionPayment={getPaymentLabel(subscription.provider)}
			provider={subscription.provider as 'stripe' | 'llamapay' | 'legacy' | 'manual'}
			isCancelPending={isCancelPending}
			onManage={onManage}
			onCancel={onCancel}
			isManageLoading={isManageLoading}
			isCancelLoading={isCancelLoading}
		/>
	)
}

function YearlyUpgradeBanner({ onUpgrade, planType = 'pro' }: { onUpgrade: () => void; planType?: 'pro' | 'api' }) {
	const savings = planType === 'api' ? '$600/year' : '$98/year'
	const subscriptionLabel = planType === 'api' ? 'API subscription' : 'Pro subscription'
	const buttonLabel = planType === 'api' ? 'Upgrade API to Yearly' : 'Upgrade Pro to Yearly'

	return (
		<div className="flex items-center rounded-2xl border border-(--sub-brand-primary) bg-(--sub-brand-primary)/20 p-4">
			<div className="flex w-full flex-col gap-8.5 sm:w-[155px]">
				<div className="flex flex-col gap-3">
					<p className="bg-linear-to-r from-(--sub-brand-primary) to-(--sub-brand-soft) bg-clip-text text-lg leading-[22px] font-semibold text-transparent dark:from-(--sub-brand-secondary) dark:to-(--sub-brand-softest) dark:to-[64%]">
						Save {savings} with annual billing
					</p>
					<p className="text-xs leading-4 text-(--sub-ink-primary) dark:text-white">
						Switch to yearly and get 12 months of {subscriptionLabel} for the price of 10.
					</p>
				</div>
				<button
					onClick={onUpgrade}
					className="flex h-8 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) px-3 text-xs font-medium text-white"
				>
					{buttonLabel}
				</button>
			</div>
		</div>
	)
}

function FreeUpgradeBanner() {
	return (
		<div className="relative overflow-hidden rounded-2xl border border-(--sub-brand-primary) bg-(--sub-brand-primary)/20 p-4">
			<div className="relative z-10 flex max-w-[250px] flex-col gap-6.5">
				<div className="flex flex-col gap-3">
					<p className="bg-linear-to-r from-(--sub-brand-primary) to-(--sub-brand-soft) bg-clip-text text-lg leading-[22px] font-semibold text-transparent dark:from-(--sub-brand-secondary) dark:to-(--sub-brand-softest) dark:to-77%">
						Unlock the full power of DefiLlama
					</p>
					<p className="text-xs leading-4 text-(--sub-ink-primary) dark:text-white">
						Upgrade to Pro for advanced analytics tools, or get the API plan to power your own applications.
					</p>
				</div>
				<BasicLink
					href="/subscription"
					className="flex h-8 w-fit items-center rounded-lg bg-(--sub-brand-primary) px-3 text-xs leading-4 font-medium text-white"
				>
					View & Compare Plans
				</BasicLink>
			</div>

			<div
				className="pointer-events-none absolute inset-0"
				style={{
					maskImage: 'linear-gradient(to right, transparent 28%, rgba(0,0,0,0.35) 100%)',
					WebkitMaskImage: 'linear-gradient(to right, transparent 28%, rgba(0,0,0,0.35) 100%)'
				}}
			>
				<img
					src="/assets/sub_plans_bg_light.png"
					alt=""
					loading="lazy"
					className="absolute inset-0 h-full w-full object-fill dark:hidden"
				/>
				<img
					src="/assets/sub_plans_bg_dark.png"
					alt=""
					loading="lazy"
					className="absolute inset-0 hidden h-full w-full object-fill dark:block"
				/>
			</div>
		</div>
	)
}

function PastDueSubscriptionCard({
	subscription,
	onUpdatePayment,
	onCancel,
	isUpdateLoading,
	isCancelLoading
}: {
	subscription: Subscription
	onUpdatePayment: () => void
	onCancel: () => void
	isUpdateLoading: boolean
	isCancelLoading: boolean
}) {
	const planName = getPlanName(subscription.type)
	const canUpdatePayment = subscription.provider === 'stripe'
	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-sub-warning-border-light bg-sub-warning-bg/10 p-4 dark:border-sub-warning-border-dark">
			<div className="flex items-start gap-2">
				<Icon
					name="alert-warning"
					height={20}
					width={20}
					className="mt-0.5 shrink-0 text-sub-warning-text-light dark:text-sub-warning-text-dark"
				/>
				<div className="flex flex-col gap-1">
					<h3 className="text-base font-semibold text-sub-warning-text-light dark:text-sub-warning-text-dark">
						{planName} Subscription Past Due
					</h3>
					<p className="text-sm text-sub-warning-text-light dark:text-sub-warning-text-dark">
						Your most recent payment failed. To keep your subscription active, update your payment method on Stripe.
						Otherwise, you can cancel the overdue subscription below.
					</p>
				</div>
			</div>
			<div className="flex flex-wrap gap-2">
				{canUpdatePayment && (
					<button
						onClick={onUpdatePayment}
						disabled={isUpdateLoading}
						className="flex h-9 items-center gap-1 rounded-lg bg-(--sub-brand-primary) px-3 text-sm font-medium whitespace-nowrap text-white disabled:opacity-50"
					>
						{isUpdateLoading ? 'Loading...' : 'Update Payment on Stripe'}
						{!isUpdateLoading && <Icon name="circle-external-link" height={16} width={16} className="shrink-0" />}
					</button>
				)}
				<button
					onClick={onCancel}
					disabled={isCancelLoading}
					className="flex h-9 items-center rounded-lg border border-(--sub-border-muted) px-3 text-sm font-medium whitespace-nowrap text-(--sub-ink-primary) disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
				>
					{isCancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
				</button>
			</div>
		</div>
	)
}

function LegacyWarning() {
	return (
		<div className="flex items-start gap-2 rounded-2xl border border-sub-warning-border-light bg-sub-warning-bg/10 p-4 dark:border-sub-warning-border-dark">
			<Icon
				name="alert-warning"
				height={20}
				width={20}
				className="mt-0.5 shrink-0 text-sub-warning-text-light dark:text-sub-warning-text-dark"
			/>
			<p className="text-sm text-sub-warning-text-light dark:text-sub-warning-text-dark">
				Your current subscription is a legacy plan. You need to unsubscribe via{' '}
				<a href="https://subscriptions.llamapay.io/" target="_blank" rel="noopener noreferrer" className="underline">
					LlamaPay
				</a>{' '}
				and subscribe again after the current subscription expires.
			</p>
		</div>
	)
}

function getTeamSubLabel(type: string | null): string {
	if (type === 'api') return 'API'
	if (type === 'llamafeed') return 'Pro'
	return ''
}

function TeamSubscriptionBanner({ teamName, subscriptionType }: { teamName: string; subscriptionType: string | null }) {
	const hasAssigned = subscriptionType !== null

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex items-center gap-2">
				<Icon name="users" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
				<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">Team Subscription</span>
			</div>
			{hasAssigned ? (
				<p className="text-sm text-(--sub-text-muted)">
					Your{' '}
					<span className="font-medium text-(--sub-ink-primary) dark:text-white">
						{getTeamSubLabel(subscriptionType)}
					</span>{' '}
					subscription is managed by{' '}
					<span className="font-medium text-(--sub-ink-primary) dark:text-white">{teamName}</span>. Billing and seat
					changes are handled by your team admin.
				</p>
			) : (
				<p className="text-sm text-(--sub-text-muted)">
					You're a member of <span className="font-medium text-(--sub-ink-primary) dark:text-white">{teamName}</span>.
					Contact your team admin to be assigned a subscription.
				</p>
			)}
		</div>
	)
}

export function SubscriptionSection() {
	const { isTrial: isTrialFromAuth, hasActiveSubscription } = useAuthContext()
	const { team } = useTeam()

	const { balance, isLoading: isAiBalanceLoading } = useAiBalance()
	const [isTopupModalOpen, setIsTopupModalOpen] = useState(false)
	const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
	const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState(false)
	const [isCancelSubModalOpen, setIsCancelSubModalOpen] = useState(false)
	const [isYearlyUpgradeModalOpen, setIsYearlyUpgradeModalOpen] = useState(false)
	const [yearlyUpgradeType, setYearlyUpgradeType] = useState<'api' | 'llamafeed' | null>(null)
	const {
		apiSubscription,
		llamafeedSubscription,
		pastDueSubscription,
		credits,
		usageStats,
		isUsageStatsLoading,
		isUsageStatsError,
		createPortalSession,
		cancelSubscription,
		generateNewKeyMutation,
		apiKey,
		isPortalSessionLoading,
		isCancelSubscriptionLoading,
		endTrialSubscription,
		isEndTrialLoading,
		isSubscriptionLoading
	} = useSubscribe()

	const isTeamMember = Boolean(team && !team.isAdmin)
	const teamAssignedType = isTeamMember ? (team?.subscriptionType ?? null) : null

	// Team member guard: hide personal billing controls. Still render the feature cards
	// (API access, usage, external-data balance) that the assigned subscription unlocks.
	if (isTeamMember && team) {
		const teamBanner = <TeamSubscriptionBanner teamName={team.name} subscriptionType={teamAssignedType} />

		if (teamAssignedType === 'api') {
			const memberBalanceCard = balance ? (
				<ExternalDataBalanceCard
					freeRemaining={balance.freeRemaining}
					toppedUpBalance={balance.toppedUpBalance}
					freeLimit={balance.freeLimit}
					freeSpent={balance.freeSpent}
					isLoading={isAiBalanceLoading}
					onTopUp={() => setIsTopupModalOpen(true)}
				/>
			) : isAiBalanceLoading ? (
				<ExternalDataBalanceCard
					freeRemaining="0"
					toppedUpBalance="0"
					freeLimit="0"
					freeSpent="0"
					isLoading
					onTopUp={() => {}}
				/>
			) : null

			return (
				<>
					{teamBanner}
					<ApiAccessCard
						apiKey={apiKey}
						credits={credits}
						usageStats={usageStats}
						isUsageStatsLoading={isUsageStatsLoading}
						isUsageStatsError={isUsageStatsError}
						onRegenerateKey={() => generateNewKeyMutation.mutate()}
						isRegenerateLoading={generateNewKeyMutation.isPending}
					/>
					{memberBalanceCard}
					{isTopupModalOpen ? (
						<Suspense fallback={null}>
							<TopupModal isOpen={isTopupModalOpen} onClose={() => setIsTopupModalOpen(false)} />
						</Suspense>
					) : null}
				</>
			)
		}

		return teamBanner
	}

	const hasProSubscription = llamafeedSubscription?.status === 'active'
	const hasApiSubscription = apiSubscription?.status === 'active'
	const activeSubscription = hasApiSubscription ? apiSubscription : hasProSubscription ? llamafeedSubscription : null
	const isPastDue = Boolean(pastDueSubscription?.id) && !hasApiSubscription && !hasProSubscription
	const isProMonthly = hasProSubscription && llamafeedSubscription?.billing_interval === 'month'
	const isApiMonthly = hasApiSubscription && apiSubscription?.billing_interval === 'month'
	const isTrial = hasProSubscription && (isTrialFromAuth || String(llamafeedSubscription?.metadata?.isTrial) === 'true')

	const isLegacy = activeSubscription?.provider === 'legacy'
	const isCancelPending = activeSubscription?.metadata?.isCanceled === 'true'

	const handleManageSubscription = async () => {
		if (activeSubscription?.provider === 'stripe') {
			await createPortalSession()
		} else if (activeSubscription?.provider === 'llamapay') {
			window.open('https://subscriptions.llamapay.io/', '_blank')
		}
	}

	const handleCancelSubscription = () => {
		if (activeSubscription?.provider === 'stripe') {
			setIsCancelSubModalOpen(true)
		} else if (activeSubscription?.provider === 'llamapay') {
			window.open('https://subscriptions.llamapay.io/', '_blank')
		}
	}

	const handleUpgradeToYearly = (type: 'llamafeed' | 'api') => {
		setYearlyUpgradeType(type)
		setIsYearlyUpgradeModalOpen(true)
	}

	if (isPastDue && pastDueSubscription) {
		const handlePastDuePayment = async () => {
			if (pastDueSubscription.provider === 'stripe') {
				await createPortalSession()
			}
		}
		return (
			<>
				<PastDueSubscriptionCard
					subscription={pastDueSubscription}
					onUpdatePayment={handlePastDuePayment}
					onCancel={() => setIsCancelSubModalOpen(true)}
					isUpdateLoading={isPortalSessionLoading}
					isCancelLoading={isCancelSubscriptionLoading}
				/>
				{isCancelSubModalOpen ? (
					<CancelSubscriptionModal
						isOpen={isCancelSubModalOpen}
						onClose={() => setIsCancelSubModalOpen(false)}
						onConfirm={async (message) => {
							await cancelSubscription(message)
							setIsCancelSubModalOpen(false)
						}}
						isLoading={isCancelSubscriptionLoading}
						variant="subscription"
					/>
				) : null}
			</>
		)
	}

	if (isTrial && llamafeedSubscription) {
		const trialEndDate = parseExpiryDate(llamafeedSubscription.expires_at)
		return (
			<>
				<div className="flex flex-col items-stretch gap-3 sm:flex-row">
					<TrialSubscriptionCard
						trialEndDate={trialEndDate}
						isCancelPending={llamafeedSubscription.metadata?.isCanceled === 'true'}
						onCancel={() => setIsCancelSubscriptionModalOpen(true)}
						isCancelLoading={isCancelSubscriptionLoading}
					/>
					<TrialUpgradeBanner onUpgrade={() => setIsUpgradeModalOpen(true)} isLoading={false} />
				</div>
				<CancelSubscriptionModal
					isOpen={isCancelSubscriptionModalOpen}
					onClose={() => setIsCancelSubscriptionModalOpen(false)}
					onConfirm={async (message) => {
						await cancelSubscription(message)
						setIsCancelSubscriptionModalOpen(false)
					}}
					isLoading={isCancelSubscriptionLoading}
				/>
				<EndTrialModal
					isOpen={isUpgradeModalOpen}
					onClose={() => setIsUpgradeModalOpen(false)}
					onConfirm={() => {
						endTrialSubscription()
							.then(() => setIsUpgradeModalOpen(false))
							.catch(() => toast.error('Failed to end trial. Please try again.'))
					}}
					isLoading={isEndTrialLoading}
				/>
			</>
		)
	}

	if (!activeSubscription) {
		if (isSubscriptionLoading || hasActiveSubscription) {
			return null
		}
		return <FreeUpgradeBanner />
	}

	const balanceCard =
		(hasProSubscription || hasApiSubscription) && balance ? (
			<ExternalDataBalanceCard
				freeRemaining={balance.freeRemaining}
				toppedUpBalance={balance.toppedUpBalance}
				freeLimit={balance.freeLimit}
				freeSpent={balance.freeSpent}
				isLoading={isAiBalanceLoading}
				onTopUp={() => setIsTopupModalOpen(true)}
			/>
		) : (hasProSubscription || hasApiSubscription) && isAiBalanceLoading ? (
			<ExternalDataBalanceCard
				freeRemaining="0"
				toppedUpBalance="0"
				freeLimit="0"
				freeSpent="0"
				isLoading
				onTopUp={() => {}}
			/>
		) : null

	const topupModal = isTopupModalOpen ? (
		<Suspense fallback={null}>
			<TopupModal isOpen={isTopupModalOpen} onClose={() => setIsTopupModalOpen(false)} />
		</Suspense>
	) : null

	const cancelSubModal = isCancelSubModalOpen ? (
		<CancelSubscriptionModal
			isOpen={isCancelSubModalOpen}
			onClose={() => setIsCancelSubModalOpen(false)}
			onConfirm={async (message) => {
				await cancelSubscription(message)
				setIsCancelSubModalOpen(false)
			}}
			isLoading={isCancelSubscriptionLoading}
			variant="subscription"
		/>
	) : null

	const yearlyUpgradeModal =
		isYearlyUpgradeModalOpen && yearlyUpgradeType ? (
			<Suspense fallback={null}>
				<StripeCheckoutModal
					isOpen={isYearlyUpgradeModalOpen}
					onClose={() => {
						setIsYearlyUpgradeModalOpen(false)
						setYearlyUpgradeType(null)
					}}
					paymentMethod="stripe"
					type={yearlyUpgradeType}
					billingInterval="year"
					isUpgradeFlow
					upgradeReturnPath="/account?success=true"
				/>
			</Suspense>
		) : null

	if (hasApiSubscription) {
		return (
			<>
				{isLegacy && <LegacyWarning />}
				<div className="flex flex-col items-stretch gap-3 sm:flex-row">
					<SubscriptionCardWithProps
						subscription={activeSubscription}
						onManage={handleManageSubscription}
						onCancel={handleCancelSubscription}
						isManageLoading={isPortalSessionLoading}
						isCancelLoading={isCancelSubscriptionLoading}
					/>
					{isApiMonthly && !isCancelPending && apiSubscription?.provider !== 'llamapay' && (
						<YearlyUpgradeBanner onUpgrade={() => handleUpgradeToYearly('api')} planType="api" />
					)}
				</div>
				<ApiAccessCard
					apiKey={apiKey}
					credits={credits}
					usageStats={usageStats}
					isUsageStatsLoading={isUsageStatsLoading}
					isUsageStatsError={isUsageStatsError}
					onRegenerateKey={() => generateNewKeyMutation.mutate()}
					isRegenerateLoading={generateNewKeyMutation.isPending}
				/>
				{balanceCard}
				{topupModal}
				{cancelSubModal}
				{yearlyUpgradeModal}
			</>
		)
	}

	return (
		<>
			<div className="flex flex-col items-stretch gap-3 sm:flex-row">
				<SubscriptionCardWithProps
					subscription={activeSubscription}
					onManage={handleManageSubscription}
					onCancel={handleCancelSubscription}
					isManageLoading={isPortalSessionLoading}
					isCancelLoading={isCancelSubscriptionLoading}
				/>
				{isProMonthly && !isCancelPending && llamafeedSubscription?.provider !== 'llamapay' && (
					<YearlyUpgradeBanner onUpgrade={() => handleUpgradeToYearly('llamafeed')} planType="pro" />
				)}
			</div>
			{balanceCard}
			{topupModal}
			{cancelSubModal}
			{yearlyUpgradeModal}
		</>
	)
}
