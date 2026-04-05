import { Icon } from '~/components/Icon'

interface ExternalDataBalanceCardProps {
	freeRemaining: string
	toppedUpBalance: string
	freeLimit: string
	freeSpent: string
	isLoading: boolean
	onTopUp: () => void
}

const formatUsd = (value: string) => `$${parseFloat(value).toFixed(2)}`

export function ExternalDataBalanceCard({
	freeRemaining,
	toppedUpBalance,
	freeLimit,
	freeSpent,
	isLoading,
	onTopUp
}: ExternalDataBalanceCardProps) {
	if (isLoading) {
		return (
			<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				<div className="flex items-center gap-2">
					<div className="h-7 w-7 animate-pulse rounded bg-(--sub-border-light) dark:bg-(--sub-border-strong)" />
					<div className="h-5 w-44 animate-pulse rounded bg-(--sub-border-light) dark:bg-(--sub-border-strong)" />
				</div>
				<div className="h-3 w-full animate-pulse rounded bg-(--sub-border-light) dark:bg-(--sub-border-strong)" />
				<div className="h-3 w-3/4 animate-pulse rounded bg-(--sub-border-light) dark:bg-(--sub-border-strong)" />
				<div className="h-8 w-20 animate-pulse rounded-lg bg-(--sub-border-light) dark:bg-(--sub-border-strong)" />
			</div>
		)
	}

	const freeSpentNum = parseFloat(freeSpent)
	const freeLimitNum = parseFloat(freeLimit)
	const totalAvailable = parseFloat(freeRemaining) + parseFloat(toppedUpBalance)
	const usagePercent = freeLimitNum > 0 ? Math.min(100, (freeSpentNum / freeLimitNum) * 100) : 0
	const isLowBalance = totalAvailable < 1

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Icon name="box" height={28} width={28} className="text-(--sub-ink-primary) dark:text-white" />
					<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">
						External Data Balance
					</span>
				</div>
				<button
					onClick={onTopUp}
					className="flex h-8 items-center gap-1 rounded-lg bg-(--sub-brand-primary) px-3 text-xs font-medium text-white"
				>
					<Icon name="plus" height={14} width={14} />
					Top Up
				</button>
			</div>

			<p className="text-xs leading-4 text-(--sub-text-muted)">
				Credits give LlamaAI access to premium data: onchain data, X profiles and posts, LinkedIn, and more. Pro
				Subscribers get $10 per month in credits.
			</p>

			{/* Balances */}
			<div className="flex flex-col gap-4 rounded-lg bg-(--sub-surface-panel) p-3 dark:bg-(--sub-ink-primary)">
				{/* Free This Month */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs text-(--sub-text-muted)">Free This Month</span>
						<span className="text-xs text-(--sub-ink-primary) dark:text-white">
							{formatUsd(freeRemaining)} <span className="text-(--sub-text-muted)">/ {formatUsd(freeLimit)}</span>
						</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-(--sub-border-light) dark:bg-white/[0.08]">
						<div
							className="h-full rounded-full bg-(--sub-brand-primary)"
							style={{ width: `${Math.max(1, usagePercent).toFixed(1)}%` }}
						/>
					</div>
					<div className="flex items-center justify-between text-[10px] text-(--sub-text-muted)">
						<span>{formatUsd(freeSpent)} used</span>
						<span>{usagePercent.toFixed(0)}% used</span>
					</div>
				</div>

				{/* Topped Up */}
				<div className="flex items-center justify-between">
					<span className="text-xs text-(--sub-text-muted)">Topped Up</span>
					<span className="text-xs font-medium text-(--sub-ink-primary) dark:text-white">
						{formatUsd(toppedUpBalance)}
					</span>
				</div>
			</div>

			{/* Total */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-(--sub-text-muted)">Total Available</span>
				<span
					className={`text-sm font-semibold ${isLowBalance ? 'text-(--sub-orange-400)' : 'text-(--sub-ink-primary) dark:text-white'}`}
				>
					${totalAvailable.toFixed(2)}
				</span>
			</div>
		</div>
	)
}
