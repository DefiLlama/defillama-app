import { useEffect, useRef, useState } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'
import type { FormSubmitEvent } from '~/types/forms'

const inputCls =
	'h-10 w-full rounded-lg border border-(--form-control-border) bg-(--signin-input-bg) px-3 text-center text-base tracking-[0.4em] text-(--text-primary) placeholder:text-(--text-tertiary) placeholder:tracking-normal focus:border-(--primary) focus:outline-none'
const primaryBtnCls =
	'h-10 w-full rounded-lg bg-(--primary) text-sm font-medium text-white disabled:bg-(--signin-btn-disabled-bg) disabled:text-(--signin-btn-disabled-text)'

const RESEND_COOLDOWN_MS = 30_000

export function EmailOtpForm({
	email,
	autoSend = true,
	onVerified,
	dismissLabel = 'Cancel',
	onDismiss
}: {
	email?: string
	autoSend?: boolean
	onVerified?: () => void
	dismissLabel?: string
	onDismiss?: () => void
}) {
	const { sendOtp, verifyOtp, loaders } = useAuthContext()
	const [otp, setOtp] = useState('')
	const [error, setError] = useState('')
	const [cooldownLeft, setCooldownLeft] = useState(0)
	const autoSentRef = useRef(false)

	useEffect(() => {
		if (!autoSend || autoSentRef.current) return
		autoSentRef.current = true
		sendOtp()
			.then(() => setCooldownLeft(RESEND_COOLDOWN_MS))
			.catch(() => {})
	}, [autoSend, sendOtp])

	useEffect(() => {
		if (cooldownLeft <= 0) return
		const id = window.setInterval(() => {
			setCooldownLeft((prev) => Math.max(0, prev - 1000))
		}, 1000)
		return () => window.clearInterval(id)
	}, [cooldownLeft])

	const handleSubmit = async (e: FormSubmitEvent) => {
		e.preventDefault()
		setError('')
		const trimmed = otp.trim()
		if (!/^\d{6}$/.test(trimmed)) {
			setError('Enter the 6-digit code')
			return
		}
		try {
			await verifyOtp(trimmed)
			onVerified?.()
		} catch (err: any) {
			setError(err?.message || 'Invalid or expired code')
		}
	}

	const handleResend = async () => {
		if (cooldownLeft > 0 || loaders.sendOtp) return
		setError('')
		try {
			await sendOtp()
			setCooldownLeft(RESEND_COOLDOWN_MS)
		} catch {
			// toast surfaces error
		}
	}

	const cooldownSeconds = Math.ceil(cooldownLeft / 1000)

	return (
		<form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
			{email ? (
				<p className="text-sm leading-5 text-(--text-meta)">
					We sent a 6-digit code to <span className="text-(--text-primary)">{email}</span>. Enter it below to verify
					your email.
				</p>
			) : (
				<p className="text-sm leading-5 text-(--text-meta)">
					Enter the 6-digit code we sent to your email to verify your address.
				</p>
			)}

			<label>
				<span className="sr-only">Verification code</span>
				<input
					type="text"
					inputMode="numeric"
					autoComplete="one-time-code"
					maxLength={6}
					required
					placeholder="000000"
					className={inputCls}
					value={otp}
					onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
					autoFocus
				/>
			</label>

			<button type="submit" disabled={loaders.verifyOtp || otp.length !== 6} className={primaryBtnCls}>
				{loaders.verifyOtp ? 'Verifying...' : 'Verify email'}
			</button>

			{error ? <p className="text-center text-xs text-(--error)">{error}</p> : null}

			<button
				type="button"
				className="text-center text-xs text-(--link) underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-(--text-tertiary) disabled:no-underline"
				onClick={() => void handleResend()}
				disabled={cooldownLeft > 0 || loaders.sendOtp}
			>
				{loaders.sendOtp ? 'Sending...' : cooldownLeft > 0 ? `Resend code (${cooldownSeconds}s)` : 'Resend code'}
			</button>

			{onDismiss ? (
				<button type="button" className="text-center text-sm text-(--link)" onClick={onDismiss}>
					{dismissLabel}
				</button>
			) : null}
		</form>
	)
}
