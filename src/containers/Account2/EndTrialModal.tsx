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
			<div className="flex w-full max-w-[380px] flex-col gap-5 rounded-2xl border border-(--sub-c-ced8e6) bg-white px-5 py-6 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h3 className="text-xl leading-7 font-semibold text-(--sub-c-090b0c) dark:text-white">
						Upgrade to Full Access
					</h3>
					<button
						onClick={onClose}
						disabled={isLoading}
						className="rounded-full p-1 text-(--sub-c-090b0c) transition-colors disabled:opacity-50 dark:text-white"
					>
						<Icon name="x" height={24} width={24} />
					</button>
				</div>

				{/* Warning */}
				<div className="flex items-start gap-2 rounded-xl border border-sub-warning-border-light bg-sub-warning-bg/10 p-3 dark:border-sub-warning-border-dark">
					<Icon name="alert-warning" height={20} width={20} className="text-sub-warning-text mt-0.5 shrink-0" />
					<div className="flex flex-col gap-1">
						<p className="text-sub-warning-text text-xs font-semibold">This is NOT a subscription cancellation</p>
						<p className="text-xs leading-4 text-(--sub-c-878787)">
							By proceeding, you will end your free trial early and convert to a paid subscription immediately. You'll
							be charged the full amount ($49/month).
						</p>
					</div>
				</div>

				{/* Benefits */}
				<div className="flex flex-col gap-2">
					<p className="text-xs text-(--sub-c-878787)">Benefits of converting now:</p>
					<ul className="flex flex-col gap-1.5">
						{BENEFITS.map((b) => (
							<li key={b} className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="shrink-0 text-(--sub-c-1f67d2)" />
								<span className="text-xs text-(--sub-c-090b0c) dark:text-white">{b}</span>
							</li>
						))}
					</ul>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-2">
					<button
						onClick={onConfirm}
						disabled={isLoading}
						className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-c-1f67d2) text-sm font-medium text-white disabled:opacity-50"
					>
						{isLoading ? 'Processing...' : 'Confirm & Upgrade Now'}
					</button>
					<button
						onClick={onClose}
						disabled={isLoading}
						className="flex h-10 w-full items-center justify-center rounded-lg border border-(--sub-c-dedede) text-sm text-(--sub-c-878787) disabled:opacity-50 dark:border-(--sub-c-2f3336)"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	)
}
