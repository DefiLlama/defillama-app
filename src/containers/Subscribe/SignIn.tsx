import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Dialog, DialogHeading, useDialogState } from 'ariakit'
import { FormEvent, useState, useSyncExternalStore } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { AUTH_SERVER } from '~/constants'

async function signIn({ email, password }: { email: string; password: string }) {
	try {
		const response: { message: string; token: string; refreshToken: string } = await fetch(
			`${AUTH_SERVER}/email-sign-in`,
			{
				method: 'POST',
				body: JSON.stringify({ email, password }),
				headers: {
					'content-type': 'application/json'
				}
			}
		).then(async (res) => {
			if (!res.ok) {
				throw new Error(res.statusText || 'An error occurred while signing in')
			}

			const data = await res.json()

			return data
		})

		if (!response.token || !response.refreshToken) {
			throw new Error(response.message ?? 'An error occurred while signing in')
		}

		window.localStorage.setItem(`auth_token`, response.token)
		window.localStorage.setItem(`refresh_token`, response.refreshToken)
		window.dispatchEvent(new Event('storage'))

		return { email }
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'An error occurred while signing in')
	}
}

async function logout({ authToken, refreshToken }: { authToken?: string | null; refreshToken?: string | null }) {
	try {
		// if (!authToken || !refreshToken) {
		// 	throw new Error('An error occured while logging out')
		// }

		// const response: { message: string; token: string; refreshToken: string } = await fetch(`${AUTH_SERVER}/logout`, {
		// 	method: 'POST',
		// 	body: JSON.stringify({ refreshToken }),
		// 	headers: {
		// 		'content-type': 'application/json',
		// 		authorization: `Bearer ${authToken}`
		// 	}
		// }).then(async (res) => {
		// 	if (!res.ok) {
		// 		throw new Error(res.statusText || 'An error occurred while logging out')
		// 	}

		// 	const data = await res.json()

		// 	return data
		// })

		// console.log({ response })

		window.localStorage.removeItem(`auth_token`)
		window.localStorage.removeItem(`refresh_token`)
		window.dispatchEvent(new Event('storage'))

		return true
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'An error occurred while logging out')
	}
}

async function getUserEmail({ authToken }: { authToken?: string | null }) {
	if (!authToken) return null

	try {
		const response: { email: string; confirmed: boolean } = await fetch(`${AUTH_SERVER}/user`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${authToken}`
			}
		}).then(async (res) => {
			const data = await res.json()

			if (!res.ok) {
				throw new Error(data.error ?? `Failed to get user data`)
			}

			return data
		})

		if (!response.email) {
			throw new Error('An error occurred getting user data')
		}

		return response
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'An error occurred while signing in')
	}
}

function subscribe(callback: () => void) {
	window.addEventListener('storage', callback)

	return () => {
		window.removeEventListener('storage', callback)
	}
}

function getEmailAuthToken() {
	return localStorage.getItem('auth_token') || null
}
function getEmailRefreshToken() {
	return localStorage.getItem('refresh_token') || null
}

export const SignIn = ({ text, className }: { text?: string; className?: string }) => {
	const dialogState = useDialogState()
	const { openConnectModal } = useConnectModal()
	const { address } = useAccount()
	const { disconnectAsync } = useDisconnect()
	const [flow, setFlow] = useState<'signin' | 'signup' | 'forgot'>('signin')

	const {
		data: signedInData,
		mutate: signInWIthEmail,
		isPending: isSigningIn,
		error: errorSigningIn
	} = useMutation({ mutationFn: signIn })

	const { mutate: logoutUser, isPending: loggingOut, error: errorLoggingOut } = useMutation({ mutationFn: logout })

	const authToken = useSyncExternalStore(
		subscribe,
		() => getEmailAuthToken(),
		() => null
	)
	const refreshToken = useSyncExternalStore(
		subscribe,
		() => getEmailRefreshToken(),
		() => null
	)

	const {
		data: userEmailData,
		isLoading: fetchingUserEmailData,
		error: errorFetchingUserEmailData
	} = useQuery<{ email: string; confirmed: boolean } | null>({
		queryKey: ['currentKey', authToken],
		queryFn: () => getUserEmail({ authToken })
	})

	const handleEmailSignIn = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		signInWIthEmail({ email: e.currentTarget.email.value, password: e.currentTarget.password.value })
	}

	return (
		<>
			<button
				className={
					className ??
					'font-medium rounded-lg border border-[#39393E] py-[14px] flex-1 text-center mx-auto w-full disabled:cursor-not-allowed'
				}
				onClick={dialogState.toggle}
				suppressHydrationWarning
			>
				{address || signedInData || userEmailData ? 'Account' : text ?? 'Sign In'}
			</button>
			<Dialog state={dialogState} className="dialog flex flex-col sm:max-w-md">
				{address ? (
					<>
						<DialogHeading className="text-2xl font-bold">Account</DialogHeading>
						<p className="break-all">{`${address}`}</p>
						<button
							className="w-full p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white relative disabled:cursor-not-allowed disabled:opacity-50"
							onClick={() => disconnectAsync().then(() => dialogState.hide())}
						>
							Disconnect
						</button>
					</>
				) : signedInData || userEmailData ? (
					<>
						<DialogHeading className="text-2xl font-bold">Account</DialogHeading>
						<p className="break-all">
							<span className="font-bold">Email: </span>
							{`${signedInData?.email ?? userEmailData?.email}`}
						</p>
						<p className="break-all">
							<span className="font-bold">Status: </span>
							{userEmailData ? (userEmailData.confirmed ? 'Verified' : 'Not Verified') : ''}
						</p>
						<button
							className="w-full p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white relative disabled:cursor-not-allowed disabled:opacity-50"
							onClick={() => logoutUser({ authToken, refreshToken })}
							disabled={loggingOut}
						>
							{loggingOut ? 'Signing out...' : 'Sign Out'}
						</button>
						{errorLoggingOut ? <p className="text-center text-red-500 text-sm">{errorLoggingOut.message}</p> : null}
					</>
				) : (
					<>
						<DialogHeading className="text-2xl font-bold">Sign In</DialogHeading>
						<button
							className="w-full p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white relative disabled:cursor-not-allowed disabled:opacity-50"
							onClick={openConnectModal}
						>
							Connect Wallet
						</button>
						{/* <div className="relative w-full flex flex-col items-center opacity-70">
							<p className="px-2 bg-[var(--bg1)] z-10 text-sm">or continue with email</p>
							<hr className="absolute top-0 bottom-0 my-auto w-full opacity-30" />
						</div>
						<form className="flex flex-col gap-4" onSubmit={handleEmailSignIn}>
							<label className="flex flex-col w-full">
								<span>Email</span>
								<input
									name="email"
									type="email"
									required
									className="w-full p-2 rounded-lg bg-black text-white placeholder:text-white/40"
									placeholder="satoshi@llama.fi"
								/>
							</label>
							<label className="flex flex-col w-full">
								<span>Password</span>
								<input
									name="password"
									type="password"
									required
									className="w-full p-2 rounded-lg bg-black text-white placeholder:text-white/40"
								/>
							</label>
							<button
								className="w-full p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white relative disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isSigningIn || fetchingUserEmailData}
							>
								{isSigningIn ? 'Signing In...' : 'Sign In With Email'}
							</button>
							{errorSigningIn ? <p className="text-center text-red-500 text-sm">{errorSigningIn.message}</p> : null}
							{errorFetchingUserEmailData ? (
								<p className="text-center text-red-500 text-sm">{errorFetchingUserEmailData.message}</p>
							) : null}
						</form> */}
					</>
				)}
			</Dialog>
		</>
	)
}
