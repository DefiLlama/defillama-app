import { lazy, Suspense, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'
import { ConfirmActionModal } from './ConfirmActionModal'
import type { TeamSubscription } from './types'
import { useTeam } from './useTeam'

const PurchaseSeatsModal = lazy(() => import('./PurchaseSeatsModal').then((m) => ({ default: m.PurchaseSeatsModal })))
const ManageSeatsModal = lazy(() => import('./ManageSeatsModal').then((m) => ({ default: m.ManageSeatsModal })))

function getSubscriptionLabel(type: string): string {
	if (type === 'api') return 'API'
	if (type === 'llamafeed') return 'Pro'
	return type
}

function getUnitPrice(type: string, billingInterval: 'month' | 'year'): number {
	if (type === 'api') return billingInterval === 'year' ? 3000 : 300
	return billingInterval === 'year' ? 490 : 49
}

function getIntervalSuffix(interval: 'month' | 'year'): string {
	return interval === 'year' ? '/year' : '/month'
}

function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function computeNextBillingDate(createdAt: string, billingInterval: 'month' | 'year'): Date | null {
	// Backend returns "2026-04-16 20:02:14.302Z" with a space separator; normalize to ISO.
	const isoLike = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T')
	const created = new Date(isoLike)
	if (isNaN(created.getTime())) return null

	const next = new Date(created)
	const now = new Date()
	let safety = 0
	while (next <= now && safety < 1200) {
		if (billingInterval === 'month') {
			next.setMonth(next.getMonth() + 1)
		} else {
			next.setFullYear(next.getFullYear() + 1)
		}
		safety += 1
	}
	return next
}

function isActiveSub(sub: TeamSubscription): boolean {
	return sub.status === undefined || sub.status === 'active'
}

function InfoRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
	return (
		<div className="flex items-center gap-2">
			<span className="shrink-0 text-xs leading-4 text-(--sub-text-muted)">{label}</span>
			<div className="h-0 min-w-0 flex-1 border-b border-dashed border-(--sub-border-slate-100) dark:border-(--sub-border-strong)" />
			<span className={`shrink-0 text-xs leading-4 ${valueClassName || 'text-(--sub-ink-primary) dark:text-white'}`}>
				{value}
			</span>
		</div>
	)
}

function SubscriptionRow({ subscription }: { subscription: TeamSubscription }) {
	const { upgradeSeatsMutation } = useTeam()
	const [showManageModal, setShowManageModal] = useState(false)
	const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false)

	const label = getSubscriptionLabel(subscription.type)
	const unit = getUnitPrice(subscription.type, subscription.billingInterval)
	const total = unit * subscription.seats.seatCount
	const intervalSuffix = getIntervalSuffix(subscription.billingInterval)
	const active = isActiveSub(subscription)
	const nextDate =
		active && subscription.createdAt ? computeNextBillingDate(subscription.createdAt, subscription.billingInterval) : null

	const isMonthly = subscription.billingInterval === 'month'
	const upgradePending = upgradeSeatsMutation.isPending

	const handleConfirmUpgrade = async () => {
		try {
			await upgradeSeatsMutation.mutateAsync({ subscriptionType: subscription.type })
			setShowUpgradeConfirm(false)
		} catch {
			// error toast is handled inside upgradeSeatsMutation.onError
		}
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border border-(--sub-border-slate-100) p-3 dark:border-(--sub-border-strong)">
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-col">
					<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">
						{label} — {subscription.billingInterval === 'year' ? 'Yearly' : 'Monthly'}
					</span>
					<span className="text-xs text-(--sub-text-muted)">
						{subscription.seats.seatCount} seat{subscription.seats.seatCount === 1 ? '' : 's'} × $
						{unit.toLocaleString()}
						{intervalSuffix}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold text-(--sub-ink-primary) dark:text-white">
						{`$${total.toLocaleString()}${intervalSuffix}`}
					</span>
					{isMonthly && active && (
						<button
							onClick={() => setShowUpgradeConfirm(true)}
							disabled={upgradePending}
							className="flex h-7 items-center gap-1.5 rounded-lg border border-(--sub-border-slate-100) px-2.5 text-xs font-medium text-(--sub-ink-primary) hover:bg-(--sub-brand-primary)/5 disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
						>
							<Icon name="sparkles" height={12} width={12} />
							Upgrade to Yearly
						</button>
					)}
					<button
						onClick={() => setShowManageModal(true)}
						disabled={upgradePending}
						className="flex h-7 items-center gap-1.5 rounded-lg border border-(--sub-border-slate-100) px-2.5 text-xs font-medium text-(--sub-ink-primary) hover:bg-(--sub-brand-primary)/5 disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
					>
						<Icon name="settings" height={12} width={12} />
						Manage
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<InfoRow label="Total seats" value={String(subscription.seats.seatCount)} />
				<InfoRow label="Occupied" value={String(subscription.seats.occupiedSeats)} />
				<InfoRow
					label="Available"
					value={String(subscription.seats.availableSeats)}
					valueClassName={
						subscription.seats.availableSeats > 0
							? 'text-(--sub-green-600) dark:text-(--sub-green-400)'
							: 'text-(--sub-text-muted)'
					}
				/>
				{nextDate ? (
					<InfoRow label="Next billing" value={formatDate(nextDate)} />
				) : subscription.status ? (
					<InfoRow label="Status" value={subscription.status} valueClassName="capitalize text-(--sub-text-muted)" />
				) : null}
			</div>

			{showManageModal && (
				<Suspense fallback={null}>
					<ManageSeatsModal
						isOpen={showManageModal}
						onClose={() => setShowManageModal(false)}
						subscription={subscription}
					/>
				</Suspense>
			)}

			<ConfirmActionModal
				isOpen={showUpgradeConfirm}
				onClose={() => !upgradePending && setShowUpgradeConfirm(false)}
				onConfirm={() => void handleConfirmUpgrade()}
				isLoading={upgradePending}
				title={`Upgrade ${label} to Yearly`}
				description={`Upgrade your ${label} subscription (${subscription.seats.seatCount} seat${subscription.seats.seatCount === 1 ? '' : 's'}) to yearly billing? Stripe will immediately charge your saved card the prorated yearly amount, and your renewal date will shift to one year from today.`}
				confirmLabel="Upgrade to Yearly"
			/>
		</div>
	)
}

function BillingTotals({ subscriptions }: { subscriptions: TeamSubscription[] }) {
	const totals = subscriptions.reduce(
		(acc, sub) => {
			if (!isActiveSub(sub)) return acc
			const amount = getUnitPrice(sub.type, sub.billingInterval) * sub.seats.seatCount
			if (sub.billingInterval === 'year') acc.yearly += amount
			else acc.monthly += amount
			return acc
		},
		{ monthly: 0, yearly: 0 }
	)

	if (totals.monthly === 0 && totals.yearly === 0) return null

	const rows: { label: string; value: string }[] = []
	if (totals.monthly > 0) rows.push({ label: 'Total', value: `$${totals.monthly.toLocaleString()}/month` })
	if (totals.yearly > 0) rows.push({ label: 'Total', value: `$${totals.yearly.toLocaleString()}/year` })

	return (
		<div className="flex flex-col gap-1.5 rounded-lg bg-(--sub-brand-primary)/5 p-3">
			{rows.map((row, i) => (
				<div key={i} className="flex items-center justify-between gap-2">
					<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">{row.label}</span>
					<span className="text-sm font-semibold text-(--sub-ink-primary) dark:text-white">{row.value}</span>
				</div>
			))}
		</div>
	)
}

function YearlyTip({ subscriptions }: { subscriptions: TeamSubscription[] }) {
	const monthlySubs = subscriptions.filter((sub) => isActiveSub(sub) && sub.billingInterval === 'month')
	if (monthlySubs.length === 0) return null

	const monthlyTotal = monthlySubs.reduce(
		(acc, sub) => acc + getUnitPrice(sub.type, 'month') * sub.seats.seatCount,
		0
	)
	const yearlyTotal = monthlySubs.reduce(
		(acc, sub) => acc + getUnitPrice(sub.type, 'year') * sub.seats.seatCount,
		0
	)
	const savings = monthlyTotal * 12 - yearlyTotal

	return (
		<div className="flex items-start gap-2">
			<Icon name="sparkles" height={12} width={12} className="mt-1 shrink-0 text-(--sub-text-muted)" />
			<p className="text-xs leading-5 text-(--sub-text-muted)">
				Tip: switch to yearly billing and get 2 months free — save ${savings.toLocaleString()}/year on your current
				seats.
			</p>
		</div>
	)
}

export function TeamSeatsCard() {
	const { teamSubscriptions, upgradeSeatsMutation } = useTeam()
	const { createPortalSession, isPortalSessionLoading } = useSubscribe()
	const [showPurchaseModal, setShowPurchaseModal] = useState(false)

	const hasStripe = teamSubscriptions.some((sub) => sub.provider === undefined || sub.provider === 'stripe')
	const upgradePending = upgradeSeatsMutation.isPending

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Icon name="receipt" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
					<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">
						Subscriptions & Billing
					</span>
				</div>
				<div className="flex items-center gap-2">
					{teamSubscriptions.length > 0 && hasStripe && (
						<button
							onClick={() => void createPortalSession()}
							disabled={isPortalSessionLoading}
							className="flex h-8 items-center gap-1.5 rounded-lg border border-(--sub-border-slate-100) px-3 text-xs font-medium text-(--sub-ink-primary) hover:bg-(--sub-brand-primary)/5 disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
						>
							<Icon name="external-link" height={12} width={12} />
							{isPortalSessionLoading ? 'Opening...' : 'Manage in Stripe'}
						</button>
					)}
					<button
						onClick={() => setShowPurchaseModal(true)}
						disabled={upgradePending}
						className="flex h-8 items-center gap-1.5 rounded-lg bg-(--sub-brand-primary) px-3 text-xs font-medium text-white disabled:opacity-50"
					>
						<Icon name="plus" height={14} width={14} />
						Purchase Seats
					</button>
				</div>
			</div>

			{teamSubscriptions.length === 0 ? (
				<p className="text-sm text-(--sub-text-muted)">
					No seats purchased yet. Purchase seats to assign subscriptions to team members.
				</p>
			) : (
				<>
					<div className="flex flex-col gap-3">
						{teamSubscriptions.map((sub) => (
							<SubscriptionRow key={sub.id} subscription={sub} />
						))}
					</div>

					<BillingTotals subscriptions={teamSubscriptions} />

					<YearlyTip subscriptions={teamSubscriptions} />
				</>
			)}

			{showPurchaseModal && (
				<Suspense fallback={null}>
					<PurchaseSeatsModal isOpen={showPurchaseModal} onClose={() => setShowPurchaseModal(false)} />
				</Suspense>
			)}
		</div>
	)
}
