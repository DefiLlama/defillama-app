import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { AUTH_SERVER } from '~/constants'
import pb from '~/utils/pocketbase'

interface SwitchToEmailModalProps {
	isOpen: boolean
	onClose: () => void
}

type Step = 'email' | 'confirm' | 'success'

export function SwitchToEmailModal({ isOpen, onClose }: SwitchToEmailModalProps) {
	const [step, setStep] = useState<Step>('email')
	const [email, setEmail] = useState('')
	const [otp, setOtp] = useState('')
	const [password, setPassword] = useState('')
	const [passwordConfirm, setPasswordConfirm] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

	const resetState = () => {
		setStep('email')
		setEmail('')
		setOtp('')
		setPassword('')
		setPasswordConfirm('')
		setError('')
		setIsLoading(false)
		setShowPassword(false)
		setShowPasswordConfirm(false)
	}

	const handleClose = () => {
		resetState()
		onClose()
	}

	const handleRequestOtp = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email || isLoading) return

		setError('')
		setIsLoading(true)

		try {
			const response = await fetch(`${AUTH_SERVER}/switch-to-email/request`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${pb.authStore.token}`
				},
				body: JSON.stringify({ email })
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => null)
				throw new Error(errorData?.error || errorData?.message || 'Failed to send verification code')
			}

			setStep('confirm')
		} catch (err: any) {
			setError(err.message || 'Failed to send verification code. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleConfirm = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!otp || !password || !passwordConfirm || isLoading) return

		if (password !== passwordConfirm) {
			setError('Passwords do not match.')
			return
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters.')
			return
		}

		setError('')
		setIsLoading(true)

		try {
			const response = await fetch(`${AUTH_SERVER}/switch-to-email/confirm`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${pb.authStore.token}`
				},
				body: JSON.stringify({ email, otp, password, passwordConfirm })
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => null)
				throw new Error(errorData?.error || errorData?.message || 'Failed to switch to email authentication')
			}

			const data = await response.json()

			if (data.token) {
				pb.authStore.save(data.token)
			}

			setStep('success')
		} catch (err: any) {
			setError(err.message || 'Failed to switch to email authentication. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleResendOtp = async () => {
		if (isLoading) return

		setError('')
		setIsLoading(true)

		try {
			const response = await fetch(`${AUTH_SERVER}/switch-to-email/request`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${pb.authStore.token}`
				},
				body: JSON.stringify({ email })
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => null)
				throw new Error(errorData?.error || errorData?.message || 'Failed to resend verification code')
			}

			toast.success('Verification code resent!')
		} catch (err: any) {
			setError(err.message || 'Failed to resend verification code.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleSuccessDone = () => {
		handleClose()
		// Refresh auth to pick up the new user state
		pb.collection('users')
			.authRefresh()
			.catch(() => {})
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && handleClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[380px]"
				portal
				unmountOnHide
			>
				{step === 'email' && (
					<div className="flex flex-col gap-5 px-5 py-6">
						<div className="flex items-center justify-between">
							<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) dark:text-white">
								Switch to Email
							</h3>
							<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-ink-primary) transition-colors dark:text-white">
								<Icon name="x" height={24} width={24} />
							</Ariakit.DialogDismiss>
						</div>

						<p className="text-sm leading-5 text-(--sub-text-muted)">
							Enter the email address you'd like to use for signing in. We'll send you a verification code.
						</p>

						{/* Form */}
						<form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
							<div className="flex flex-col gap-2">
								<label className="text-sm leading-[21px] text-(--sub-ink-primary) dark:text-white">Email</label>
								<input
									type="email"
									required
									value={email}
									onChange={(e) => {
										setEmail(e.target.value)
										if (error) setError('')
									}}
									placeholder="your.email@example.com"
									className={`h-10 w-full rounded-lg border bg-(--sub-surface-panel) px-3 text-sm leading-[21px] text-(--sub-ink-primary) outline-none dark:bg-(--sub-ink-primary) dark:text-white ${
										error
											? 'border-(--error)'
											: 'border-(--sub-border-muted) focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:focus:border-(--sub-brand-primary)'
									}`}
								/>
								{error && <p className="text-xs leading-4 text-(--error)">{error}</p>}
							</div>

							<button
								type="submit"
								disabled={!email || isLoading}
								className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-25"
							>
								{isLoading ? 'Sending...' : 'Send Verification Code'}
							</button>
						</form>
					</div>
				)}

				{step === 'confirm' && (
					<div className="flex flex-col gap-5 px-5 py-6">
						<div className="flex items-center justify-between">
							<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) dark:text-white">
								Verify & Set Password
							</h3>
							<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-ink-primary) transition-colors dark:text-white">
								<Icon name="x" height={24} width={24} />
							</Ariakit.DialogDismiss>
						</div>

						<p className="text-sm leading-5 text-(--sub-text-muted)">
							Enter the 6-digit code sent to{' '}
							<span className="font-medium text-(--sub-ink-primary) dark:text-white">{email}</span> and choose a
							password.
						</p>

						<form onSubmit={handleConfirm} className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<label className="text-sm leading-[21px] text-(--sub-ink-primary) dark:text-white">
									Verification Code
								</label>
								<input
									type="text"
									inputMode="numeric"
									maxLength={6}
									required
									value={otp}
									onChange={(e) => {
										const val = e.target.value.replace(/\D/g, '')
										setOtp(val)
										if (error) setError('')
									}}
									placeholder="000000"
									className={`h-10 w-full rounded-lg border bg-(--sub-surface-panel) px-3 text-sm leading-[21px] tracking-widest text-(--sub-ink-primary) outline-none dark:bg-(--sub-ink-primary) dark:text-white ${
										error
											? 'border-(--error)'
											: 'border-(--sub-border-muted) focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:focus:border-(--sub-brand-primary)'
									}`}
								/>
							</div>

							<div className="flex flex-col gap-2">
								<label className="text-sm leading-[21px] text-(--sub-ink-primary) dark:text-white">Password</label>
								<div className="relative">
									<input
										type={showPassword ? 'text' : 'password'}
										required
										value={password}
										onChange={(e) => {
											setPassword(e.target.value)
											if (error) setError('')
										}}
										placeholder="At least 8 characters"
										className={`h-10 w-full rounded-lg border bg-(--sub-surface-panel) pr-10 pl-3 text-sm leading-[21px] text-(--sub-ink-primary) outline-none dark:bg-(--sub-ink-primary) dark:text-white ${
											error
												? 'border-(--error)'
												: 'border-(--sub-border-muted) focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:focus:border-(--sub-brand-primary)'
										}`}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute top-1/2 right-3 -translate-y-1/2 text-(--sub-text-muted)"
									>
										<Icon name={showPassword ? 'eye-off' : 'eye'} height={16} width={16} />
									</button>
								</div>
							</div>

							{/* Confirm Password */}
							<div className="flex flex-col gap-2">
								<label className="text-sm leading-[21px] text-(--sub-ink-primary) dark:text-white">
									Confirm Password
								</label>
								<div className="relative">
									<input
										type={showPasswordConfirm ? 'text' : 'password'}
										required
										value={passwordConfirm}
										onChange={(e) => {
											setPasswordConfirm(e.target.value)
											if (error) setError('')
										}}
										placeholder="Re-enter your password"
										className={`h-10 w-full rounded-lg border bg-(--sub-surface-panel) pr-10 pl-3 text-sm leading-[21px] text-(--sub-ink-primary) outline-none dark:bg-(--sub-ink-primary) dark:text-white ${
											error
												? 'border-(--error)'
												: 'border-(--sub-border-muted) focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:focus:border-(--sub-brand-primary)'
										}`}
									/>
									<button
										type="button"
										onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
										className="absolute top-1/2 right-3 -translate-y-1/2 text-(--sub-text-muted)"
									>
										<Icon name={showPasswordConfirm ? 'eye-off' : 'eye'} height={16} width={16} />
									</button>
								</div>
							</div>

							{error && <p className="text-xs leading-4 text-(--error)">{error}</p>}

							<button
								type="submit"
								disabled={!otp || otp.length !== 6 || !password || !passwordConfirm || isLoading}
								className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-25"
							>
								{isLoading ? 'Switching...' : 'Complete Switch'}
							</button>

							<div className="flex items-center gap-1 text-sm leading-[21px]">
								<span className="text-(--sub-text-muted)">Didn't receive the code?</span>
								<button
									type="button"
									onClick={handleResendOtp}
									disabled={isLoading}
									className="text-(--sub-brand-secondary) underline disabled:opacity-50"
								>
									Resend
								</button>
							</div>
						</form>
					</div>
				)}

				{step === 'success' && (
					<div className="flex flex-col items-center gap-6 px-5 py-8">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--sub-brand-primary)/10">
							<Icon name="check" height={32} width={32} className="text-(--sub-brand-primary)" />
						</div>
						<div className="flex flex-col gap-2 text-center">
							<h2 className="text-xl font-semibold text-(--sub-ink-primary) dark:text-white">
								Switch Successful!
							</h2>
							<p className="text-sm text-(--sub-text-muted)">
								Your account now uses email authentication. You can sign in with{' '}
								<span className="font-medium text-(--sub-ink-primary) dark:text-white">{email}</span> and your
								password going forward.
							</p>
						</div>
						<button
							onClick={handleSuccessDone}
							className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white"
						>
							Done
						</button>
					</div>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
