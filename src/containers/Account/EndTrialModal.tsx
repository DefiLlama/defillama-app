import { Icon } from '~/components/Icon'

const BENEFITS = [
	'Full CSV download access',
	'5 deep research questions per day (instead of 3)',
	'All Pro features without limitations'
]

interface EndTrialModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	isLoading: boolean
}

export function EndTrialModal({ isOpen, onClose, onConfirm, isLoading }: EndTrialModalProps) {
	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
			onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
		>
			<div className="flex w-full max-w-[380px] flex-col gap-5 rounded-2xl border border-(--sub-border-slate-100) bg-white px-5 py-6 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) dark:text-white">
						Upgrade to Full Access
					</h3>
					<button
						onClick={onClose}
						disabled={isLoading}
						className="rounded-full p-1 text-(--sub-ink-primary) transition-colors disabled:opacity-50 dark:text-white"
					>
						<Icon name="x" height={24} width={24} />
					</button>
				</div>

				{/* Warning */}
				<div className="flex items-start gap-2 rounded-xl border border-sub-warning-border-light bg-sub-warning-bg/10 p-3 dark:border-sub-warning-border-dark">
					<Icon
						name="alert-warning"
						height={20}
						width={20}
						className="mt-0.5 shrink-0 text-sub-warning-text-light dark:text-sub-warning-text-dark"
					/>
					<div className="flex flex-col gap-1">
						<p className="text-xs font-semibold text-sub-warning-text-light dark:text-sub-warning-text-dark">
							This is NOT a subscription cancellation
						</p>
						<p className="text-xs leading-4 text-(--sub-text-muted)">
							By proceeding, you will end your free trial early and convert to a paid subscription immediately. You'll
							be charged the full amount ($49/month).
						</p>
					</div>
				</div>

				{/* Benefits */}
				<div className="flex flex-col gap-2">
					<p className="text-xs text-(--sub-text-muted)">Benefits of converting now:</p>
					<ul className="flex flex-col gap-1.5">
						{BENEFITS.map((b) => (
							<li key={b} className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="shrink-0 text-(--sub-brand-primary)" />
								<span className="text-xs text-(--sub-ink-primary) dark:text-white">{b}</span>
							</li>
						))}
					</ul>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-2">
					<button
						onClick={onConfirm}
						disabled={isLoading}
						className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-50"
					>
						{isLoading ? 'Processing...' : 'Confirm & Upgrade Now'}
					</button>
					<button
						onClick={onClose}
						disabled={isLoading}
						className="flex h-10 w-full items-center justify-center rounded-lg border border-(--sub-border-muted) text-sm text-(--sub-text-muted) disabled:opacity-50 dark:border-(--sub-border-strong)"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	)
}
