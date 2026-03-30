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
	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="flex w-full max-w-[331px] flex-col gap-5 rounded-2xl border border-(--sub-c-ced8e6) bg-white px-5 py-6 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h3 className="text-xl leading-7 font-semibold text-(--sub-c-090b0c) dark:text-white">Change Password</h3>
					<button
						onClick={onClose}
						className="rounded-full p-1 text-(--sub-c-090b0c) transition-colors dark:text-white"
					>
						<Icon name="x" height={24} width={24} />
					</button>
				</div>

				{/* Body */}
				<div className="flex flex-col gap-8">
					<div className="text-sm leading-[21px] text-(--sub-c-090b0c) dark:text-white">
						<p className="mb-3.5">We sent a reset password link to {email}.</p>
						<p>Tap it to change your password.</p>
					</div>

					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-1 text-sm leading-[21px]">
							<span className="text-(--sub-c-090b0c) dark:text-white">Didn't receive it?</span>
							<button
								onClick={onResend}
								disabled={isPending}
								className="text-(--sub-c-4b86db) underline disabled:opacity-50"
							>
								Resend email
							</button>
						</div>
						{cooldownMessage && <p className="text-xs text-(--sub-c-ffa455)">{cooldownMessage}</p>}
					</div>
				</div>
			</div>
		</div>
	)
}
