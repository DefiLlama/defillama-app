import { useConnectModal } from '@rainbow-me/rainbowkit'
import * as Ariakit from '@ariakit/react'
import { FormEvent, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/LocalLoader'
import { BasicLink } from '~/components/Link'
import { Turnstile } from '~/components/Turnstile'

export const SignIn = ({ text, className }: { text?: string; className?: string }) => {
	const dialogState = Ariakit.useDialogStore()
	const { openConnectModal } = useConnectModal()
	const { address } = useAccount()

	const [flow, setFlow] = useState<'signin' | 'signup' | 'forgot'>('signin')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [passwordError, setPasswordError] = useState('')
	const [confirmPasswordError, setConfirmPasswordError] = useState('')
	const [turnstileToken, setTurnstileToken] = useState('')
	const [emailError, setEmailError] = useState('')

	const { login, signup, signInWithEthereum, signInWithGithub, resetPassword, isAuthenticated, loaders } =
		useAuthContext()
	const { signMessageAsync } = useSignMessage()

	const handleEmailSignIn = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		try {
			await login(email, password)
			dialogState.hide()
		} catch (error) {
			console.error('Error signing in:', error)
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
			dialogState.hide()
			setTurnstileToken('')
		} catch (error: any) {
			console.error('Error signing up:', error)

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
			console.error('Error resetting password:', error)
		}
	}

	const handleWalletSignIn = async () => {
		if (address) {
			try {
				await signInWithEthereum(address, signMessageAsync)
			} catch (error) {
				console.error('Error signing in with wallet:', error)
			}
		} else {
			openConnectModal?.()
			setTimeout(() => {
				dialogState.show()
			}, 100)
		}
	}

	if (loaders.userLoading || loaders.userFetching) {
		return (
			<div className="flex justify-center items-center py-3">
				<LocalLoader />
			</div>
		)
	}

	if (isAuthenticated) {
		return null
	}

	return (
		<>
			<button
				className={
					className ??
					'font-medium rounded-lg border border-[#39393E] py-[14px] flex-1 text-center mx-auto w-full hover:bg-[#2a2b30] transition-colors disabled:cursor-not-allowed'
				}
				onClick={dialogState.toggle}
				suppressHydrationWarning
			>
				{text && text.includes('GitHub') ? (
					<>
						<Icon name="github" height={18} width={18} className="inline-block mr-2" />
						{text}
					</>
				) : (
					(text ?? 'Sign In')
				)}
			</button>

			<Ariakit.Dialog
				store={dialogState}
				className="dialog flex flex-col rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 max-w-md shadow-2xl backdrop-blur-md animate-fadeIn"
				style={{
					backgroundImage: 'radial-gradient(circle at center, rgba(92, 92, 249, 0.05), transparent 80%)'
				}}
			>
				<div className="flex items-center justify-between mb-5">
					<Ariakit.DialogHeading className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-[#5C5CF9] to-[#8A8AFF]">
						{flow === 'signin' ? 'Sign In' : flow === 'signup' ? 'Create Account' : 'Reset Password'}
					</Ariakit.DialogHeading>
					<button
						onClick={dialogState.hide}
						className="text-[#8a8c90] hover:text-white transition-colors p-1.5 hover:bg-[#39393E] rounded-full"
					>
						<Icon name="x" height={18} width={18} />
						<span className="sr-only">Close</span>
					</button>
				</div>

				<div className="flex flex-col gap-3 w-full">
					<button
						className="w-full py-3 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] hover:from-[#4A4AF0] hover:to-[#5A5AF5] text-white relative disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-[#5C5CF9]/20 font-medium"
						onClick={handleWalletSignIn}
						disabled={loaders.signInWithEthereum}
					>
						<Icon name="wallet" height={18} width={18} />
						{loaders.signInWithEthereum ? 'Connecting...' : 'Sign in with Wallet'}
					</button>

					<button
						className="w-full py-3 rounded-lg bg-[#222429] hover:bg-[#2a2b30] text-white relative disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 border border-[#39393E] font-medium"
						onClick={() => signInWithGithub(() => dialogState.hide())}
						disabled={loaders.signInWithGithub}
					>
						<Icon name="github" height={18} width={18} />
						{loaders.signInWithGithub ? 'Connecting...' : 'Sign in with GitHub'}
					</button>
				</div>

				<div className="relative flex items-center my-2">
					<div className="grow border-t border-[#39393E]"></div>
					<span className="shrink mx-4 text-sm text-[#9a9da1]">or continue with email</span>
					<div className="grow border-t border-[#39393E]"></div>
				</div>

				{flow === 'signin' ? (
					<form className="flex flex-col gap-4" onSubmit={handleEmailSignIn}>
						<div className="space-y-1.5">
							<label htmlFor={`${text || 'default'}-signin-email`} className="text-sm font-medium text-[#b4b7bc]">
								Email
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8a8c90]">
									<Icon name="mail" height={16} width={16} />
								</div>
								<input
									id={`${text || 'default'}-signin-email`}
									type="email"
									required
									className="w-full p-3 pl-10 rounded-lg bg-[#222429] border border-[#39393E] text-white placeholder:text-[#8a8c90] focus:outline-hidden focus:ring-1 focus:ring-[#5C5CF9] focus:border-[#5C5CF9] transition-all duration-200"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<label htmlFor="signin-password" className="text-sm font-medium text-[#b4b7bc]">
								Password
							</label>
							<input
								id="signin-password"
								type="password"
								required
								className="w-full p-3 rounded-lg bg-[#222429] border border-[#39393E] text-white placeholder:text-[#8a8c90] focus:outline-hidden focus:ring-1 focus:ring-[#5C5CF9] focus:border-[#5C5CF9] transition-all duration-200"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>

						<div className="flex justify-end -mt-1">
							<button
								type="button"
								className="text-xs text-[#5C5CF9] hover:text-[#7C7CFF] transition-colors"
								onClick={() => setFlow('forgot')}
							>
								Forgot password?
							</button>
						</div>

						<button
							className="w-full py-3 mt-1 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] hover:from-[#4A4AF0] hover:to-[#5A5AF5] text-white font-medium transition-all duration-200 shadow-lg hover:shadow-[#5C5CF9]/20 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={loaders.login}
						>
							{loaders.login ? (
								<span className="flex items-center justify-center gap-2">
									<svg
										className="animate-spin h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
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

						<p className="text-center text-xs text-[#9a9da1] mt-1">
							Don't have an account?{' '}
							<button
								type="button"
								className="text-[#5C5CF9] hover:text-[#7C7CFF] transition-colors font-medium"
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
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8a8c90]">
									<Icon name="mail" height={16} width={16} />
								</div>
								<input
									id={`${text || 'default'}-signup-email`}
									type="email"
									required
									className={`w-full p-3 pl-10 rounded-lg bg-[#222429] border ${
										emailError ? 'border-red-500' : 'border-[#39393E]'
									} text-white placeholder:text-[#8a8c90] focus:outline-hidden focus:ring-1 focus:ring-[#5C5CF9] focus:border-[#5C5CF9] transition-all duration-200`}
									value={email}
									onChange={(e) => {
										setEmail(e.target.value)
										setEmailError('')
									}}
								/>
							</div>
							{emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
						</div>

						<div className="space-y-1.5">
							<label htmlFor="signup-password" className="text-sm font-medium text-[#b4b7bc]">
								Password
							</label>
							<input
								id="signup-password"
								type="password"
								required
								className={`w-full p-3 rounded-lg bg-[#222429] border ${
									passwordError ? 'border-red-500' : 'border-[#39393E]'
								} text-white placeholder:text-[#8a8c90] focus:outline-hidden focus:ring-1 focus:ring-[#5C5CF9] focus:border-[#5C5CF9] transition-all duration-200`}
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
							{passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
						</div>

						<div className="space-y-1.5">
							<label htmlFor="signup-confirm" className="text-sm font-medium text-[#b4b7bc]">
								Confirm Password
							</label>
							<input
								id="signup-confirm"
								type="password"
								required
								className={`w-full p-3 rounded-lg bg-[#222429] border ${
									confirmPasswordError ? 'border-red-500' : 'border-[#39393E]'
								} text-white placeholder:text-[#8a8c90] focus:outline-hidden focus:ring-1 focus:ring-[#5C5CF9] focus:border-[#5C5CF9] transition-all duration-200`}
								value={confirmPassword}
								onChange={(e) => {
									setConfirmPassword(e.target.value)
									validateConfirmPassword(password, e.target.value)
								}}
							/>
							{confirmPasswordError && <p className="text-xs text-red-500 mt-1">{confirmPasswordError}</p>}
						</div>

						<label className="flex items-center gap-2">
							<input type="checkbox" className="w-4 h-4" required />
							<span className="text-sm text-[#b4b7bc]">
								I agree to the{' '}
								<BasicLink
									href="/terms"
									target="_blank"
									className="text-[#5C5CF9] hover:text-[#7C7CFF] transition-colors font-medium"
								>
									Terms of Service
								</BasicLink>{' '}
								and{' '}
								<BasicLink
									href="/subscription/privacy-policy"
									target="_blank"
									className="text-[#5C5CF9] hover:text-[#7C7CFF] transition-colors font-medium"
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
									console.error('Turnstile verification failed')
								}}
								onExpire={() => setTurnstileToken('')}
								className="flex justify-center"
							/>
						</div>

						<button
							className="w-full py-3 mt-4 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] hover:from-[#4A4AF0] hover:to-[#5A5AF5] text-white font-medium transition-all duration-200 shadow-lg hover:shadow-[#5C5CF9]/20 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={loaders.signup || !turnstileToken}
						>
							{loaders.signup ? (
								<span className="flex items-center justify-center gap-2">
									<svg
										className="animate-spin h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
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

						<p className="text-center text-xs text-[#9a9da1] mt-1">
							Already have an account?{' '}
							<button
								type="button"
								className="text-[#5C5CF9] hover:text-[#7C7CFF] transition-colors font-medium"
								onClick={() => setFlow('signin')}
							>
								Sign in
							</button>
						</p>
					</form>
				) : (
					<form className="flex flex-col gap-4" onSubmit={handleForgotPassword}>
						<div className="mb-1">
							<p className="text-xs text-[#b4b7bc] bg-[#222429] p-3 border border-[#39393E] rounded-lg">
								Enter your email address and we'll send you a link to reset your password.
							</p>
						</div>

						<div className="space-y-1.5">
							<label htmlFor={`${text || 'default'}-forgot-email`} className="text-sm font-medium text-[#b4b7bc]">
								Email
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8a8c90]">
									<Icon name="mail" height={16} width={16} />
								</div>
								<input
									id={`${text || 'default'}-forgot-email`}
									type="email"
									required
									className="w-full p-3 pl-10 rounded-lg bg-[#222429] border border-[#39393E] text-white placeholder:text-[#8a8c90] focus:outline-hidden focus:ring-1 focus:ring-[#5C5CF9] focus:border-[#5C5CF9] transition-all duration-200"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
						</div>

						<button
							className="w-full py-3 mt-1 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#6E6EFA] hover:from-[#4A4AF0] hover:to-[#5A5AF5] text-white font-medium transition-all duration-200 shadow-lg hover:shadow-[#5C5CF9]/20 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={loaders.resetPassword}
						>
							{loaders.resetPassword ? (
								<span className="flex items-center justify-center gap-2">
									<svg
										className="animate-spin h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
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
							className="text-[#5C5CF9] hover:text-[#7C7CFF] transition-colors text-xs text-center font-medium mt-1"
							onClick={() => setFlow('signin')}
						>
							Back to sign in
						</button>
					</form>
				)}
			</Ariakit.Dialog>
		</>
	)
}
