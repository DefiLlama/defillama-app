import * as Ariakit from '@ariakit/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Turnstile } from '~/components/Turnstile'
import { type PromotionalEmailsValue, useAuthContext } from '~/containers/Subscribtion/auth'
import type { FormSubmitEvent } from '~/types/forms'

type Step = 'email' | 'signin' | 'signup' | 'forgot'

/* ── Shared styles ─────────────────────────────────────────────────── */

const inputCls =
	'h-10 w-full rounded-lg border border-white/12 bg-[#090b0c] px-3 text-sm text-white placeholder:text-[#878787] focus:border-[#1f67d2] focus:outline-none'
const primaryBtnCls = 'h-10 w-full rounded-lg bg-[#1f67d2] text-sm font-medium text-white disabled:opacity-40'
const outlineBtnCls =
	'flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/12 text-sm font-medium text-white transition-colors hover:bg-white/5'

/* ── Modal entry point ─────────────────────────────────────────────── */

export function SignIn2Modal({
	text,
	className,
	hideWhenAuthenticated = true
}: {
	text?: string
	className?: string
	hideWhenAuthenticated?: boolean
}) {
	const dialogStore = Ariakit.useDialogStore()
	const { isAuthenticated, loaders } = useAuthContext()

	if (loaders.userLoading) return null
	if (hideWhenAuthenticated && isAuthenticated) return null

	return (
		<>
			<button className={className} onClick={dialogStore.toggle} suppressHydrationWarning>
				{text ?? 'Sign In'}
			</button>
			<Ariakit.Dialog
				store={dialogStore}
				className="dialog flex max-h-[90dvh] w-full max-w-[331px] flex-col overflow-y-auto rounded-2xl bg-[#181a1b] px-5 pt-6 pb-5 shadow-2xl max-sm:drawer max-sm:max-w-none max-sm:rounded-b-none"
				unmountOnHide
			>
				<SignIn2Flow dialogStore={dialogStore} />
			</Ariakit.Dialog>
		</>
	)
}

/* ── Multi-step flow ───────────────────────────────────────────────── */

function SignIn2Flow({ dialogStore }: { dialogStore: Ariakit.DialogStore }) {
	const [step, setStep] = useState<Step>('email')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [promotionalEmails, setPromotionalEmails] = useState<PromotionalEmailsValue>('on')
	const [error, setError] = useState('')
	const [turnstileToken, setTurnstileToken] = useState('')

	const { login, signup, signInWithEthereumMutation, signInWithGithubMutation, resetPasswordMutation, loaders } =
		useAuthContext()
	const { openConnectModal } = useConnectModal()
	const { address } = useAccount()
	const { signMessageAsync } = useSignMessage()

	const goTo = (next: Step) => {
		setError('')
		setPassword('')
		setShowPassword(false)
		setStep(next)
	}

	const handleEmailContinue = (e: FormSubmitEvent) => {
		e.preventDefault()
		setError('')
		setStep('signin')
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
		if (!turnstileToken) return
		try {
			await signup(email, password, password, turnstileToken, promotionalEmails)
			setTurnstileToken('')
			dialogStore.hide()
		} catch (err: any) {
			const msg = typeof err?.error === 'string' ? err.error : err?.error?.email?.message || 'Failed to create account'
			setError(msg)
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
				<img src="/assets/defillama.webp" alt="" className="h-7 w-7 rounded-full" />
				<span className="text-sm font-semibold text-white">DefiLlama</span>
			</div>
			<Ariakit.DialogDismiss className="rounded-full p-1 text-[#878787] transition-colors hover:text-white">
				<Icon name="x" height={20} width={20} />
				<span className="sr-only">Close</span>
			</Ariakit.DialogDismiss>
		</div>
	)

	const errorEl = error ? <p className="text-center text-xs text-red-500">{error}</p> : null

	/* ── Step 1: Email ── */
	if (step === 'email') {
		return (
			<>
				{header}
				<h2 className="mb-8 text-xl font-semibold text-white">Get started</h2>

				<form className="flex flex-col gap-4" onSubmit={handleEmailContinue}>
					<input
						type="email"
						required
						placeholder="Enter your email"
						className={inputCls}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoFocus
					/>
					<button type="submit" className={primaryBtnCls}>
						Continue
					</button>
					<p className="text-xs leading-4 text-[#c6c6c6]">
						By continuing, you agree to our{' '}
						<BasicLink href="/terms" target="_blank" className="text-[#4b86db] underline">
							Terms of Service
						</BasicLink>{' '}
						and{' '}
						<BasicLink href="/privacy-policy" target="_blank" className="text-[#4b86db] underline">
							Privacy Policy
						</BasicLink>
						.
					</p>
				</form>

				<div className="my-6 flex items-center gap-5">
					<div className="h-px flex-1 bg-white/6" />
					<span className="text-sm text-[#878787]">Or</span>
					<div className="h-px flex-1 bg-white/6" />
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

				{errorEl}

				<p className="mt-6 text-center text-xs text-white">
					Registered with a wallet before?{' '}
					<button type="button" className="text-[#4b86db]" onClick={() => void handleWalletSignIn()}>
						Sign-in here
					</button>
				</p>
			</>
		)
	}

	/* ── Step 2a: Welcome Back ── */
	if (step === 'signin') {
		return (
			<>
				{header}
				<h2 className="text-xl font-semibold text-white">Welcome Back!</h2>
				<p className="mt-1 mb-6 text-sm text-[#c6c6c6]">{email}</p>

				<form className="flex flex-col gap-4" onSubmit={(e) => void handleSignIn(e)}>
					<div className="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							required
							placeholder="Enter your password"
							className={`${inputCls} pr-10`}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoFocus
						/>
						<button
							type="button"
							className="absolute right-3 top-1/2 -translate-y-1/2 text-[#878787] hover:text-white"
							onClick={() => setShowPassword(!showPassword)}
							tabIndex={-1}
						>
							<Icon name={showPassword ? 'eye-off' : 'eye'} height={16} width={16} />
						</button>
					</div>
					<button type="submit" disabled={loaders.login || !password} className={primaryBtnCls}>
						{loaders.login ? 'Signing in...' : 'Sign-in'}
					</button>
					{errorEl}
				</form>

				<p className="mt-6 text-center text-sm text-white">
					Forgot your password?{' '}
					<button type="button" className="text-[#4b86db]" onClick={() => goTo('forgot')}>
						Reset password
					</button>
				</p>
				<button type="button" className="mt-3 w-full text-center text-xs text-[#4b86db]" onClick={() => goTo('signup')}>
					Don&apos;t have an account? Create one
				</button>
			</>
		)
	}

	/* ── Step 2b: Create Account ── */
	if (step === 'signup') {
		return (
			<>
				{header}
				<h2 className="text-xl font-semibold text-white">Create Your Account</h2>
				<p className="mt-1 mb-4 text-sm text-[#c6c6c6]">{email}</p>
				<p className="mb-4 text-sm leading-5 text-[#c6c6c6]">
					Create a password to finish setting up your account (must have at least 8 characters):
				</p>

				<form className="flex flex-col gap-4" onSubmit={(e) => void handleSignUp(e)}>
					<div className="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							required
							placeholder="Create a password"
							className={`${inputCls} pr-10`}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoFocus
						/>
						<button
							type="button"
							className="absolute right-3 top-1/2 -translate-y-1/2 text-[#878787] hover:text-white"
							onClick={() => setShowPassword(!showPassword)}
							tabIndex={-1}
						>
							<Icon name={showPassword ? 'eye-off' : 'eye'} height={16} width={16} />
						</button>
					</div>

					<Turnstile
						onVerify={(token) => setTurnstileToken(token)}
						onError={() => setTurnstileToken('')}
						onExpire={() => setTurnstileToken('')}
						className="flex justify-center"
					/>

					<button type="submit" disabled={loaders.signup || !turnstileToken} className={primaryBtnCls}>
						{loaders.signup ? 'Creating account...' : 'Continue'}
					</button>
					{errorEl}

					<label className="flex items-start gap-2">
						<input
							type="checkbox"
							className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#1f67d2]"
							checked={promotionalEmails !== 'off'}
							onChange={(e) => setPromotionalEmails(e.target.checked ? 'on' : 'off')}
						/>
						<span className="text-xs leading-4 text-[#c6c6c6]">
							Receive emails about upcoming DefiLlama products and new releases
						</span>
					</label>
				</form>

				<button
					type="button"
					className="mt-4 w-full text-center text-xs text-[#4b86db]"
					onClick={() => goTo('signin')}
				>
					Already have an account? Sign in
				</button>
			</>
		)
	}

	/* ── Forgot password ── */
	return (
		<>
			{header}
			<h2 className="text-xl font-semibold text-white">Reset Password</h2>
			<p className="mt-1 mb-6 text-sm text-[#c6c6c6]">
				We&apos;ll send a reset link to <span className="text-white">{email}</span>
			</p>

			<form className="flex flex-col gap-4" onSubmit={(e) => void handleForgotPassword(e)}>
				<button type="submit" disabled={resetPasswordMutation.isPending} className={primaryBtnCls}>
					{resetPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
				</button>
				{errorEl}
			</form>

			<button type="button" className="mt-6 w-full text-center text-sm text-[#4b86db]" onClick={() => goTo('signin')}>
				Back to sign in
			</button>
		</>
	)
}
