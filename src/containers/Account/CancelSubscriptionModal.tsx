import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface CancelSubscriptionModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: (message?: string) => Promise<any>
	isLoading: boolean
	variant?: 'trial' | 'subscription'
}

export function CancelSubscriptionModal({
	isOpen,
	onClose,
	onConfirm,
	isLoading,
	variant = 'trial'
}: CancelSubscriptionModalProps) {
	const isTrial = variant === 'trial'

	const handleClose = () => {
		if (isLoading) return
		onClose()
	}

	const handleConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
		if (isLoading) return
		e.preventDefault()
		const formData = new FormData(e.currentTarget)
		const message = ((formData.get('message') as string) ?? '').trim()
		try {
			await onConfirm(message || undefined)
		} catch {
			// error handled by mutation
		}
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && handleClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[380px]"
				portal
				unmountOnHide
			>
				<form onSubmit={handleConfirm} className="flex flex-col gap-5 px-5 py-6">
					{/* Header */}
					<div className="flex items-center justify-between">
						<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) dark:text-white">
							{isTrial ? 'Cancel Free Trial' : 'Cancel Subscription'}
						</h3>
						<Ariakit.DialogDismiss
							type="button"
							disabled={isLoading}
							className="rounded-full p-1 text-(--sub-ink-primary) transition-colors disabled:opacity-50 dark:text-white"
						>
							<Icon name="x" height={24} width={24} />
						</Ariakit.DialogDismiss>
					</div>

					{/* Body */}
					<p className="text-sm leading-[21px] text-(--sub-ink-primary) dark:text-white">
						{isTrial
							? "Your subscription will remain active until the end of your trial period. After that, it will not renew and you won't be charged."
							: 'Your subscription will remain active until the end of your current billing period. After that, it will not renew.'}
					</p>

					{/* Feedback */}
					<div className="flex flex-col gap-2">
						<label htmlFor="cancel-reason" className="text-xs font-medium text-(--sub-text-muted)">
							Reason for cancelling (optional)
						</label>
						<textarea
							id="cancel-reason"
							name="message"
							placeholder="Let us know why you're cancelling..."
							rows={3}
							className="w-full resize-none rounded-lg border border-(--sub-border-muted) bg-transparent p-3 text-sm text-(--sub-ink-primary) outline-none placeholder:text-(--sub-text-muted) focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:text-white"
						/>
					</div>

					{/* Actions */}
					<div className="flex flex-col gap-2">
						<button
							type="submit"
							disabled={isLoading}
							className="flex h-10 w-full items-center justify-center rounded-lg bg-(--error) text-sm font-medium text-white disabled:opacity-50"
						>
							{isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
						</button>
						<Ariakit.DialogDismiss
							type="button"
							disabled={isLoading}
							className="flex h-10 w-full items-center justify-center rounded-lg border border-(--sub-border-muted) text-sm text-(--sub-text-muted) disabled:opacity-50 dark:border-(--sub-border-strong)"
						>
							{isTrial ? 'Keep Trial' : 'Keep Subscription'}
						</Ariakit.DialogDismiss>
					</div>
				</form>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
