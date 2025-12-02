import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage } from 'wagmi'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { Turnstile } from '~/components/Turnstile'
import { useAuthContext } from '~/containers/Subscribtion/auth'

export const SignInModal = ({
	text,
	className,
	showOnlyAuthDialog = false,
	pendingActionMessage,
	defaultFlow = 'signin',
	hideLoader = false
}: {
	text?: string
	className?: string
	showOnlyAuthDialog?: boolean
	pendingActionMessage?: string
	defaultFlow?: 'signin' | 'signup' | 'forgot'
	hideLoader?: boolean
}) => {
	const dialogStore = Ariakit.useDialogStore({ defaultOpen: showOnlyAuthDialog })

	const { isAuthenticated, loaders } = useAuthContext()

	if (loaders.userLoading || loaders.userFetching) {
		if (hideLoader) {
			return null
		}
		return <LocalLoader />
	}

	if (isAuthenticated) {
		return null
	}

	return (
		<>
			{showOnlyAuthDialog ? null : (
				<button
					className={
						className ??
						'mx-auto w-full flex-1 rounded-lg border border-[#39393E] py-3.5 text-center font-medium transition-colors hover:bg-[#2a2b30] disabled:cursor-not-allowed'
					}
					onClick={dialogStore.toggle}
					suppressHydrationWarning
				>
					{text && text.includes('GitHub') ? (
						<>
							<Icon name="github" height={18} width={18} className="mr-2 inline-block" />
							{text}
						</>
					) : (
						(text ?? 'Sign In')
					)}
				</button>
			)}

			<Ariakit.Dialog
				store={dialogStore}
				hideOnInteractOutside={showOnlyAuthDialog ? false : true}
				className="dialog max-sm:drawer flex max-h-[90dvh] max-w-md flex-col overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-4 shadow-2xl max-sm:rounded-b-none sm:p-6"
				style={{
					backgroundImage: 'radial-gradient(circle at center, rgba(92, 92, 249, 0.05), transparent 80%)'
				}}
			>
				<SignInForm
					text={text}
					showOnlyAuthDialog={showOnlyAuthDialog}
					pendingActionMessage={pendingActionMessage}
					defaultFlow={defaultFlow}
					dialogStore={dialogStore}
				/>
			</Ariakit.Dialog>
		</>
	)
}

export const SignInForm = ({
	text,
	showOnlyAuthDialog = false,
	pendingActionMessage,
	defaultFlow = 'signin',
	dialogStore,
	returnUrl
}: {
	text?: string
	showOnlyAuthDialog?: boolean
	pendingActionMessage?: string
	defaultFlow?: 'signin' | 'signup' | 'forgot'
	dialogStore: Ariakit.DialogStore
	returnUrl?: string
}) => {
	const { openConnectModal } = useConnectModal()
	const { address } = useAccount()
	const router = useRouter()

	const [flow, setFlow] = useState<'signin' | 'signup' | 'forgot'>(defaultFlow)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [passwordError, setPasswordError] = useState('')
	const [confirmPasswordError, setConfirmPasswordError] = useState('')
	const [turnstileToken, setTurnstileToken] = useState('')
	const [emailError, setEmailError] = useState('')

	const { login, signup, signInWithEthereum, signInWithGithub, resetPassword, loaders } = useAuthContext()
	const { signMessageAsync } = useSignMessage()

	const handleEmailSignIn = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		try {
			await login(email, password)
			if (returnUrl) {
				router.push(returnUrl)
			}
			dialogStore.hide()
		} catch (error) {
			console.log('Error signing in:', error)
		}
	}

	const validatePassword = (pass: string) => {
		if (pass.length < 8) {
			setPasswordError('Password must be at least 8 characters long')
			return false
		}
		setPasswordError('')
		return true
	}

	const validateConfirmPassword = (pass: string, confirm: string) => {
		if (pass !== confirm) {
			setConfirmPasswordError('Passwords do not match')
			return false
		}
		setConfirmPasswordError('')
		return true
	}

	const handleEmailSignUp = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		setEmailError('')
		setPasswordError('')
		setConfirmPasswordError('')

		const isPasswordValid = validatePassword(password)
		const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword)

		if (!isPasswordValid || !isConfirmPasswordValid) {
			return
		}

		if (!turnstileToken) {
			return
		}

		try {
			await signup(email, password, confirmPassword, turnstileToken)
			setTurnstileToken('')

			if (returnUrl) {
				router.push(returnUrl)
			}

			dialogStore.hide()
		} catch (error: any) {
			console.log('Error signing up:', error)

			if (typeof error?.error === 'string') {
				setEmailError(`${error.error}. Please reset your password or use another email.`)
				return
			}

			if (error?.error) {
				if (error.error.email?.message) {
					setEmailError(error.error.email.message)
				}
				if (error.error.password?.message) {
					setPasswordError(error.error.password.message)
				}
				if (error.error.passwordConfirm?.message) {
					setConfirmPasswordError(error.error.passwordConfirm.message)
				}
			}
		}
	}

	const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		try {
			resetPassword(email)
			setFlow('signin')
		} catch (error) {
			console.log('Error resetting password:', error)
		}
	}

	const handleWalletSignIn = async () => {
		if (address) {
			try {
				await signInWithEthereum(address, signMessageAsync)
				if (returnUrl) {
					router.push(returnUrl)
				}
				dialogStore.hide()
			} catch (error) {
				console.log('Error signing in with wallet:', error)
			}
		} else {
			openConnectModal?.()
			setTimeout(() => {
				dialogStore.show()
			}, 100)
		}
	}

	return (
		<>
			<div className="mb-3 flex items-center justify-between sm:mb-5">
				<Ariakit.DialogHeading className="bg-linear-to-r from-[#5C5CF9] to-[#8A8AFF] bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
					{flow === 'signin' ? 'Sign In' : flow === 'signup' ? 'Create Account' : 'Reset Password'}
				</Ariakit.DialogHeading>

				{showOnlyAuthDialog ? null : (
					<Ariakit.DialogDismiss className="rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white">
						<Icon name="x" height={18} width={18} />
						<span className="sr-only">Close</span>
					</Ariakit.DialogDismiss>
				)}
			</div>

			{pendingActionMessage && (
				<div className="mb-3 rounded-lg border border-[#5C5CF9]/30 bg-[#5C5CF9]/10 p-2.5 sm:mb-4 sm:p-3">
					<p className="text-center text-xs text-[#b4b7bc] sm:text-sm">{pendingActionMessage}</p>
				</div>
			)}

			<div className="flex w-full flex-col gap-2 sm:gap-3">
				<button
					className="relative flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
					onClick={handleWalletSignIn}
					disabled={loaders.signInWithEthereum}
				>
					<Icon name="wallet" height={16} width={16} />
					{loaders.signInWithEthereum ? 'Connecting...' : 'Sign in with Wallet'}
				</button>

				<button
					className="relative flex w-full items-center justify-center gap-2 rounded-lg border border-[#39393E] bg-[#222429] py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#2a2b30] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
					onClick={() => signInWithGithub(() => dialogStore.hide())}
					disabled={loaders.signInWithGithub}
				>
					<Icon name="github" height={16} width={16} />
					{loaders.signInWithGithub ? 'Connecting...' : 'Sign in with GitHub'}
				</button>
			</div>

			<div className="relative my-2 flex items-center sm:my-3">
				<div className="grow border-t border-[#39393E]"></div>
				<span className="mx-3 shrink text-xs text-[#9a9da1] sm:mx-4 sm:text-sm">or continue with email</span>
				<div className="grow border-t border-[#39393E]"></div>
			</div>

			{flow === 'signin' ? (
				<form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleEmailSignIn}>
					<div className="space-y-1">
						<label
							htmlFor={`${text || 'default'}-signin-email`}
							className="text-xs font-medium text-[#b4b7bc] sm:text-sm"
						>
							Email
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a8c90]">
								<Icon name="mail" height={16} width={16} />
							</div>
							<input
								id={`${text || 'default'}-signin-email`}
								type="email"
								required
								className="w-full rounded-lg border border-[#39393E] bg-[#222429] py-2 pr-2.5 pl-[36px] text-white transition-all duration-200 placeholder:text-[#8a8c90] focus:border-[#5C5CF9] focus:ring-1 focus:ring-[#5C5CF9] focus:outline-hidden sm:py-2.5"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-1">
						<label htmlFor="signin-password" className="text-xs font-medium text-[#b4b7bc] sm:text-sm">
							Password
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a8c90]">
								<Icon name="key" height={16} width={16} />
							</div>
							<input
								id="signin-password"
								type="password"
								required
								className="w-full rounded-lg border border-[#39393E] bg-[#222429] py-2 pr-2.5 pl-[36px] text-white transition-all duration-200 placeholder:text-[#8a8c90] focus:border-[#5C5C] focus:ring-1 focus:ring-[#5C5CF9] focus:outline-hidden sm:py-2.5"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>

					<div className="-mt-1 flex justify-end">
						<button
							type="button"
							className="text-xs text-[#5C5CF9] transition-colors hover:text-[#7C7CFF]"
							onClick={() => setFlow('forgot')}
						>
							Forgot password?
						</button>
					</div>

					<button
						className="mt-1 w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={loaders.login}
					>
						{loaders.login ? (
							<span className="flex items-center justify-center gap-2">
								<svg
									className="h-5 w-5 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Signing In...
							</span>
						) : (
							'Sign In'
						)}
					</button>

					<p className="mt-1 text-center text-xs text-[#9a9da1]">
						Don't have an account?{' '}
						<button
							type="button"
							className="font-medium text-[#5C5CF9] transition-colors hover:text-[#7C7CFF]"
							onClick={() => setFlow('signup')}
						>
							Create one
						</button>
					</p>
				</form>
			) : flow === 'signup' ? (
				<form className="flex flex-col gap-4" onSubmit={handleEmailSignUp}>
					<div className="space-y-1.5">
						<label htmlFor={`${text || 'default'}-signup-email`} className="text-sm font-medium text-[#b4b7bc]">
							Email
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a8c90]">
								<Icon name="mail" height={16} width={16} />
							</div>
							<input
								id={`${text || 'default'}-signup-email`}
								type="email"
								required
								className={`w-full rounded-lg border bg-[#222429] p-3 pl-10 ${
									emailError ? 'border-red-500' : 'border-[#39393E]'
								} text-white transition-all duration-200 placeholder:text-[#8a8c90] focus:border-[#5C5CF9] focus:ring-1 focus:ring-[#5C5CF9] focus:outline-hidden`}
								value={email}
								onChange={(e) => {
									setEmail(e.target.value)
									setEmailError('')
								}}
							/>
						</div>
						{emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
					</div>

					<div className="space-y-1.5">
						<label htmlFor="signup-password" className="text-sm font-medium text-[#b4b7bc]">
							Password
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a8c90]">
								<Icon name="key" height={16} width={16} />
							</div>
							<input
								id="signup-password"
								type="password"
								required
								className={`w-full rounded-lg border bg-[#222429] p-3 pl-10 ${
									passwordError ? 'border-red-500' : 'border-[#39393E]'
								} text-white transition-all duration-200 placeholder:text-[#8a8c90] focus:border-[#5C5CF9] focus:ring-1 focus:ring-[#5C5CF9] focus:outline-hidden`}
								value={password}
								onChange={(e) => {
									setPassword(e.target.value)
									// Only validate locally on change, don't clear server errors
									const localValidation = validatePassword(e.target.value)
									if (localValidation) {
										setPasswordError('')
									}
									if (confirmPassword) {
										validateConfirmPassword(e.target.value, confirmPassword)
									}
								}}
							/>
						</div>
						{passwordError && <p className="mt-1 text-xs text-red-500">{passwordError}</p>}
					</div>

					<div className="space-y-1.5">
						<label htmlFor="signup-confirm" className="text-sm font-medium text-[#b4b7bc]">
							Confirm Password
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a8c90]">
								<Icon name="key" height={16} width={16} />
							</div>
							<input
								id="signup-confirm"
								type="password"
								required
								className={`w-full rounded-lg border bg-[#222429] p-3 pl-10 ${
									confirmPasswordError ? 'border-red-500' : 'border-[#39393E]'
								} text-white transition-all duration-200 placeholder:text-[#8a8c90] focus:border-[#5C5CF9] focus:ring-1 focus:ring-[#5C5CF9] focus:outline-hidden`}
								value={confirmPassword}
								onChange={(e) => {
									setConfirmPassword(e.target.value)
									validateConfirmPassword(password, e.target.value)
								}}
							/>
						</div>
						{confirmPasswordError && <p className="mt-1 text-xs text-red-500">{confirmPasswordError}</p>}
					</div>

					<label className="flex items-center gap-2">
						<input type="checkbox" className="h-4 w-4" required />
						<span className="text-sm text-[#b4b7bc]">
							I agree to the{' '}
							<BasicLink
								href="/terms"
								target="_blank"
								className="font-medium text-[#5C5CF9] transition-colors hover:text-[#7C7CFF]"
							>
								Terms of Service
							</BasicLink>{' '}
							and{' '}
							<BasicLink
								href="/privacy-policy"
								target="_blank"
								className="font-medium text-[#5C5CF9] transition-colors hover:text-[#7C7CFF]"
							>
								Privacy Policy
							</BasicLink>
						</span>
					</label>

					<div className="mt-4">
						<Turnstile
							onVerify={(token) => setTurnstileToken(token)}
							onError={() => {
								setTurnstileToken('')
								console.log('Turnstile verification failed')
							}}
							onExpire={() => setTurnstileToken('')}
							className="flex justify-center"
						/>
					</div>

					<button
						className="mt-4 w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={loaders.signup || !turnstileToken}
					>
						{loaders.signup ? (
							<span className="flex items-center justify-center gap-2">
								<svg
									className="h-5 w-5 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Creating Account...
							</span>
						) : (
							'Create Account'
						)}
					</button>

					<p className="mt-1 text-center text-xs text-[#9a9da1]">
						Already have an account?{' '}
						<button
							type="button"
							className="font-medium text-[#5C5CF9] transition-colors hover:text-[#7C7CFF]"
							onClick={() => setFlow('signin')}
						>
							Sign in
						</button>
					</p>
				</form>
			) : (
				<form className="flex flex-col gap-4" onSubmit={handleForgotPassword}>
					<div className="mb-1">
						<p className="rounded-lg border border-[#39393E] bg-[#222429] p-3 text-xs text-[#b4b7bc]">
							Enter your email address and we'll send you a link to reset your password.
						</p>
					</div>

					<div className="space-y-1.5">
						<label htmlFor={`${text || 'default'}-forgot-email`} className="text-sm font-medium text-[#b4b7bc]">
							Email
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a8c90]">
								<Icon name="mail" height={16} width={16} />
							</div>
							<input
								id={`${text || 'default'}-forgot-email`}
								type="email"
								required
								className="w-full rounded-lg border border-[#39393E] bg-[#222429] p-3 pl-10 text-white transition-all duration-200 placeholder:text-[#8a8c90] focus:border-[#5C5CF9] focus:ring-1 focus:ring-[#5C5CF9] focus:outline-hidden"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					</div>

					<button
						className="mt-1 w-full rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-[#4A4AF0] hover:to-[#5A5AF5] hover:shadow-[#5C5CF9]/20 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={loaders.resetPassword}
					>
						{loaders.resetPassword ? (
							<span className="flex items-center justify-center gap-2">
								<svg
									className="h-5 w-5 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Sending...
							</span>
						) : (
							'Reset Password'
						)}
					</button>

					<button
						type="button"
						className="mt-1 text-center text-xs font-medium text-[#5C5CF9] transition-colors hover:text-[#7C7CFF]"
						onClick={() => setFlow('signin')}
					>
						Back to sign in
					</button>
				</form>
			)}
		</>
	)
}
