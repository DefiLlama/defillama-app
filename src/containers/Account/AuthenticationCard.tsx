import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscription/auth'
import { VerifyEmailDialog } from '~/containers/Subscription/VerifyEmailDialog'
import { EmailChangeModal } from './EmailChangeModal'
import { PasswordResetModal } from './PasswordResetModal'
import { SwitchToEmailModal } from './SwitchToEmailModal'
import { isWalletEmail, truncateAddress } from './utils'

export function AuthenticationCard() {
	const { user, resetPasswordMutation, loaders } = useAuthContext()

	const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
	const [isSwitchToEmailModalOpen, setIsSwitchToEmailModalOpen] = useState(false)
	const [isVerifyEmailModalOpen, setIsVerifyEmailModalOpen] = useState(false)
	const [passwordCooldownMsg, setPasswordCooldownMsg] = useState('')
	const passwordResetSentAt = useRef(0)
	const PASSWORD_COOLDOWN_MS = 60_000

	const walletEmail = isWalletEmail(user?.email)
	const isEmailUnverified = !walletEmail && user?.verified === false
	const walletAddress = user?.walletAddress
	const walletDisplayName = walletAddress ? truncateAddress(walletAddress) : ''

	const handleChangeEmail = () => {
		setIsEmailModalOpen(true)
	}

	const handleChangePassword = () => {
		if (!user?.email) return
		const elapsed = Date.now() - passwordResetSentAt.current
		if (elapsed < PASSWORD_COOLDOWN_MS) {
			const secondsLeft = Math.ceil((PASSWORD_COOLDOWN_MS - elapsed) / 1000)
			toast.error(`Please wait ${secondsLeft}s before requesting another reset.`)
			setIsPasswordModalOpen(true)
			return
		}
		setPasswordCooldownMsg('')
		setIsPasswordModalOpen(true)
		resetPasswordMutation.mutate(user.email, {
			onSuccess: () => {
				passwordResetSentAt.current = Date.now()
			}
		})
	}

	const handleResendPasswordReset = () => {
		if (!user?.email) return
		const elapsed = Date.now() - passwordResetSentAt.current
		if (elapsed < PASSWORD_COOLDOWN_MS) {
			const secondsLeft = Math.ceil((PASSWORD_COOLDOWN_MS - elapsed) / 1000)
			setPasswordCooldownMsg(`Please wait ${secondsLeft}s before resending.`)
			return
		}
		setPasswordCooldownMsg('')
		resetPasswordMutation.mutate(user.email, {
			onSuccess: () => {
				passwordResetSentAt.current = Date.now()
			}
		})
	}

	const handleVerifyEmail = () => {
		if (!user?.email) return
		setIsVerifyEmailModalOpen(true)
	}

	return (
		<>
			<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				<div className="flex items-center gap-2">
					<Icon name="key-filled" height={28} width={28} className="text-(--sub-ink-primary) dark:text-white" />
					<span className="text-base font-medium text-(--sub-ink-primary) dark:text-white">Authentication</span>
				</div>

				<p className="text-xs leading-4 text-(--sub-text-muted)">Manage your authentication methods.</p>

				{walletEmail ? (
					<>
						<div className="flex items-center gap-3">
							<div className="flex items-center rounded-full bg-(--sub-surface-panel) p-2 dark:bg-(--sub-ink-primary)">
								<Icon name="wallet" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-sm text-(--sub-ink-primary) dark:text-white">{walletDisplayName}</span>
								<span className="text-xs text-(--sub-text-muted)">Wallet Address</span>
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between">
								<span className="text-sm text-(--sub-ink-primary) dark:text-white">Enable Email Auth</span>
								<button
									onClick={() => setIsSwitchToEmailModalOpen(true)}
									className="flex h-8 items-center rounded-lg border border-(--sub-border-muted) px-3 text-xs font-medium text-(--sub-ink-primary) disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
								>
									Enable Email Auth
								</button>
							</div>
							<p className="text-xs leading-4 text-(--sub-text-muted)">
								Add email &amp; password as another way to log in to your account.
							</p>
						</div>
					</>
				) : (
					<>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<div className="flex items-center rounded-full bg-(--sub-surface-panel) p-2 dark:bg-(--sub-ink-primary)">
									<Icon
										name="mail-rounded"
										height={20}
										width={20}
										className="text-(--sub-ink-primary) dark:text-white"
									/>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-(--sub-ink-primary) dark:text-white">{user?.email}</span>
									<span className="text-xs text-(--sub-text-muted)">Email & Password</span>
								</div>
							</div>
							<div className="flex gap-2">
								<button
									onClick={handleChangeEmail}
									disabled={loaders.changeEmail}
									className="flex h-8 items-center rounded-lg border border-(--sub-border-muted) px-3 text-xs font-medium text-(--sub-ink-primary) disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
								>
									Change Email
								</button>
								<button
									onClick={handleChangePassword}
									disabled={resetPasswordMutation.isPending}
									className="flex h-8 items-center rounded-lg border border-(--sub-border-muted) px-3 text-xs font-medium text-(--sub-ink-primary) disabled:opacity-50 dark:border-(--sub-border-strong) dark:text-white"
								>
									Change Password
								</button>
							</div>
						</div>

						{user?.walletAddress && (
							<div className="flex items-center gap-3">
								<div className="flex items-center rounded-full bg-(--sub-surface-panel) p-2 dark:bg-(--sub-ink-primary)">
									<Icon name="wallet" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-(--sub-ink-primary) dark:text-white">
										{truncateAddress(user.walletAddress)}
									</span>
									<span className="text-xs text-(--sub-text-muted)">Wallet Address</span>
								</div>
							</div>
						)}
					</>
				)}

				{isEmailUnverified && (
					<div className="flex items-center justify-between rounded-xl border border-sub-warning-border-light bg-sub-warning-bg/10 p-4 dark:border-sub-warning-border-dark">
						<div className="flex items-center gap-2">
							<Icon
								name="alert-warning"
								height={28}
								width={28}
								className="shrink-0 text-sub-warning-text-light dark:text-sub-warning-text-dark"
							/>
							<p className="text-xs leading-4 text-sub-warning-text-light dark:text-sub-warning-text-dark">
								Your email is not verified. Enter the verification code sent to your email.
							</p>
						</div>
						<button
							onClick={handleVerifyEmail}
							className="flex h-8 shrink-0 items-center rounded-lg border border-sub-warning-border-light px-3 text-xs font-medium whitespace-nowrap text-sub-warning-text-light disabled:opacity-50 dark:border-sub-warning-border-dark dark:text-sub-warning-text-dark"
						>
							Verify email
						</button>
					</div>
				)}
			</div>

			<PasswordResetModal
				isOpen={isPasswordModalOpen}
				onClose={() => setIsPasswordModalOpen(false)}
				email={user?.email ?? ''}
				onResend={handleResendPasswordReset}
				isPending={resetPasswordMutation.isPending}
				cooldownMessage={passwordCooldownMsg}
			/>

			<EmailChangeModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} />

			<SwitchToEmailModal
				isOpen={isSwitchToEmailModalOpen}
				onClose={() => setIsSwitchToEmailModalOpen(false)}
				defaultEmail={user?.ethereum_email}
			/>

			<VerifyEmailDialog
				isOpen={isVerifyEmailModalOpen}
				email={user?.email ?? undefined}
				onClose={() => setIsVerifyEmailModalOpen(false)}
			/>
		</>
	)
}
