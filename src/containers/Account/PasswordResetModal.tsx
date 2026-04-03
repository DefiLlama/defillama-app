import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface PasswordResetModalProps {
	isOpen: boolean
	onClose: () => void
	email: string
	onResend: () => void
	isPending: boolean
	cooldownMessage: string
}

export function PasswordResetModal({
	isOpen,
	onClose,
	email,
	onResend,
	isPending,
	cooldownMessage
}: PasswordResetModalProps) {
	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[331px]"
				portal
				unmountOnHide
			>
				<div className="flex flex-col gap-5 px-5 py-6">
					{/* Header */}
					<div className="flex items-center justify-between">
						<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) dark:text-white">
							Change Password
						</h3>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-ink-primary) transition-colors dark:text-white">
							<Icon name="x" height={24} width={24} />
						</Ariakit.DialogDismiss>
					</div>

					{/* Body */}
					<div className="flex flex-col gap-8">
						<div className="text-sm leading-[21px] text-(--sub-ink-primary) dark:text-white">
							<p className="mb-3.5">We sent a reset password link to {email}.</p>
							<p>Tap it to change your password.</p>
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-1 text-sm leading-[21px]">
								<span className="text-(--sub-ink-primary) dark:text-white">Didn't receive it?</span>
								<button
									onClick={onResend}
									disabled={isPending}
									className="text-(--sub-brand-secondary) underline disabled:opacity-50"
								>
									Resend email
								</button>
							</div>
							{cooldownMessage && <p className="text-xs text-(--sub-orange-400)">{cooldownMessage}</p>}
						</div>
					</div>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
