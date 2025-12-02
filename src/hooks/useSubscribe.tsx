import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
import pb from '~/utils/pocketbase'
import { AUTH_SERVER } from '../constants'

export interface SubscriptionRequest {
	redirectUrl: string
	cancelUrl: string
	provider: string
	subscriptionType: string
	billingInterval?: 'year' | 'month'
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
	billing_interval?: 'year' | 'month'
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
const defaultInactiveSubscription: SubscriptionResponse = {
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

const API_KEY_LOCAL_STORAGE_KEY = 'pro_apikey'
const API_KEY_LISTENER_KEY = 'apiKeyChange'

function subscribeToApiKeyInLocalStorage(callback: () => void) {
	window.addEventListener(API_KEY_LISTENER_KEY, callback)

	return () => {
		window.removeEventListener(API_KEY_LISTENER_KEY, callback)
	}
}

async function fetchSubscription({
	type,
	isAuthenticated
}: {
	type: 'api' | 'llamafeed' | 'legacy'
	isAuthenticated: boolean
}): Promise<SubscriptionResponse> {
	if (!isAuthenticated) {
		return defaultInactiveSubscription
	}

	try {
		const response = await fetch(`${AUTH_SERVER}/subscription/status`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${pb.authStore.token}`
			},
			body: JSON.stringify({ subscriptionType: type })
		})

		if (!response.ok) {
			return defaultInactiveSubscription
		}

		const data = await response.json()
		if (type === 'llamafeed' && (data?.subscription?.type === 'api' || data?.subscription?.type === 'legacy')) {
			return defaultInactiveSubscription
		}

		return data
	} catch (error) {
		console.log('Error fetching subscription:', error)
		return defaultInactiveSubscription
	}
}

const useSubscription = (type: 'api' | 'llamafeed' | 'legacy') => {
	const { isAuthenticated } = useAuthContext()!

	const data = useQuery<SubscriptionResponse>({
		queryKey: ['subscription', pb.authStore.record?.id, type],
		queryFn: () => fetchSubscription({ type, isAuthenticated }),
		placeholderData: defaultInactiveSubscription,
		retry: false,
		refetchOnWindowFocus: false,
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 15
	})

	return data
}

export const useSubscribe = () => {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const [isStripeLoading, setIsStripeLoading] = useState(false)
	const [isLlamaLoading, setIsLlamaLoading] = useState(false)
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
		onSuccess?: (checkoutUrl: string) => void,
		billingInterval: 'year' | 'month' = 'month',
		useEmbedded: boolean = false
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
				subscriptionType: type || 'api',
				billingInterval
			}

			queryClient.setQueryData(['subscription', pb.authStore.record?.id, type], defaultInactiveSubscription)

			const result = await createSubscription.mutateAsync(subscriptionData)

			// For embedded mode, return the result instead of opening a new tab
			if (useEmbedded) {
				return result
			}

			// For legacy redirect mode
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
		data: apiSubscription,
		isLoading: isApiSubscriptionLoading,
		isFetching: isApiSubscriptionFetching,
		isPending: isApiSubscriptionPending,
		isError: isApiSubscriptionError
	} = useSubscription('api')
	const {
		data: llamafeedSubscription,
		isLoading: isLlamafeedSubscriptionLoading,
		isFetching: isLlamafeedSubscriptionFetching,
		isPending: isLlamafeedSubscriptionPending,
		isError: isLlamafeedSubscriptionError
	} = useSubscription('llamafeed')
	const {
		data: legacySubscription,
		isLoading: isLegacySubscriptionLoading,
		isFetching: isLegacySubscriptionFetching,
		isPending: isLegacySubscriptionPending,
		isError: isLegacySubscriptionError
	} = useSubscription('legacy')

	const apiKeyQuery = useQuery({
		queryKey: ['apiKey', pb.authStore.record?.id],
		queryFn: async () => {
			try {
				const data: { apiKey: { api_key: string } } = await authorizedFetch(`${AUTH_SERVER}/auth/get-api-key`)
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())
				const newApiKey = data.apiKey?.api_key ?? null
				const currentApiKey = window.localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY)
				if (newApiKey !== currentApiKey) {
					window.localStorage.setItem(API_KEY_LOCAL_STORAGE_KEY, newApiKey)
					window.dispatchEvent(new Event(API_KEY_LISTENER_KEY))
				}
				return newApiKey
			} catch (error) {
				throw new Error(error instanceof Error ? error.message : 'Failed to fetch API key')
			}
		},
		staleTime: 24 * 60 * 60 * 1000, // 24 hours
		refetchOnWindowFocus: false,
		enabled: isAuthenticated && apiSubscription?.subscription?.status === 'active' && router.pathname === '/account'
	})

	const generateNewKeyMutation = useMutation({
		mutationFn: async () => {
			try {
				const data: { apiKey: string } = await authorizedFetch(`${AUTH_SERVER}/auth/generate-api-key`, {
					method: 'POST'
				})
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())
				const newApiKey = data.apiKey ?? null
				const currentApiKey = window.localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY)
				if (newApiKey !== currentApiKey) {
					window.localStorage.setItem(API_KEY_LOCAL_STORAGE_KEY, newApiKey)
					window.dispatchEvent(new Event(API_KEY_LISTENER_KEY))
				}
				return newApiKey
			} catch (error) {
				throw new Error(error instanceof Error ? error.message : 'Failed to generate API key')
			}
		}
	})

	const apiKey = useSyncExternalStore(
		subscribeToApiKeyInLocalStorage,
		() => localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY) ?? null,
		() => null
	)

	const subscriptionData =
		[apiSubscription?.subscription, llamafeedSubscription?.subscription, legacySubscription?.subscription].find(
			(subscription) => subscription?.status === 'active'
		) || defaultInactiveSubscription.subscription

	const {
		data: credits,
		isLoading: isCreditsLoading,
		refetch: refetchCredits
	} = useQuery<Credits>({
		queryKey: ['credits', pb.authStore.record?.id, apiKey],
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
			queryClient.invalidateQueries({ queryKey: ['subscription', pb.authStore.record?.id, 'api'] })
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
		isSubscriptionLoading:
			isApiSubscriptionLoading ||
			isLlamafeedSubscriptionLoading ||
			isLegacySubscriptionLoading ||
			isApiSubscriptionFetching ||
			isLlamafeedSubscriptionFetching ||
			isLegacySubscriptionFetching ||
			isApiSubscriptionPending ||
			isLlamafeedSubscriptionPending ||
			isLegacySubscriptionPending,
		isSubscriptionFetching:
			isAuthenticated && (isApiSubscriptionFetching || isLlamafeedSubscriptionFetching || isLegacySubscriptionFetching),
		isSubscriptionPending:
			isAuthenticated && (isApiSubscriptionPending || isLlamafeedSubscriptionPending || isLegacySubscriptionPending),
		isSubscriptionError:
			isAuthenticated && (isApiSubscriptionError || isLlamafeedSubscriptionError || isLegacySubscriptionError),
		apiKey,
		isApiKeyLoading: apiKey === null && apiKeyQuery.isLoading,
		generateNewKeyMutation,
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
		legacySubscription: legacySubscription?.subscription
	}
}
