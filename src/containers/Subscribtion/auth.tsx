import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createSiweMessage } from 'viem/siwe'
import { AUTH_SERVER } from '~/constants'
import pb, { AuthModel } from '~/utils/pocketbase'

export type PromotionalEmailsValue = 'initial' | 'on' | 'off'

interface User extends AuthModel {
	subscription_status: string
	subscription: {
		id: string
		expires_at: string
		status: string
	}
	promotionalEmails?: PromotionalEmailsValue
}
interface FetchOptions extends RequestInit {
	skipAuth?: boolean
}

export function getFieldError(error: any, key: string) {
	return error?.data?.[key]?.message
}

const getNonce = async (address: string) => {
	const response = await fetch(`${AUTH_SERVER}/nonce?address=${address}`)
	if (!response.ok) {
		throw new Error('Failed to get nonce')
	}
	return response.json()
}

interface AuthContextType {
	login: (email: string, password: string, onSuccess?: () => void) => Promise<void>
	signup: (
		email: string,
		password: string,
		passwordConfirm: string,
		turnstileToken: string,
		promotionalEmails?: boolean,
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
	setPromotionalEmails: (value: boolean) => void
	isAuthenticated: boolean
	user: User
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
		userFetching: boolean
		subscriptionError: boolean
	}
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const queryClient = useQueryClient()
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const [subscription, setSubscription] = useState<any>(null)
	const [isSubscriptionError, setIsSubscriptionError] = useState(false)

	const {
		data: currentUserData,
		isPending: userQueryIsPending,
		isFetching: userQueryIsFetching
	} = useQuery({
		queryKey: ['currentUserAuthStatus'],
		queryFn: async () => {
			if (!pb.authStore.token) {
				setIsAuthenticated(false)
				return null
			}
			try {
				const refreshResult = await pb.collection('users').authRefresh()
				setIsAuthenticated(true)
				return { ...refreshResult.record }
			} catch (error: any) {
				if (error?.isAbort || error?.message?.includes('autocancelled')) {
					if (pb.authStore.isValid && pb.authStore.record) {
						setIsAuthenticated(true)
						return { ...pb.authStore.record }
					}
					setIsAuthenticated(false)
					return null
				}

				console.log('Error refreshing auth:', error)

				if (error?.status === 401 || error?.code === 401) {
					pb.authStore.clear()
					setIsAuthenticated(false)
				} else {
					setIsAuthenticated(!!pb.authStore.token)
				}

				throw error
			}
		},
		enabled: true,
		staleTime: 5 * 60 * 1000,
		refetchOnMount: true,
		refetchOnWindowFocus: false,
		gcTime: 10 * 60 * 1000,
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
			setIsAuthenticated(true)
			queryClient.invalidateQueries()
			toast.success('Successfully signed in', { duration: 3000 })
		},
		onError: () => {
			toast.error('Invalid email or password')
		}
	})

	const login = useCallback(
		async (email: string, password: string, onSuccess?: () => void) => {
			try {
				await loginMutation.mutateAsync({ email, password })
				// queryClient.invalidateQueries({
				// 	queryKey: ['subscription', pb.authStore.record?.id]
				// })
				onSuccess?.()
			} catch (e) {
				console.log('Login error:', e)
				throw e
			}
		},
		[loginMutation, queryClient]
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
			promotionalEmails?: boolean
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
			setIsAuthenticated(true)
			sessionStorage.setItem('just_signed_up', 'true')
			queryClient.invalidateQueries()
			queryClient.setQueryData(['subscription', pb.authStore.record?.id], {
				subscription: { status: 'inactive' }
			})
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
			promotionalEmails?: boolean,
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
			pb.authStore.clear()
			return true
		},
		onSuccess: () => {
			setIsAuthenticated(false)
			queryClient.removeQueries({ queryKey: ['userWithSubscription'] })
			queryClient.clear()
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
		onSuccess: () => {
			queryClient.invalidateQueries()
			// queryClient.refetchQueries()

			setIsAuthenticated(true)
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
				queryClient.invalidateQueries({
					queryKey: ['subscription', pb.authStore.record?.id]
				})
				onSuccess?.()
				return Promise.resolve()
			} catch (error) {
				console.log('Ethereum sign-in error:', error)
				return Promise.reject(error)
			}
		},
		[signInWithEthereumMutation, queryClient]
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
		onSuccess: () => {
			queryClient.invalidateQueries()
			// queryClient.refetchQueries()
			setIsAuthenticated(true)
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
				queryClient.invalidateQueries({
					queryKey: ['subscription', pb.authStore.record?.id]
				})
				onSuccess?.()
				toast.success('Successfully signed in with GitHub')
				return Promise.resolve()
			} catch (error) {
				console.log('GitHub sign-in error:', error)
				return Promise.reject(error)
			}
		},
		[signInWithGithubMutation, queryClient]
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
				queryClient.invalidateQueries({ queryKey: ['currentUserAuthStatus'] })
				queryClient.invalidateQueries({ queryKey: ['subscription', pb.authStore.record?.id] })
				onSuccess?.()
				return Promise.resolve()
			} catch (error) {
				console.log('Add wallet error:', error)
				return Promise.reject(error)
			}
		},
		[addWalletMutation, queryClient]
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
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ['userWithSubscription'] })
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
		mutationFn: async (value: boolean) => {
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
					promotionalEmails: data.value ? 'on' : 'off'
				}
			})
			toast.success('Email preferences updated successfully')
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to update email preferences')
		}
	})

	const contextValue: AuthContextType = {
		user: currentUserData
			? ({
					id: currentUserData.id!,
					collectionId: currentUserData.collectionId!,
					collectionName: currentUserData.collectionName!,
					walletAddress: pb.authStore.record?.address || '',
					authMethod: pb.authStore.record?.auth_method || 'email',
					created: currentUserData.created!,
					updated: currentUserData.updated!,
					email: (currentUserData as any).email,
					name: (currentUserData as any).name,
					avatar: (currentUserData as any).avatar,
					username: (currentUserData as any).username,
					verified: (currentUserData as any).email?.includes('@defillama.com')
						? true
						: (currentUserData as any).verified,
					emailVisibility: (currentUserData as any).emailVisibility,
					expand: currentUserData.expand,
					subscription_status: subscription?.status || 'inactive',
					subscription: subscription || { id: '', expires_at: '', status: 'inactive' },
					ethereum_email: (currentUserData as any).ethereum_email,
					promotionalEmails: (currentUserData as any).promotionalEmails || 'initial'
				} as User)
			: null,
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
		isAuthenticated: isAuthenticated,
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
			userLoading: userQueryIsPending,
			userFetching: userQueryIsFetching,
			subscriptionError: isSubscriptionError
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
