import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import toast from 'react-hot-toast'
import { AUTH_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { getStorageItem, removeStorageItem, setStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'
import { handleSimpleFetchResponse } from '~/utils/async'
import pb from '~/utils/pocketbase'

interface SubscriptionRequest {
	redirectUrl: string
	cancelUrl: string
	provider: string
	subscriptionType: string
	billingInterval?: 'year' | 'month'
	isTrial?: boolean
}

interface SubscriptionCreateResponse {
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
		isTrial?: boolean
		trial_started_at?: string
		isCanceled?: string
	}
}

interface SubscriptionResponse {
	subscription: Subscription
}

interface Credits {
	credits: number
	maxCredits: number
	monthKey: string
}
const defaultInactiveSubscription: Subscription = {
	status: 'inactive',
	id: '',
	PK: '',
	checkoutUrl: '',
	updatedAt: '',
	expires_at: '',
	type: '',
	provider: ''
}

const API_KEY_LOCAL_STORAGE_KEY = 'pro_apikey'

async function fetchSubscription({ isAuthenticated }: { isAuthenticated: boolean }): Promise<Subscription> {
	if (!isAuthenticated) {
		return defaultInactiveSubscription
	}

	try {
		const response = await fetch(`${AUTH_SERVER}/subscription/status`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${pb.authStore.token}`
			}
		})

		if (!response.ok) {
			return defaultInactiveSubscription
		}

		const data: SubscriptionResponse = await response.json()

		return data?.subscription
	} catch (error) {
		console.log('Error fetching subscription:', error)
		return defaultInactiveSubscription
	}
}

export const useSubscribe = () => {
	const router = useRouter()
	const { user, isAuthenticated, authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const [isPayingWithStripe, setIsPayingWithStripe] = useState(false)
	const [isPayingWithLlamapay, setIsPayingWithLlamapay] = useState(false)

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

	const handleSubscribe = useCallback(
		async (
			paymentMethod: 'stripe' | 'llamapay',
			type: 'api' | 'llamafeed',
			onSuccess?: (checkoutUrl: string) => void,
			billingInterval: 'year' | 'month' = 'month',
			useEmbedded: boolean = false,
			isTrial: boolean = false
		) => {
			if (!isAuthenticated) {
				toast.error('Please sign in to subscribe')
				return
			}

			const subscriptionType = type || 'api'
			const userId = user?.id
			try {
				if (paymentMethod === 'stripe') {
					setIsPayingWithStripe(true)
				} else {
					setIsPayingWithLlamapay(true)
				}

				const subscriptionData: SubscriptionRequest = {
					redirectUrl: `${window.location.origin}/subscription?subscription=success`,
					cancelUrl: `${window.location.origin}/subscription?subscription=cancelled`,
					provider: paymentMethod,
					subscriptionType,
					billingInterval,
					isTrial
				}

				queryClient.setQueryData(['subscription', userId], defaultInactiveSubscription)
				queryClient.invalidateQueries({ queryKey: ['currentUserAuthStatus'] })

				const result = await createSubscription.mutateAsync(subscriptionData)

				// For embedded mode, return the result instead of redirecting
				if (useEmbedded) {
					return result
				}

				// Navigate to checkout URL in same window
				if (result.checkoutUrl) {
					if (onSuccess) {
						onSuccess(result.checkoutUrl)
					}
					window.location.href = result.checkoutUrl
				}
			} catch (error) {
				console.log('Subscription error:', error)
				throw error
			} finally {
				setIsPayingWithStripe(false)
				setIsPayingWithLlamapay(false)
			}
		},
		[isAuthenticated, queryClient, user?.id, createSubscription]
	)

	const subscriptionQuery = useQuery({
		queryKey: ['subscription', user?.id],
		queryFn: () => fetchSubscription({ isAuthenticated }),
		retry: false,
		refetchOnWindowFocus: false,
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 15
	})

	const subscriptionData = subscriptionQuery?.data ?? null

	const apiSubscription = subscriptionData?.type === 'api' ? subscriptionData : defaultInactiveSubscription

	const llamafeedSubscription = subscriptionData?.type === 'llamafeed' ? subscriptionData : defaultInactiveSubscription

	const legacySubscription = subscriptionData?.provider === 'legacy' ? subscriptionData : defaultInactiveSubscription

	useEffect(() => {
		if (subscriptionData?.status === 'active' && !user?.has_active_subscription) {
			queryClient.invalidateQueries({ queryKey: ['currentUserAuthStatus'] })
		}
	}, [subscriptionData?.status, user?.has_active_subscription, queryClient])

	const isSubscriptionLoading = subscriptionQuery.isLoading && subscriptionData == null
	const isSubscriptionError = subscriptionQuery.isError && !subscriptionData

	const trialAvailabilityQuery = useQuery({
		queryKey: ['trialAvailable', user?.id],
		queryFn: async () => {
			const response = await authorizedFetch(`${AUTH_SERVER}/subscription/trial-available`)

			if (!response.ok) {
				return { trialAvailable: false }
			}
			return response.json()
		},
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 15,
		refetchOnWindowFocus: false
	})

	const apiKeyQuery = useQuery({
		queryKey: ['apiKey', user?.id],
		queryFn: async () => {
			try {
				const data: { apiKey: { api_key: string } } = await authorizedFetch(`${AUTH_SERVER}/auth/get-api-key`)
					.then(handleSimpleFetchResponse)
					.then((res) => res.json())
				const newApiKey = data.apiKey?.api_key ?? null
				const currentApiKey = getStorageItem(API_KEY_LOCAL_STORAGE_KEY, null)
				if (newApiKey !== currentApiKey) {
					if (newApiKey === null) {
						removeStorageItem(API_KEY_LOCAL_STORAGE_KEY)
					} else {
						setStorageItem(API_KEY_LOCAL_STORAGE_KEY, newApiKey)
					}
				}
				return newApiKey
			} catch (error) {
				throw new Error(error instanceof Error ? error.message : 'Failed to fetch API key')
			}
		},
		staleTime: 24 * 60 * 60 * 1000, // 24 hours
		refetchOnWindowFocus: false,
		enabled: isAuthenticated && apiSubscription?.status === 'active' && router.pathname === '/account'
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
				const currentApiKey = getStorageItem(API_KEY_LOCAL_STORAGE_KEY, null)
				if (newApiKey !== currentApiKey) {
					if (newApiKey === null) {
						removeStorageItem(API_KEY_LOCAL_STORAGE_KEY)
					} else {
						setStorageItem(API_KEY_LOCAL_STORAGE_KEY, newApiKey)
					}
				}
				return newApiKey
			} catch (error) {
				throw new Error(error instanceof Error ? error.message : 'Failed to generate API key')
			}
		}
	})

	const apiKey = useSyncExternalStore(
		(callback) => subscribeToStorageKey(API_KEY_LOCAL_STORAGE_KEY, callback),
		() => getStorageItem(API_KEY_LOCAL_STORAGE_KEY, null),
		() => null
	)

	const {
		data: credits,
		isLoading: isCreditsLoading,
		refetch: refetchCredits
	} = useQuery<Credits>({
		queryKey: ['credits', user?.id, apiKey],
		queryFn: async () => {
			const data = await authorizedFetch(`${AUTH_SERVER}/user/credits`, {
				method: 'GET'
			})
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return data
		},
		enabled: isAuthenticated && router.pathname === '/account',
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
		retry: false
	})

	const usageStatsQuery = useQuery({
		queryKey: ['usageStats', user?.id],
		queryFn: async () => {
			const response = await authorizedFetch(`${AUTH_SERVER}/user/usage-stats`, {
				method: 'GET'
			})

			if (!response) {
				return null
			}

			const data = await handleSimpleFetchResponse(response).then((res) => res.json())

			return data
		},
		enabled: isAuthenticated && apiSubscription?.status === 'active' && router.pathname === '/account',
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
		retry: false
	})

	const { mutateAsync: createPortalSessionAsync, isPending: isPortalSessionLoading } = useMutation({
		mutationFn: async () => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const data = await authorizedFetch(
				`${AUTH_SERVER}/subscription/billing-portal`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						returnUrl: window.location.href
					})
				},
				true
			)
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())
				.catch((error) => {
					console.log('Failed to create portal session:', error)
					return null
				})

			return data?.url
		},
		onError: (error) => {
			console.log('Failed to create portal session:', error)
		}
	})

	const createPortalSession = useCallback(async () => {
		if (!isAuthenticated) {
			return null
		}

		try {
			const url = await createPortalSessionAsync()
			if (url) {
				window.location.href = url
			}
			return url
		} catch {
			return null
		}
	}, [isAuthenticated, createPortalSessionAsync])

	const endTrialMutation = useMutation({
		mutationFn: async () => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(`${AUTH_SERVER}/subscription/end-trial`, {
				method: 'POST'
			})

			if (!response.ok) {
				throw new Error('Failed to end trial subscription')
			}

			return response.json()
		},
		onSuccess: async () => {
			toast.success('Trial upgrade successful')
			await queryClient.invalidateQueries({ queryKey: ['currentUserAuthStatus'] })
			await queryClient.invalidateQueries({ queryKey: ['subscription'] })
		},
		onError: (error) => {
			console.log('End trial subscription error:', error)
		}
	})

	const getPortalSessionUrl = useCallback(async () => {
		if (!isAuthenticated) {
			throw new Error('Not authenticated')
		}

		const url = await createPortalSessionAsync()
		return url
	}, [isAuthenticated, createPortalSessionAsync])

	const enableOverageMutation = useMutation({
		mutationFn: async () => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const data = await authorizedFetch(
				`${AUTH_SERVER}/subscription/enable-overage`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					}
				},
				true
			)
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return data
		},
		onSuccess: () => {
			toast.success('Overage has been enabled successfully')
			queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] })
		},
		onError: (error) => {
			console.log('Failed to enable overage:', error)
			toast.error('Failed to enable overage. Please try again.')
		}
	})

	const cancelSubscriptionMutation = useMutation({
		mutationFn: async (message?: string) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/subscription/cancel`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ message })
				},
				true
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to cancel subscription')
			}

			return response.json()
		},
		onSuccess: () => {
			toast.success('Subscription scheduled for cancellation')
			queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] })
		},
		onError: (error) => {
			console.log('Cancel subscription error:', error)
			toast.error('Failed to cancel subscription. Please try again or contact support.')
		}
	})

	const enableOverage = useCallback(async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to enable overage')
			return
		}

		if (apiSubscription.status !== 'active') {
			toast.error('No active API subscription found')
			return
		}

		try {
			await enableOverageMutation.mutateAsync()
		} catch (error) {
			console.log('Enable overage error:', error)
		}
	}, [isAuthenticated, apiSubscription.status, enableOverageMutation])

	return {
		handleSubscribe,
		isLoading: createSubscription.isPending,
		error: createSubscription.error,
		subscription: subscriptionData ?? defaultInactiveSubscription,
		hasActiveSubscription: subscriptionData?.status === 'active',
		loading: isPayingWithStripe ? 'stripe' : isPayingWithLlamapay ? 'llamapay' : null,
		isSubscriptionLoading,
		isSubscriptionError,
		apiKey,
		isApiKeyLoading: apiKey === null && apiKeyQuery.isLoading,
		generateNewKeyMutation,
		credits: credits?.credits,
		isCreditsLoading,
		refetchCredits,
		getPortalSessionUrl,
		createPortalSession,
		endTrialSubscription: endTrialMutation.mutateAsync,
		isEndTrialLoading: endTrialMutation.isPending,
		isPortalSessionLoading,
		enableOverage,
		isEnableOverageLoading: enableOverageMutation.isPending,
		apiSubscription: apiSubscription,
		llamafeedSubscription: llamafeedSubscription,
		legacySubscription: legacySubscription,
		isTrialAvailable: trialAvailabilityQuery.data?.trialAvailable ?? false,
		usageStats: usageStatsQuery.data ?? null,
		isUsageStatsLoading: usageStatsQuery.isLoading,
		isUsageStatsError: usageStatsQuery.isError,
		cancelSubscription: cancelSubscriptionMutation.mutateAsync,
		isCancelSubscriptionLoading: cancelSubscriptionMutation.isPending
	}
}
