import { createContext, ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createSiweMessage } from 'viem/siwe'
import { AUTH_SERVER } from '~/constants'
import pb, { AuthModel } from '~/utils/pocketbase'

export type PromotionalEmailsValue = 'initial' | 'on' | 'off'

// Custom event name for auth store changes
const AUTH_STORE_CHANGE_EVENT = 'pb-auth-store-change'

// Store for tracking auth state changes
let authStoreSnapshot = {
	token: pb.authStore.token,
	record: pb.authStore.record ? { ...pb.authStore.record } : null,
	isValid: pb.authStore.isValid
}

// Subscribe to PocketBase authStore changes and dispatch window events
const subscribeToAuthStore = (callback: () => void) => {
	const unsubscribe = pb.authStore.onChange((token, record) => {
		const hasTokenChanged = authStoreSnapshot.token !== token
		const hasRecordChanged = JSON.stringify(authStoreSnapshot.record) !== JSON.stringify(record)
		const hasValidChanged = authStoreSnapshot.isValid !== pb.authStore.isValid

		if (hasTokenChanged || hasRecordChanged || hasValidChanged) {
			authStoreSnapshot = {
				token,
				record: record ? { ...record } : null,
				isValid: pb.authStore.isValid
			}
			window.dispatchEvent(
				new CustomEvent(AUTH_STORE_CHANGE_EVENT, { detail: { token, record, isValid: pb.authStore.isValid } })
			)
			callback()
		}
	})

	// Also listen to the custom event for external triggers
	const handleAuthStoreChange = () => callback()
	window.addEventListener(AUTH_STORE_CHANGE_EVENT, handleAuthStoreChange)

	return () => {
		unsubscribe()
		window.removeEventListener(AUTH_STORE_CHANGE_EVENT, handleAuthStoreChange)
	}
}

const getAuthStoreSnapshot = () => authStoreSnapshot

// Cache the server snapshot to avoid infinite loop in useSyncExternalStore
const serverSnapshot = {
	token: '',
	record: null,
	isValid: false
}

const getServerSnapshot = () => serverSnapshot

interface FetchOptions extends RequestInit {
	skipAuth?: boolean
}

const getNonce = async (address: string) => {
	const response = await fetch(`${AUTH_SERVER}/nonce?address=${address}`)
	if (!response.ok) {
		throw new Error('Failed to get nonce')
	}
	return response.json()
}

const clearUserSession = () => {
	pb.authStore.clear()
	localStorage.removeItem('userHash')
	localStorage.removeItem('lite-dashboards')
	if (typeof window !== 'undefined' && (window as any).FrontChat) {
		;(window as any).FrontChat('shutdown', { clearSession: true })
	}
}

interface AuthContextType {
	login: (email: string, password: string, onSuccess?: () => void) => Promise<void>
	signup: (
		email: string,
		password: string,
		passwordConfirm: string,
		turnstileToken: string,
		promotionalEmails?: PromotionalEmailsValue,
		onSuccess?: () => void
	) => Promise<void>
	logout: () => void
	authorizedFetch: (url: string, options?: FetchOptions, onlyToken?: boolean) => Promise<Response>
	signInWithEthereum: (address: string, signMessageFunction: any, onSuccess?: () => void) => Promise<void>
	signInWithGithub: (onSuccess?: () => void) => Promise<void>
	addWallet: (address: string, signMessageFunction: any, onSuccess?: () => void) => Promise<void>
	resetPassword: (email: string) => void
	changeEmail: (email: string) => void
	resendVerification: (email: string) => void
	addEmail: (email: string) => void
	setPromotionalEmails: (value: string) => void
	isAuthenticated: boolean
	user: AuthModel
	hasActiveSubscription: boolean
	loaders: {
		login: boolean
		signup: boolean
		logout: boolean
		signInWithEthereum: boolean
		signInWithGithub: boolean
		addWallet: boolean
		resetPassword: boolean
		changeEmail: boolean
		resendVerification: boolean
		addEmail: boolean
		setPromotionalEmails: boolean
		userLoading: boolean
	}
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	// Use useSyncExternalStore to listen to authStore changes
	const authStoreState = useSyncExternalStore(subscribeToAuthStore, getAuthStoreSnapshot, getServerSnapshot)

	// Derive isAuthenticated from authStoreState
	const isAuthenticated = authStoreState.isValid && !!authStoreState.token

	const queryClient = useQueryClient()

	const { isLoading: userQueryIsLoading } = useQuery({
		queryKey: ['currentUserAuthStatus', pb.authStore.record?.id ?? null],
		queryFn: async () => {
			if (!pb.authStore.token) {
				return null
			}
			try {
				const refreshResult = await pb.collection('users').authRefresh()
				return { ...refreshResult.record }
			} catch (error: any) {
				if (error?.isAbort || error?.message?.includes('autocancelled')) {
					if (pb.authStore.isValid && pb.authStore.record) {
						return { ...pb.authStore.record }
					}
					clearUserSession()
					return null
				}

				console.log('Error refreshing auth:', error)

				if (error?.status === 401 || error?.code === 401) {
					clearUserSession()
				}

				throw new Error('Failed to refresh auth')
			}
		},
		enabled: authStoreState.record?.id != null,
		staleTime: 5 * 60 * 1000,
		refetchOnMount: true,
		refetchOnWindowFocus: false,
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	})

	const loginMutation = useMutation({
		mutationFn: async ({ email, password }: { email: string; password: string }) => {
			try {
				const res = await pb.collection('users').authWithPassword(email, password)

				return res
			} catch (error) {
				console.log('Login error:', error)
				throw new Error('Invalid credentials')
			}
		},
		onSuccess: () => {
			toast.success('Successfully signed in', { duration: 3000 })
		},
		onError: () => {
			toast.error('Invalid email or password')
		}
	})

	const userLoading = Boolean(!authStoreState.token || !authStoreState.record) ? userQueryIsLoading : false

	const login = useCallback(
		async (email: string, password: string, onSuccess?: () => void) => {
			try {
				await loginMutation.mutateAsync({ email, password })
				onSuccess?.()
			} catch (e) {
				console.log('Login error:', e)
				throw e
			}
		},
		[loginMutation]
	)

	const signupMutation = useMutation({
		mutationFn: async ({
			email,
			password,
			passwordConfirm,
			turnstileToken,
			promotionalEmails
		}: {
			email: string
			password: string
			passwordConfirm: string
			turnstileToken: string
			promotionalEmails?: PromotionalEmailsValue
		}) => {
			const response = await fetch(`${AUTH_SERVER}/auth/signup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					passwordConfirm,
					auth_method: 'email',
					source: 'defillama',
					turnstile_token: turnstileToken,
					promotionalEmails
				})
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw errorData
			}

			const { token } = await response.json()
			pb.authStore.save(token)
		},
		onSuccess: () => {
			sessionStorage.setItem('just_signed_up', 'true')
			toast.success('Account created! Please check your email to verify your account.', { duration: 5000 })
		},
		onError: (error: any) => {
			if (error?.error === 'User with this email already exists') {
				return
			}
			const message = error.error
			if (message) {
				toast.error(message)
			} else {
				toast.error('Failed to create account. Please try again.')
			}
		}
	})

	const signup = useCallback(
		async (
			email: string,
			password: string,
			passwordConfirm: string,
			turnstileToken: string,
			promotionalEmails?: PromotionalEmailsValue,
			onSuccess?: () => void
		) => {
			const result = await signupMutation.mutateAsync({
				email,
				password,
				passwordConfirm,
				turnstileToken,
				promotionalEmails
			})
			onSuccess?.()
			return result
		},
		[signupMutation]
	)

	const logoutMutation = useMutation({
		mutationFn: async () => {
			clearUserSession()
			return true
		}
	})

	const logout = useCallback(() => {
		logoutMutation.mutate()
	}, [logoutMutation])

	const authorizedFetch = useCallback(
		async (url: string, options: FetchOptions = {}, onlyToken = false) => {
			const { skipAuth = false, headers = {}, ...rest } = options

			if (skipAuth) {
				return fetch(url, options)
			}

			if (!pb.authStore.isValid) {
				console.log('Not authenticated')
				return null
			}

			const authHeaders = {
				...headers,
				Authorization: onlyToken ? pb.authStore.token : `Bearer ${pb.authStore.token}`
			}

			try {
				const response = await fetch(url, {
					...rest,
					headers: authHeaders
				})

				if (!response.ok) {
					return response
				}

				return response
			} catch (error) {
				if (error instanceof Error && error.message === 'Session expired') {
					toast.error('Your session has expired. Please login again.')
					logout()
				}
				throw error
			}
		},
		[logout]
	)

	const signInWithEthereumMutation = useMutation({
		mutationFn: async ({ address, signMessageFunction }: { address: string; signMessageFunction: any }) => {
			const { nonce } = await getNonce(address)
			const issuedAt = new Date()
			const message = createSiweMessage({
				domain: window.location.host,
				address: address as `0x${string}`,
				statement: 'Sign in with Ethereum to the app.',
				uri: window.location.origin,
				version: '1',
				chainId: 1,
				nonce: nonce,
				issuedAt: issuedAt
			})

			const signature = await signMessageFunction({
				message: message,
				account: address as `0x${string}`
			})

			try {
				const response = await fetch(`${AUTH_SERVER}/eth-auth`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message, signature, address, issuedAt: issuedAt.toISOString() })
				})

				if (!response.ok) {
					throw new Error('Failed to sign in with Ethereum')
				}

				const { password, identity, impersonate } = await response.json()

				if (impersonate) {
					await pb.authStore.save(impersonate.authStore.baseToken, impersonate.authStore.baseModel)
				} else {
					await pb.collection('users').authWithPassword(identity, password)
				}

				toast.success('Successfully signed in with Web3 wallet')

				return { address }
			} catch (error) {
				console.log('Ethereum sign-in error:', error)
				throw new Error('Failed to sign in with Ethereum')
			}
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : 'Failed to connect wallet'

			toast.error(message)
		}
	})

	const signInWithEthereum = useCallback(
		async (address: string, signMessageFunction: any, onSuccess?: () => void) => {
			try {
				await signInWithEthereumMutation.mutateAsync({ address, signMessageFunction })
				onSuccess?.()
				return Promise.resolve()
			} catch (error) {
				console.log('Ethereum sign-in error:', error)
				return Promise.reject(error)
			}
		},
		[signInWithEthereumMutation]
	)

	const signInWithGithubMutation = useMutation({
		mutationFn: async () => {
			try {
				const authData = await pb.collection('users').authWithOAuth2({
					provider: 'github',
					redirectTo: `${window.location.origin}/subscription`
				})

				return authData
			} catch (error) {
				console.log('GitHub sign-in error:', error)
				throw new Error('Failed to sign in with GitHub')
			}
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : 'Failed to connect with GitHub'
			toast.error(message)
		}
	})

	const signInWithGithub = useCallback(
		async (onSuccess?: () => void) => {
			try {
				await signInWithGithubMutation.mutateAsync()
				onSuccess?.()
				toast.success('Successfully signed in with GitHub')
				return Promise.resolve()
			} catch (error) {
				console.log('GitHub sign-in error:', error)
				return Promise.reject(error)
			}
		},
		[signInWithGithubMutation]
	)

	const addWalletMutation = useMutation({
		mutationFn: async ({ address, signMessageFunction }: { address: string; signMessageFunction: any }) => {
			if (!pb.authStore.isValid) {
				throw new Error('User not authenticated')
			}

			const { nonce } = await getNonce(address)
			const issuedAt = new Date()
			const message = createSiweMessage({
				domain: window.location.host,
				address: address as `0x${string}`,
				statement: 'Sign in with Ethereum to the app.',
				uri: window.location.origin,
				version: '1',
				chainId: 1,
				nonce: nonce,
				issuedAt: issuedAt
			})

			const signature = await signMessageFunction({
				message: message,
				account: address as `0x${string}`
			})

			const response = await fetch(`${AUTH_SERVER}/add-wallet`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${pb.authStore.token}`
				},
				body: JSON.stringify({ message, signature, address, issuedAt: issuedAt.toISOString() })
			})

			if (!response.ok) {
				let reason = 'Failed to link wallet'
				try {
					const data = await response.json()
					reason = data?.message || data?.error || reason
				} catch (e) {}
				throw new Error(reason)
			}

			return { address }
		},
		onSuccess: async () => {
			try {
				await pb.collection('users').authRefresh()
			} catch {}
			toast.success('Wallet linked successfully')
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : 'Failed to link wallet'
			toast.error(message)
		}
	})

	const addWallet = useCallback(
		async (address: string, signMessageFunction: any, onSuccess?: () => void) => {
			try {
				await addWalletMutation.mutateAsync({ address, signMessageFunction })
				onSuccess?.()
				return Promise.resolve()
			} catch (error) {
				console.log('Add wallet error:', error)
				return Promise.reject(error)
			}
		},
		[addWalletMutation]
	)

	const resetPassword = useMutation({
		mutationFn: async (email: string) => {
			await pb.collection('users').requestPasswordReset(email)
			toast.success('Password reset email sent')
		},
		onError: (error) => {
			toast.error('Failed to send password reset email. Please try again.')
		}
	})

	const changeEmail = useMutation({
		mutationFn: async (email: string) => {
			try {
				await pb.collection('users').requestEmailChange(email)
				toast.success('Email change request sent')
			} catch (error) {
				toast.error('User with this email already exists')
			}
		}
	})

	const resendVerification = useMutation({
		mutationFn: async (email: string) => {
			try {
				if (!pb.authStore.isValid) {
					throw new Error('User not authenticated')
				}

				await pb.collection('users').requestVerification(email)

				toast.success('Verification email sent')
				return true
			} catch (error) {
				console.log('Error sending verification email:', error)
				throw error
			}
		},
		onError: (error) => {
			toast.error('Failed to send verification email. Please try again.')
		}
	})

	const addEmail = useMutation({
		mutationFn: async (email: string) => {
			try {
				const response = await fetch(`${AUTH_SERVER}/add-email`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${pb.authStore.token}`
					},
					body: JSON.stringify({ email })
				})
				if (!response.ok) {
					const data = await response.json()
					throw new Error(data?.message || 'Failed to add email')
				}
				toast.success('Email added successfully')
			} catch (error: any) {
				toast.error(error.message || 'Failed to add email')
			}
		}
	})

	const setPromotionalEmails = useMutation({
		mutationFn: async (value: string) => {
			const response = await fetch(`${AUTH_SERVER}/user/promotional-emails`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${pb.authStore.token}`
				},
				body: JSON.stringify({ value })
			})
			if (!response.ok) {
				const data = await response.json()
				throw new Error(data?.message || 'Failed to update promotional emails preference')
			}

			return { value }
		},
		onSuccess: (data) => {
			queryClient.setQueryData(['currentUserAuthStatus'], (oldData: any) => {
				if (!oldData) return oldData
				return {
					...oldData,
					promotionalEmails: data.value
				}
			})
			toast.success('Email preferences updated successfully')
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to update email preferences')
		}
	})

	const userData = useMemo(() => {
		if (!authStoreState?.record) return null

		return {
			id: authStoreState.record.id,
			collectionId: authStoreState.record.collectionId,
			collectionName: authStoreState.record.collectionName,
			walletAddress: authStoreState.record.address,
			authMethod: authStoreState.record.auth_method,
			created: authStoreState.record.created,
			updated: authStoreState.record.updated,
			email: authStoreState.record.email,
			name: authStoreState.record.name,
			avatar: authStoreState.record.avatar,
			username: authStoreState.record.username,
			verified: authStoreState.record.email?.includes('@defillama.com') ? true : authStoreState.record.verified,
			emailVisibility: authStoreState.record.emailVisibility,
			expand: authStoreState.record.expand,
			has_active_subscription: authStoreState.record.has_active_subscription,
			flags: authStoreState.record.flags ?? {},
			ethereum_email: authStoreState.record.ethereum_email
		} as AuthModel
	}, [authStoreState])

	const contextValue: AuthContextType = {
		user: userData,
		login,
		signup,
		logout,
		authorizedFetch,
		signInWithEthereum,
		signInWithGithub,
		addWallet,
		resetPassword: resetPassword.mutate,
		changeEmail: changeEmail.mutate,
		resendVerification: resendVerification.mutate,
		addEmail: addEmail.mutate,
		setPromotionalEmails: setPromotionalEmails.mutate,
		isAuthenticated,
		hasActiveSubscription: userData?.has_active_subscription ?? false,
		loaders: {
			login: loginMutation.isPending,
			signup: signupMutation.isPending,
			logout: logoutMutation.isPending,
			signInWithEthereum: signInWithEthereumMutation.isPending,
			signInWithGithub: signInWithGithubMutation.isPending,
			addWallet: addWalletMutation.isPending,
			resetPassword: resetPassword.isPending,
			changeEmail: changeEmail.isPending,
			resendVerification: resendVerification.isPending,
			addEmail: addEmail.isPending,
			setPromotionalEmails: setPromotionalEmails.isPending,
			userLoading
		}
	}

	return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

function subscribeToUserHash(callback: () => void) {
	window.addEventListener('userHashChange', callback)
	return () => {
		window.removeEventListener('userHashChange', callback)
	}
}

export const useUserHash = () => {
	const { user, hasActiveSubscription, authorizedFetch } = useAuthContext()

	let email = user?.email ?? null
	if (user?.email && user.email.startsWith('0x') && user.email.endsWith('@defillama.com') && user.ethereum_email) {
		email = user.ethereum_email
	}

	const userHash = useSyncExternalStore(
		subscribeToUserHash,
		() => (email && hasActiveSubscription ? (localStorage.getItem('userHash') ?? null) : null),
		() => null
	)

	useQuery({
		queryKey: ['user-hash-front', email, hasActiveSubscription],
		queryFn: () =>
			authorizedFetch(`${AUTH_SERVER}/user/front-hash`)
				.then((res) => {
					if (!res.ok) {
						throw new Error('Failed to fetch user hash')
					}
					return res.json()
				})
				.then((data) => {
					const currentUserHash = localStorage.getItem('userHash')
					localStorage.setItem('userHash', data.userHash)
					if (currentUserHash !== data.userHash) {
						window.dispatchEvent(new Event('userHashChange'))
					}
					return data.userHash
				})
				.catch((err) => {
					console.log('Error fetching user hash:', err)
					const currentUserHash = localStorage.getItem('userHash')
					localStorage.removeItem('userHash')
					if (currentUserHash !== null) {
						window.dispatchEvent(new Event('userHashChange'))
					}
					return null
				}),
		enabled: email && hasActiveSubscription ? true : false,
		staleTime: 1000 * 60 * 60 * 24,
		refetchOnWindowFocus: false,
		retry: 3
	})

	return { userHash, email }
}
