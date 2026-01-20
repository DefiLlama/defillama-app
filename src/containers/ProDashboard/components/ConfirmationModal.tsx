import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface ConfirmationModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	title?: string
	message?: string
	confirmText?: string
	cancelText?: string
	confirmButtonClass?: string
}

export function ConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	title = 'Confirm Action',
	message = 'Are you sure you want to proceed with this action?',
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	confirmButtonClass = 'bg-red-500 hover:bg-red-600 text-white'
}: ConfirmationModalProps) {
	return (
		<Ariakit.DialogProvider
			open={isOpen}
			setOpen={(open) => {
				if (!open) onClose()
			}}
		>
			<Ariakit.Dialog
				className="dialog w-full max-w-sm gap-0 border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div className="mb-6 flex items-center justify-between">
					<h2 className="text-xl font-semibold pro-text1">{title}</h2>
					<Ariakit.DialogDismiss
						className="rounded-md pro-hover-bg p-1 pro-text1 transition-colors"
						aria-label="Close modal"
					>
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
				</div>

				<p className="mb-6 pro-text2">{message}</p>

				<div className="flex justify-end gap-3">
					<Ariakit.DialogDismiss className="rounded-md border pro-border pro-hover-bg px-4 py-2 text-sm pro-text2 transition-colors hover:pro-text1">
						{cancelText}
					</Ariakit.DialogDismiss>
					<button
						onClick={() => {
							onConfirm()
							onClose()
						}}
						className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${confirmButtonClass}`}
					>
						{confirmText}
					</button>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
