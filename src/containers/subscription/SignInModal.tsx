import * as Ariakit from '@ariakit/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Turnstile } from '~/components/Turnstile'
import { type PromotionalEmailsValue, useAuthContext } from '~/containers/Subscription/auth'
import { WalletProvider } from '~/layout/WalletProvider'
import type { FormSubmitEvent } from '~/types/forms'

type Step = 'signin' | 'signup' | 'forgot'

/* ── Shared styles ─────────────────────────────────────────────────── */

const inputCls =
	'h-10 w-full rounded-lg border border-(--form-control-border) bg-(--signin-input-bg) px-3 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--primary) focus:outline-none'
const primaryBtnCls =
	'h-10 w-full rounded-lg bg-(--primary) text-sm font-medium text-white disabled:bg-(--signin-btn-disabled-bg) disabled:text-(--signin-btn-disabled-text)'
const outlineBtnCls =
	'flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-(--form-control-border) text-sm font-medium text-(--text-primary) transition-colors hover:bg-(--signin-outline-hover-bg)'
const signInDialogCls =
	'dialog top-1/2 right-auto bottom-auto left-1/2 m-0 max-h-[90dvh] min-h-0 w-[calc(100vw-32px)] max-w-[331px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-(--signin-bg) px-5 pt-6 pb-5 shadow-2xl max-sm:max-h-[calc(100dvh-48px)] max-sm:rounded-[20px] max-sm:px-4 max-sm:pt-5 max-sm:pb-6'

/* ── Modal entry point ─────────────────────────────────────────────── */

function SignInDialog({ store }: { store: Ariakit.DialogStore }) {
	return (
		<Ariakit.Dialog store={store} className={signInDialogCls} unmountOnHide>
			<WalletProvider>
				<SignInFlow dialogStore={store} />
			</WalletProvider>
		</Ariakit.Dialog>
	)
}

export function SignInModal({
	text,
	className,
	hideWhenAuthenticated = true,
	store
}: {
	text?: string
	className?: string
	hideWhenAuthenticated?: boolean
	store?: Ariakit.DialogStore
}) {
	const localDialogStore = Ariakit.useDialogStore()
	const dialogStore = store ?? localDialogStore
	const { isAuthenticated, loaders } = useAuthContext()
	const shouldRenderTrigger = text !== undefined || className !== undefined

	if (loaders.userLoading) return null
	if (hideWhenAuthenticated && isAuthenticated) return null

	return (
		<>
			{shouldRenderTrigger ? (
				<button type="button" className={className} onClick={dialogStore.show} suppressHydrationWarning>
					{text ?? 'Sign In'}
				</button>
			) : null}
			<SignInDialog store={dialogStore} />
		</>
	)
}

/* ── Multi-step flow ───────────────────────────────────────────────── */

export function SignInFlow({ dialogStore }: { dialogStore: Ariakit.DialogStore }) {
	const [step, setStep] = useState<Step>('signin')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [promotionalEmails, setPromotionalEmails] = useState<PromotionalEmailsValue>('on')
	const [error, setError] = useState('')
	const [turnstileToken, setTurnstileToken] = useState('')
	const [acceptedTerms, setAcceptedTerms] = useState(false)

	const { login, signup, signInWithEthereumMutation, signInWithGithubMutation, resetPasswordMutation, loaders } =
		useAuthContext()
	const { openConnectModal } = useConnectModal()
	const { address } = useAccount()
	const { signMessageAsync } = useSignMessage()

	const goTo = (next: Step) => {
		setError('')
		setPassword('')
		setConfirmPassword('')
		setShowPassword(false)
		setStep(next)
	}

	const handleSignIn = async (e: FormSubmitEvent) => {
		e.preventDefault()
		setError('')
		try {
			await login(email, password)
			dialogStore.hide()
		} catch {
			setError('Invalid email or password')
		}
	}

	const handleSignUp = async (e: FormSubmitEvent) => {
		e.preventDefault()
		setError('')
		if (password.length < 8) {
			setError('Password must be at least 8 characters')
			return
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match')
			return
		}
		if (!turnstileToken) return
		try {
			await signup(email, password, confirmPassword, turnstileToken, promotionalEmails)
			setTurnstileToken('')
			dialogStore.hide()
		} catch (err: any) {
			if (typeof err?.error === 'string') {
				setError(err.error)
			} else if (err?.error) {
				const messages: string[] = []
				if (err.error.email?.message) messages.push(err.error.email.message)
				if (err.error.password?.message) messages.push(err.error.password.message)
				if (err.error.passwordConfirm?.message) messages.push(err.error.passwordConfirm.message)
				setError(messages.length > 0 ? messages.join('. ') : 'Failed to create account')
			} else {
				setError('Failed to create account')
			}
		}
	}

	const handleForgotPassword = async (e: FormSubmitEvent) => {
		e.preventDefault()
		setError('')
		try {
			await resetPasswordMutation.mutateAsync(email)
			goTo('signin')
		} catch {
			setError('Failed to send reset email')
		}
	}

	const handleWalletSignIn = async () => {
		if (address) {
			try {
				await signInWithEthereumMutation.mutateAsync({ address, signMessageFunction: signMessageAsync })
				dialogStore.hide()
			} catch {
				setError('Failed to sign in with wallet')
			}
		} else {
			openConnectModal?.()
		}
	}

	const handleGithubSignIn = () => {
		void signInWithGithubMutation.mutateAsync().then(() => dialogStore.hide())
	}

	/* ── Header ── */
	const header = (
		<div className="mb-5 flex items-center justify-between">
			<div className="flex items-center gap-2">
				<img src="/assets/logo_white.webp" alt="" className="h-7 w-7" />
				<span className="text-sm font-semibold text-(--text-primary)">DefiLlama</span>
			</div>
			<Ariakit.DialogDismiss className="rounded-full p-1 text-(--text-tertiary) transition-colors hover:text-(--text-primary)">
				<Icon name="x" height={20} width={20} />
				<span className="sr-only">Close</span>
			</Ariakit.DialogDismiss>
		</div>
	)

	const errorEl = error ? <p className="text-center text-xs text-(--error)">{error}</p> : null

	const tabs = step !== 'forgot' && (
		<div className="mb-6 flex gap-1 rounded-lg bg-(--signin-tab-bg) p-1">
			<button
				type="button"
				className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${step === 'signin' ? 'bg-(--signin-bg) text-(--text-primary) shadow-sm' : 'text-(--text-tertiary) hover:text-(--text-primary)'}`}
				onClick={() => goTo('signin')}
			>
				Sign In
			</button>
			<button
				type="button"
				className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${step === 'signup' ? 'bg-(--signin-bg) text-(--text-primary) shadow-sm' : 'text-(--text-tertiary) hover:text-(--text-primary)'}`}
				onClick={() => goTo('signup')}
			>
				Sign Up
			</button>
		</div>
	)

	/* ── Sign In (default) ── */
	if (step === 'signin') {
		return (
			<>
				{header}
				{tabs}

				<form className="flex flex-col gap-4" onSubmit={(e) => void handleSignIn(e)}>
					<input
						type="email"
						required
						placeholder="Enter your email address"
						className={inputCls}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoFocus
					/>
					<div className="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							required
							placeholder="Enter your password"
							className={`${inputCls} pr-10`}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						<button
							type="button"
							className="absolute top-1/2 right-3 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary)"
							onClick={() => setShowPassword(!showPassword)}
							tabIndex={-1}
						>
							<Icon name={showPassword ? 'eye-off' : 'eye'} height={16} width={16} />
						</button>
					</div>
					<button type="submit" disabled={loaders.login || !email || !password} className={primaryBtnCls}>
						{loaders.login ? 'Signing in...' : 'Sign In'}
					</button>
					{errorEl}
				</form>

				<p className="mt-4 text-center text-sm text-(--text-primary)">
					Forgot your password?{' '}
					<button type="button" className="text-(--link)" onClick={() => goTo('forgot')}>
						Reset password
					</button>
				</p>

				<div className="my-6 flex items-center gap-5">
					<div className="h-px flex-1 bg-(--signin-divider)" />
					<span className="text-sm text-(--text-tertiary)">Or</span>
					<div className="h-px flex-1 bg-(--signin-divider)" />
				</div>

				<button
					type="button"
					className={outlineBtnCls}
					onClick={handleGithubSignIn}
					disabled={signInWithGithubMutation.isPending}
				>
					<Icon name="github" height={20} width={20} />
					{signInWithGithubMutation.isPending ? 'Connecting...' : 'Continue with GitHub'}
				</button>

				<p className="mt-6 text-center text-xs text-(--text-primary)">
					Registered with a wallet before?{' '}
					<button type="button" className="text-(--link)" onClick={() => void handleWalletSignIn()}>
						Sign-in here
					</button>
				</p>
			</>
		)
	}

	/* ── Sign Up ── */
	if (step === 'signup') {
		return (
			<>
				{header}
				{tabs}
				<p className="mb-4 text-sm leading-5 text-(--text-meta)">
					Create an account with a password (must have at least 8 characters):
				</p>

				<form className="flex flex-col gap-4" onSubmit={(e) => void handleSignUp(e)}>
					<input
						type="email"
						required
						placeholder="Enter your email address"
						className={inputCls}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoFocus
					/>
					<div className="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							required
							placeholder="Create a password"
							className={`${inputCls} pr-10`}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						<button
							type="button"
							className="absolute top-1/2 right-3 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary)"
							onClick={() => setShowPassword(!showPassword)}
							tabIndex={-1}
						>
							<Icon name={showPassword ? 'eye-off' : 'eye'} height={16} width={16} />
						</button>
					</div>
					<input
						type={showPassword ? 'text' : 'password'}
						required
						placeholder="Confirm password"
						className={inputCls}
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>

					<Turnstile
						onVerify={(token) => setTurnstileToken(token)}
						onError={() => setTurnstileToken('')}
						onExpire={() => setTurnstileToken('')}
						className="flex justify-center"
					/>

					<label className="flex items-start gap-2">
						<input
							type="checkbox"
							className="mt-0.5 h-4 w-4 shrink-0 rounded accent-(--primary)"
							checked={acceptedTerms}
							onChange={(e) => setAcceptedTerms(e.target.checked)}
						/>
						<span className="text-xs leading-4 text-(--text-meta)">
							I agree to the{' '}
							<BasicLink href="/terms" target="_blank" className="text-(--link) underline">
								Terms of Service
							</BasicLink>{' '}
							and{' '}
							<BasicLink href="/privacy-policy" target="_blank" className="text-(--link) underline">
								Privacy Policy
							</BasicLink>
						</span>
					</label>

					<label className="flex items-start gap-2">
						<input
							type="checkbox"
							className="mt-0.5 h-4 w-4 shrink-0 rounded accent-(--primary)"
							checked={promotionalEmails !== 'off'}
							onChange={(e) => setPromotionalEmails(e.target.checked ? 'on' : 'off')}
						/>
						<span className="text-xs leading-4 text-(--text-meta)">
							Receive emails about upcoming DefiLlama products and new releases
						</span>
					</label>

					<button
						type="submit"
						disabled={loaders.signup || !turnstileToken || !acceptedTerms}
						className={primaryBtnCls}
					>
						{loaders.signup ? 'Creating account...' : 'Create Account'}
					</button>
					{errorEl}
				</form>
			</>
		)
	}

	/* ── Forgot password ── */
	return (
		<>
			{header}
			<h2 className="text-xl font-semibold text-(--text-primary)">Reset Password</h2>
			<p className="mt-1 mb-6 text-sm text-(--text-meta)">Enter your email and we&apos;ll send you a reset link.</p>

			<form className="flex flex-col gap-4" onSubmit={(e) => void handleForgotPassword(e)}>
				<input
					type="email"
					required
					placeholder="Enter your email address"
					className={inputCls}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					autoFocus
				/>
				<button type="submit" disabled={resetPasswordMutation.isPending || !email} className={primaryBtnCls}>
					{resetPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
				</button>
				{errorEl}
			</form>

			<button type="button" className="mt-6 w-full text-center text-sm text-(--link)" onClick={() => goTo('signin')}>
				Back to sign in
			</button>
		</>
	)
}
