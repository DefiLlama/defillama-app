import { Icon } from '~/components/Icon'

interface SubscriptionCardProps {
	planName: string
	renewalDate: string
	subscriptionType: string
	subscriptionPayment: string
	provider: 'stripe' | 'llamapay' | 'legacy' | 'manual'
	isCancelPending: boolean
	onManage: () => void
	onCancel: () => void
	isManageLoading?: boolean
	isCancelLoading?: boolean
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

export function SubscriptionCard({
	planName,
	renewalDate,
	subscriptionType,
	subscriptionPayment,
	provider,
	isCancelPending,
	onManage,
	onCancel,
	isManageLoading,
	isCancelLoading
}: SubscriptionCardProps) {
	const isManageable = provider === 'stripe' || provider === 'llamapay'
	const manageLabel = provider === 'stripe' ? 'Manage on Stripe' : 'Manage on LlamaPay'

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex items-center gap-2">
				<Icon name="receipt" height={28} width={28} className="text-(--sub-ink-primary) dark:text-white" />
				<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">Subscription</span>
			</div>

			<div className="flex flex-col gap-3">
				<InfoRow
					label="Current plan"
					value={planName}
					valueClassName="bg-linear-to-r from-(--sub-brand-primary) to-(--sub-brand-soft) dark:from-(--sub-brand-secondary) dark:to-(--sub-brand-softest) bg-clip-text text-transparent"
				/>
				<InfoRow
					label={isCancelPending ? 'Cancels on' : 'Renewal Date'}
					value={renewalDate}
					valueClassName={isCancelPending ? 'text-(--sub-orange-400)' : undefined}
				/>
				<InfoRow label="Subscription Type" value={subscriptionType} />
				<InfoRow label="Payment Provider" value={subscriptionPayment} />
			</div>

			{isCancelPending ? (
				<p className="text-xs font-medium text-(--sub-orange-400)">Cancellation scheduled</p>
			) : isManageable ? (
				<div className="flex gap-2">
					<button
						onClick={onManage}
						disabled={isManageLoading}
						className="flex h-8 items-center gap-1 rounded-lg border border-(--sub-border-muted) px-3 text-xs font-medium whitespace-nowrap text-(--sub-ink-primary) disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
					>
						{isManageLoading ? 'Loading...' : manageLabel}
						{!isManageLoading && <Icon name="circle-external-link" height={16} width={16} className="shrink-0" />}
					</button>
					<button
						onClick={onCancel}
						disabled={isCancelLoading}
						className="flex h-8 items-center rounded-lg border border-(--sub-border-muted) px-3 text-xs font-medium whitespace-nowrap text-(--sub-ink-primary) disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
					>
						{isCancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
					</button>
				</div>
			) : null}
		</div>
	)
}
