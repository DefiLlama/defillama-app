import { Icon } from '~/components/Icon'

interface TrialSubscriptionCardProps {
	trialEndDate: string
	onCancel: () => void
	isCancelLoading: boolean
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

function formatShortDate(iso: string): string {
	const date = new Date(iso)
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getRemainingDays(iso: string): number {
	const now = new Date()
	const end = new Date(iso)
	const diff = end.getTime() - now.getTime()
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function TrialSubscriptionCard({ trialEndDate, onCancel, isCancelLoading }: TrialSubscriptionCardProps) {
	const remainingDays = getRemainingDays(trialEndDate)
	const formattedDate = formatShortDate(trialEndDate)

	return (
		<div className="flex min-w-0 flex-1 flex-col justify-between gap-4 rounded-2xl border border-(--sub-c-ced8e6) bg-white p-4 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
			<div className="flex items-center gap-2">
				<Icon name="receipt" height={28} width={28} className="text-(--sub-c-090b0c) dark:text-white" />
				<span className="text-base font-medium leading-5 text-(--sub-c-090b0c) dark:text-white">Subscription</span>
			</div>

			<div className="flex flex-col gap-3">
				<InfoRow
					label="Current plan"
					value="Active Free Trial"
					valueClassName="bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-6e9ddf) dark:from-(--sub-c-4b86db) dark:to-(--sub-c-a5c3ed) bg-clip-text text-transparent"
				/>
				<InfoRow label="Remaining Days" value={`${remainingDays} Days`} />
			</div>

			<p className="text-xs leading-4 text-(--sub-c-878787)">
				Your trial ends on{' '}
				<span className="font-bold text-(--sub-c-090b0c) dark:text-white">{formattedDate}</span>. You will be
				automatically charged{' '}
				<span className="font-bold text-(--sub-c-090b0c) dark:text-white">$49.00</span> unless you cancel before
				then.
			</p>

			<div className="flex gap-2">
				<button
					onClick={onCancel}
					disabled={isCancelLoading}
					className="flex h-8 items-center whitespace-nowrap rounded-lg border border-(--sub-c-dedede) px-3 text-xs font-medium text-(--sub-c-090b0c) disabled:opacity-50 dark:border-(--sub-c-2f3336) dark:text-white"
				>
					{isCancelLoading ? 'Cancelling...' : 'Cancel Free Trial'}
				</button>
			</div>
		</div>
	)
}
