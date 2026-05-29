import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface ConfirmActionModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	isLoading: boolean
	title: string
	description: string
	confirmLabel: string
	confirmVariant?: 'danger' | 'primary'
}

export function ConfirmActionModal({
	isOpen,
	onClose,
	onConfirm,
	isLoading,
	title,
	description,
	confirmLabel,
	confirmVariant = 'primary'
}: ConfirmActionModalProps) {
	const isDanger = confirmVariant === 'danger'

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[380px]"
				portal
				unmountOnHide
			>
				<div className="flex flex-col gap-5 bg-white px-5 py-6 dark:bg-(--sub-surface-dark)">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold text-(--sub-ink-primary) dark:text-white">{title}</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-text-muted) transition-colors hover:text-(--sub-ink-primary) dark:hover:text-white">
							<Icon name="x" height={18} width={18} />
						</Ariakit.DialogDismiss>
					</div>
					<p className="text-sm text-(--sub-text-muted)">{description}</p>
					<div className="flex gap-3">
						<button
							onClick={onClose}
							className="flex h-9 flex-1 items-center justify-center rounded-lg border border-(--sub-border-muted) text-sm font-medium text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white"
						>
							Cancel
						</button>
						<button
							onClick={onConfirm}
							disabled={isLoading}
							className={`flex h-9 flex-1 items-center justify-center rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
								isDanger ? 'bg-(--error)' : 'bg-(--sub-brand-primary)'
							}`}
						>
							{isLoading ? 'Loading...' : confirmLabel}
						</button>
					</div>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
