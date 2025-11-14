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

export const SUBSCRIPTION_TYPE = {
	API: 'api',
	PRO: 'llamafeed',
	LEGACY: 'legacy'
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
		provider: '',
		billing_interval: 'month'
	} as Subscription
}

const useSubscription = () => {
	const { isAuthenticated } = useAuthContext()!

	return useQuery<SubscriptionResponse>({
		queryKey: ['subscription', pb.authStore.record?.id],
		queryFn: async () => {
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
					console.log(`Subscription status error: ${response.status}`)
					return defaultInactiveSubscription
				}

				const data = await response.json()
				return data
			} catch (error) {
				console.log('Error fetching subscription:', error)
				return defaultInactiveSubscription
			}
		},
		placeholderData: defaultInactiveSubscription,
		retry: false,
		refetchOnWindowFocus: false,
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 15
	})
}

export const useSubscribe = () => {
	const router = useRouter()
	const { authorizedFetch, isAuthenticated, user } = useAuthContext()!
	const queryClient = useQueryClient()
	const [isStripeLoading, setIsStripeLoading] = useState(false)
	const [isLlamaPayLoading, setIsLlamaPayLoading] = useState(false)
	const [apiKey, setApiKey] = useState<string | null>(null)
	const [isApiKeyLoading, setIsApiKeyLoading] = useState(false)

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
				setIsLlamaPayLoading(true)
			}

			const subscriptionData: SubscriptionRequest = {
				redirectUrl: `${window.location.origin}/subscription?subscription=success`,
				cancelUrl: `${window.location.origin}/subscription?subscription=cancelled`,
				provider: paymentMethod,
				subscriptionType: type || 'api',
				billingInterval
			}

			queryClient.setQueryData(['subscription', pb.authStore.record?.id], defaultInactiveSubscription)

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
			setIsLlamaPayLoading(false)
		}
	}

	const {
		data: subscriptionResponse,
		isLoading: isSubscriptionLoading,
		isFetching: isSubscriptionFetching,
		isPending: isSubscriptionPending,
		isError: isSubscriptionError
	} = useSubscription()

	const subscription = subscriptionResponse?.subscription || defaultInactiveSubscription.subscription
	const subscriptionType = subscription?.type

	// backward-compatible individual subscription objects
	const apiSubscription =
		subscriptionType === SUBSCRIPTION_TYPE.API ? subscription : defaultInactiveSubscription.subscription
	const llamafeedSubscription =
		subscriptionType === SUBSCRIPTION_TYPE.PRO ? subscription : defaultInactiveSubscription.subscription
	const legacySubscription =
		subscriptionType === SUBSCRIPTION_TYPE.LEGACY ? subscription : defaultInactiveSubscription.subscription

	useEffect(() => {
		if (router.pathname !== '/account') return
		const fetchApiKey = async () => {
			if (isAuthenticated && subscriptionType === SUBSCRIPTION_TYPE.API && subscription?.status === 'active') {
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
	}, [isAuthenticated, subscriptionType, subscription?.status, authorizedFetch, router.pathname])

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

	const {
		data: credits,
		isLoading: isCreditsLoading,
		refetch: refetchCredits
	} = useQuery<Credits>({
		queryKey: ['credits', user?.id],
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

		if (subscription?.status !== 'active') {
			toast.error('No active subscription found')
			return null
		}

		try {
			const typeToSend = subscriptionType || subscription.type
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
			queryClient.invalidateQueries({ queryKey: ['subscription', pb.authStore.record?.id] })
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

		if (subscriptionType !== 'api' && subscription?.status !== 'active') {
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
		subscription,
		hasActiveSubscription: subscription?.status === 'active',

		isSubscriptionLoading: isSubscriptionLoading || isSubscriptionPending,
		isSubscriptionFetching,
		isSubscriptionError,

		apiSubscription,
		llamafeedSubscription,
		legacySubscription,

		apiKey,
		isApiKeyLoading,
		generateNewKey,
		credits: credits?.credits,
		isCreditsLoading,
		refetchCredits,

		createSubscription,
		handleSubscribe,
		createPortalSession,
		enableOverage,

		loading: isStripeLoading ? 'stripe' : isLlamaPayLoading ? 'llamapay' : null,
		isLoading: createSubscription.isPending,
		error: createSubscription.error,
		isPortalSessionLoading: createPortalSessionMutation.isPending,
		isEnableOverageLoading: enableOverageMutation.isPending
	}
}
