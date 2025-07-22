import React, { createContext, useContext, useCallback, ReactNode, useState } from 'react'
import toast from 'react-hot-toast'
import pb, { AuthModel } from '~/utils/pocketbase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AUTH_SERVER } from '~/constants'
import { createSiweMessage } from 'viem/siwe'
interface User extends AuthModel {
	subscription_status: string
	subscription: {
		id: string
		expires_at: string
		status: string
	}
}
interface FetchOptions extends RequestInit {
	skipAuth?: boolean
}

export function getFieldError(error: any, key: string) {
	return error?.data?.[key]?.message
}

interface AuthContextType {
	login: (email: string, password: string, onSuccess?: () => void) => Promise<void>
	signup: (
		email: string,
		password: string,
		passwordConfirm: string,
		turnstileToken: string,
		onSuccess?: () => void
	) => Promise<void>
	logout: () => void
	authorizedFetch: (url: string, options?: FetchOptions, onlyToken?: boolean) => Promise<Response>
	signInWithEthereum: (address: string, signMessageFunction: any, onSuccess?: () => void) => Promise<void>
	signInWithGithub: (onSuccess?: () => void) => Promise<void>
	resetPassword: (email: string) => void
	changeEmail: (email: string) => void
	resendVerification: (email: string) => void
	addEmail: (email: string) => void
	isAuthenticated: boolean
	user: User
	loaders: {
		login: boolean
		signup: boolean
		logout: boolean
		signInWithEthereum: boolean
		signInWithGithub: boolean
		resetPassword: boolean
		changeEmail: boolean
		resendVerification: boolean
		addEmail: boolean
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
				console.error('Error refreshing auth:', error)

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
				console.error('Login error:', error)
				throw new Error('Invalid credentials')
			}
		},
		onSuccess: () => {
			setIsAuthenticated(true)
			queryClient.invalidateQueries()
			toast.success('Successfully signed in')
		},
		onError: () => {
			toast.error('Invalid email or password')
		}
	})

	const login = useCallback(
		async (email: string, password: string, onSuccess?: () => void) => {
			try {
				await loginMutation.mutateAsync({ email, password })
				queryClient.invalidateQueries({
					queryKey: ['subscription', pb.authStore.record?.id]
				})
				onSuccess?.()
			} catch (e) {
				console.error('Login error:', e)
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
			turnstileToken
		}: {
			email: string
			password: string
			passwordConfirm: string
			turnstileToken: string
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
					turnstile_token: turnstileToken
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
			onSuccess?: () => void
		) => {
			const result = await signupMutation.mutateAsync({ email, password, passwordConfirm, turnstileToken })
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
				console.error('Not authenticated')
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
			const getNonce = async (address: string) => {
				const response = await fetch(`${AUTH_SERVER}/nonce?address=${address}`)
				if (!response.ok) {
					throw new Error('Failed to get nonce')
				}
				return response.json()
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

			try {
				const response = await fetch(`${AUTH_SERVER}/eth-auth`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message, signature, address, issuedAt: issuedAt.toISOString() })
				})

				if (!response.ok) {
					throw new Error('Failed to sign in with Ethereum')
				}

				const { password, identity } = await response.json()

				await pb.collection('users').authWithPassword(identity, password)

				toast.success('Successfully signed in with Web3 wallet')

				return { address }
			} catch (error) {
				console.error('Ethereum sign-in error:', error)
				throw new Error('Failed to sign in with Ethereum')
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries()
			queryClient.refetchQueries()

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
				console.error('Ethereum sign-in error:', error)
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
				console.error('Github sign-in error:', error)
				throw new Error('Failed to sign in with Github')
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries()
			queryClient.refetchQueries()
			setIsAuthenticated(true)
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : 'Failed to connect with Github'
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
				toast.success('Successfully signed in with Github')
				return Promise.resolve()
			} catch (error) {
				console.error('Github sign-in error:', error)
				return Promise.reject(error)
			}
		},
		[signInWithGithubMutation, queryClient]
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
				console.error('Error sending verification email:', error)
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

	const contextValue: AuthContextType = {
		user: currentUserData
			? ({
					id: currentUserData.id!,
					collectionId: currentUserData.collectionId!,
					collectionName: currentUserData.collectionName!,
					walletAddress: pb.authStore.record?.walletAddress || '',
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
					ethereum_email: (currentUserData as any).ethereum_email
			  } as User)
			: null,
		login,
		signup,
		logout,
		authorizedFetch,
		signInWithEthereum,
		signInWithGithub,
		resetPassword: resetPassword.mutate,
		changeEmail: changeEmail.mutate,
		resendVerification: resendVerification.mutate,
		addEmail: addEmail.mutate,
		isAuthenticated: isAuthenticated,
		loaders: {
			login: loginMutation.isPending,
			signup: signupMutation.isPending,
			logout: logoutMutation.isPending,
			signInWithEthereum: signInWithEthereumMutation.isPending,
			signInWithGithub: signInWithGithubMutation.isPending,
			resetPassword: resetPassword.isPending,
			changeEmail: changeEmail.isPending,
			resendVerification: resendVerification.isPending,
			addEmail: addEmail.isPending,
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
