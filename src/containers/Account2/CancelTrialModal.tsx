import { useState } from 'react'
import { Icon } from '~/components/Icon'

interface CancelTrialModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: (message?: string) => Promise<any>
	isLoading: boolean
}

export function CancelTrialModal({ isOpen, onClose, onConfirm, isLoading }: CancelTrialModalProps) {
	const [message, setMessage] = useState('')

	if (!isOpen) return null

	const handleClose = () => {
		if (isLoading) return
		setMessage('')
		onClose()
	}

	const handleConfirm = async () => {
		try {
			await onConfirm(message || undefined)
			setMessage('')
		} catch {
			// error handled by mutation
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
			onClick={(e) => e.target === e.currentTarget && handleClose()}
		>
			<div className="flex w-full max-w-[380px] flex-col gap-5 rounded-2xl border border-(--sub-c-ced8e6) bg-white px-5 py-6 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-semibold leading-7 text-(--sub-c-090b0c) dark:text-white">
						Cancel Free Trial
					</h3>
					<button
						onClick={handleClose}
						disabled={isLoading}
						className="rounded-full p-1 text-(--sub-c-090b0c) transition-colors disabled:opacity-50 dark:text-white"
					>
						<Icon name="x" height={24} width={24} />
					</button>
				</div>

				{/* Body */}
				<p className="text-sm leading-[21px] text-(--sub-c-090b0c) dark:text-white">
					Your subscription will remain active until the end of your trial period. After that, it will not
					renew and you won't be charged.
				</p>

				{/* Feedback */}
				<div className="flex flex-col gap-2">
					<label
						htmlFor="cancel-reason"
						className="text-xs font-medium text-(--sub-c-878787)"
					>
						Reason for cancelling (optional)
					</label>
					<textarea
						id="cancel-reason"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Let us know why you're cancelling..."
						rows={3}
						className="w-full resize-none rounded-lg border border-(--sub-c-dedede) bg-transparent p-3 text-sm text-(--sub-c-090b0c) placeholder:text-(--sub-c-878787) outline-none focus:border-(--sub-c-1f67d2) dark:border-(--sub-c-2f3336) dark:text-white"
					/>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-2">
					<button
						onClick={() => void handleConfirm()}
						disabled={isLoading}
						className="flex h-10 w-full items-center justify-center rounded-lg bg-(--error) text-sm font-medium text-white disabled:opacity-50"
					>
						{isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
					</button>
					<button
						onClick={handleClose}
						disabled={isLoading}
						className="flex h-10 w-full items-center justify-center rounded-lg border border-(--sub-c-dedede) text-sm text-(--sub-c-878787) disabled:opacity-50 dark:border-(--sub-c-2f3336)"
					>
						Keep Trial
					</button>
				</div>
			</div>
		</div>
	)
}
