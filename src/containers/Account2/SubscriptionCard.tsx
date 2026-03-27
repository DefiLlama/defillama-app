import { Icon } from '~/components/Icon'

interface SubscriptionCardProps {
	planName: string
	renewalDate: string
	subscriptionType: string
	subscriptionPayment: string
	provider: 'stripe' | 'llamapay' | 'legacy'
	onManage: () => void
	onCancel: () => void
	isManageLoading?: boolean
	isCancelLoading?: boolean
}

function InfoRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
	return (
		<div className="flex items-center gap-2">
			<span className="shrink-0 text-xs leading-4 text-(--sub-c-878787)">{label}</span>
			<div className="h-0 min-w-0 flex-1 border-b border-dashed border-(--sub-c-ced8e6) dark:border-(--sub-c-2f3336)" />
			<span className={`shrink-0 text-xs leading-4 ${valueClassName || 'text-(--sub-c-090b0c) dark:text-white'}`}>
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
	onManage,
	onCancel,
	isManageLoading,
	isCancelLoading
}: SubscriptionCardProps) {
	const manageLabel = provider === 'stripe' ? 'Manage on Stripe' : 'Manage on LlamaPay'

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-4 rounded-2xl border border-(--sub-c-ced8e6) bg-white p-4 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
			<div className="flex items-center gap-2">
				<Icon name="receipt" height={28} width={28} className="text-(--sub-c-090b0c) dark:text-white" />
				<span className="text-base font-medium leading-5 text-(--sub-c-090b0c) dark:text-white">
					Subscription
				</span>
			</div>

			<div className="flex flex-col gap-3">
				<InfoRow
					label="Current plan"
					value={planName}
					valueClassName="bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-6e9ddf) dark:from-(--sub-c-4b86db) dark:to-(--sub-c-a5c3ed) bg-clip-text text-transparent"
				/>
				<InfoRow label="Renewal Date" value={renewalDate} />
				<InfoRow label="Subscription Type" value={subscriptionType} />
				<InfoRow label="Payment Provider" value={subscriptionPayment} />
			</div>

			<div className="flex gap-2">
				<button
					onClick={onManage}
					disabled={isManageLoading}
					className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-(--sub-c-dedede) px-3 text-xs font-medium text-(--sub-c-090b0c) disabled:opacity-50 dark:border-(--sub-c-2f3336) dark:text-white"
				>
					{isManageLoading ? 'Loading...' : manageLabel}
					{!isManageLoading && <Icon name="circle-external-link" height={16} width={16} className="shrink-0" />}
				</button>
				<button
					onClick={onCancel}
					disabled={isCancelLoading}
					className="flex h-8 items-center whitespace-nowrap rounded-lg border border-(--sub-c-dedede) px-3 text-xs font-medium text-(--sub-c-090b0c) disabled:opacity-50 dark:border-(--sub-c-2f3336) dark:text-white"
				>
					{isCancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
				</button>
			</div>
		</div>
	)
}
