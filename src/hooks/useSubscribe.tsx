import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import pb from '~/utils/pocketbase'
import { AUTH_SERVER, POCKETBASE_URL } from '../constants'

export interface SubscriptionRequest {
	redirectUrl: string
	cancelUrl: string
	provider: string
	subscriptionType: string
}

export interface SubscriptionCreateResponse {
	subscriptionId: string
	checkoutUrl: string
}

export interface Subscription {
	PK: string
	checkoutUrl: string
	id: string
	status: string
	updatedAt: string
	expires_at: string
	started_at?: string
	type: string
	provider: string
	overage?: boolean
	metadata?: {
		is_trial?: boolean
		trial_started_at?: string
	}
}

export interface SubscriptionResponse {
	subscription: Subscription
}

interface Credits {
	credits: number
	maxCredits: number
	monthKey: string
}
const defaultInactiveSubscription = {
	subscription: {
		status: 'inactive',
		id: '',
		PK: '',
		checkoutUrl: '',
		updatedAt: '',
		expires_at: '',
		type: '',
		provider: ''
	}
}

const useUserStatus = () => {
	const { isAuthenticated, authorizedFetch } = useAuthContext()!

	const data = useQuery({
		queryKey: ['userStatus', pb.authStore.record?.id],
		queryFn: async () => {
			if (!isAuthenticated) {
				return { subscriptions: [], featureFlags: {} }
			}

			try {
				const response = await authorizedFetch(`${AUTH_SERVER}/user/status`)

				if (!response?.ok) {
					console.log(`User status error: ${response?.status}`)
					return { subscriptions: [], featureFlags: {} }
				}

				return response.json()
			} catch (error) {
				console.log('Error fetching user status:', error)
				return { subscriptions: [], featureFlags: {} }
			}
		},
		retry: false,
		refetchOnWindowFocus: false,
		enabled: isAuthenticated,
		placeholderData: (previousData) => previousData,
		staleTime: 1000 * 60 * 15,
		gcTime: 60 * 60 * 1000
	})

	return data
}

export const useSubscribe = () => {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const [isStripeLoading, setIsStripeLoading] = useState(false)
	const [isLlamaLoading, setIsLlamaLoading] = useState(false)
	const [apiKey, setApiKey] = useState<string | null>(null)
	const [isApiKeyLoading, setIsApiKeyLoading] = useState(false)
	const isAuthenticated = !!pb.authStore.token

	const createSubscription = useMutation<SubscriptionCreateResponse, Error, SubscriptionRequest>({
		mutationFn: async (subscriptionData) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/subscription/create`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(subscriptionData)
				},
				true
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to create subscription')
			}

			return response.json()
		}
	})

	const handleSubscribe = async (
		paymentMethod: 'stripe' | 'llamapay',
		type: 'api' | 'contributor' | 'llamafeed',
		onSuccess?: (checkoutUrl: string) => void
	) => {
		if (!isAuthenticated) {
			toast.error('Please sign in to subscribe')
			return
		}

		try {
			if (paymentMethod === 'stripe') {
				setIsStripeLoading(true)
			} else {
				setIsLlamaLoading(true)
			}

			const subscriptionData: SubscriptionRequest = {
				redirectUrl: `${window.location.origin}/subscription?subscription=success`,
				cancelUrl: `${window.location.origin}/subscription?subscription=cancelled`,
				provider: paymentMethod,
				subscriptionType: type || 'api'
			}

			queryClient.invalidateQueries({ queryKey: ['userStatus', pb.authStore.record?.id] })

			const result = await createSubscription.mutateAsync(subscriptionData)

			if (result.checkoutUrl) {
				onSuccess?.(result.checkoutUrl)
				window.open(result.checkoutUrl, '_blank')
			}
		} catch (error) {
			console.log('Subscription error:', error)
			throw error
		} finally {
			setIsStripeLoading(false)
			setIsLlamaLoading(false)
		}
	}

	const {
		data: userStatus,
		isLoading: isUserStatusLoading,
		isFetching: isUserStatusFetching,
		isPending: isUserStatusPending,
		isError: isUserStatusError
	} = useUserStatus()

	const apiSubscription = {
		subscription: userStatus?.subscriptions?.find((s: any) => s.type === 'api') || defaultInactiveSubscription.subscription
	}
	const llamafeedSubscription = {
		subscription:
			userStatus?.subscriptions?.find((s: any) => s.type === 'llamafeed' || s.type === 'api') ||
			defaultInactiveSubscription.subscription
	}
	const legacySubscription = {
		subscription: userStatus?.subscriptions?.find((s: any) => s.type === 'legacy') || defaultInactiveSubscription.subscription
	}

	useEffect(() => {
		if (router.pathname !== '/subscription') return
		const fetchApiKey = async () => {
			if (isAuthenticated && apiSubscription?.subscription?.status === 'active') {
				setIsApiKeyLoading(true)
				try {
					const response = await authorizedFetch(`${AUTH_SERVER}/auth/get-api-key`)

					if (response?.ok) {
						const data = await response.json()
						setApiKey(data.apiKey.api_key || null)
						window.localStorage.setItem('pro_apikey', data.apiKey.api_key)
					}
				} catch (error) {
					console.log('Error fetching API key:', error)
				} finally {
					setIsApiKeyLoading(false)
				}
			}
		}

		fetchApiKey()
	}, [isAuthenticated, apiSubscription?.subscription?.status, authorizedFetch, router.pathname])

	const generateNewKey = async () => {
		setIsApiKeyLoading(true)
		try {
			const response = await authorizedFetch(`${AUTH_SERVER}/auth/generate-api-key`, {
				method: 'POST'
			})

			if (response?.ok) {
				const data = await response.json()
				console.log({ data })
				setApiKey(data.apiKey || null)
				window.localStorage.setItem('pro_apikey', data.apiKey)
			}
		} catch (error) {
			console.log('Error generating API key:', error)
		} finally {
			setIsApiKeyLoading(false)
		}
	}

	const subscriptionData =
		[apiSubscription?.subscription, llamafeedSubscription?.subscription, legacySubscription?.subscription].find(
			(subscription) => subscription?.status === 'active'
		) || defaultInactiveSubscription.subscription

	const {
		data: credits,
		isLoading: isCreditsLoading,
		refetch: refetchCredits
	} = useQuery<Credits>({
		queryKey: ['credits', pb.authStore.record?.id],
		queryFn: async () => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			if (router.pathname !== '/subscription') {
				return { credits: 0, maxCredits: 0, monthKey: '' }
			}

			const response = await authorizedFetch(`${AUTH_SERVER}/user/credits`, {
				method: 'GET'
			})

			if (!response.ok) {
				throw new Error('Failed to fetch credits')
			}

			return response.json()
		},
		enabled: isAuthenticated && router.pathname === '/subscription',
		staleTime: 1000 * 60 * 5,
		retry: false
	})

	useEffect(() => {
		if (apiKey) {
			refetchCredits()
		}
	}, [apiKey])

	const createPortalSessionMutation = useMutation({
		mutationFn: async (subscriptionType?: string) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/subscription/billing-portal`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						returnUrl: window.location.href,
						type: subscriptionType
					})
				},
				true
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to create portal session')
			}

			const data = await response.json()
			return data.url
		},
		onError: (error) => {
			console.log('Failed to create portal session:', error)
			toast.error('Failed to access subscription management. Please try again.')
		}
	})

	const createPortalSession = async (subscriptionType?: string) => {
		if (!isAuthenticated) {
			toast.error('Please sign in to manage your subscription')
			return null
		}

		if (
			apiSubscription?.subscription?.status !== 'active' &&
			llamafeedSubscription?.subscription?.status !== 'active' &&
			legacySubscription?.subscription?.status !== 'active'
		) {
			toast.error('No active subscription found')
			return null
		}

		try {
			const typeToSend = subscriptionType || subscriptionData.type
			const url = await createPortalSessionMutation.mutateAsync(typeToSend)
			if (url) {
				window.open(url, '_blank')
			}
			return url
		} catch (error) {
			return null
		}
	}

	const enableOverageMutation = useMutation({
		mutationFn: async () => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/subscription/enable-overage`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					}
				},
				true
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to enable overage')
			}

			return response.json()
		},
		onSuccess: () => {
			toast.success('Overage has been enabled successfully')
			queryClient.invalidateQueries({ queryKey: ['userStatus', pb.authStore.record?.id] })
		},
		onError: (error) => {
			console.log('Failed to enable overage:', error)
			toast.error('Failed to enable overage. Please try again.')
		}
	})

	const enableOverage = async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to enable overage')
			return
		}

		if (apiSubscription?.subscription?.status !== 'active') {
			toast.error('No active API subscription found')
			return
		}

		try {
			await enableOverageMutation.mutateAsync()
		} catch (error) {
			console.log('Enable overage error:', error)
		}
	}

	return {
		createSubscription,
		handleSubscribe,
		isLoading: createSubscription.isPending,
		error: createSubscription.error,
		subscription: subscriptionData,
		hasActiveSubscription: subscriptionData?.status === 'active',
		loading: isStripeLoading ? 'stripe' : isLlamaLoading ? 'llamapay' : null,
		isSubscriptionLoading: isUserStatusLoading && !userStatus,
		isSubscriptionFetching: isAuthenticated && isUserStatusFetching,
		isSubscriptionPending: isAuthenticated && isUserStatusPending,
		isSubscriptionError: isAuthenticated && isUserStatusError,
		apiKey,
		isApiKeyLoading,
		generateNewKey,
		credits: credits?.credits,
		isCreditsLoading,
		refetchCredits,
		createPortalSession,
		isPortalSessionLoading: createPortalSessionMutation.isPending,
		enableOverage,
		isEnableOverageLoading: enableOverageMutation.isPending,
		isContributor: false,
		apiSubscription: apiSubscription?.subscription,
		llamafeedSubscription: llamafeedSubscription?.subscription,
		legacySubscription: legacySubscription?.subscription,
		featureFlags: userStatus?.featureFlags || {},
		hasFeature: (feature: string) => Boolean(userStatus?.featureFlags?.[feature])
	}
}
