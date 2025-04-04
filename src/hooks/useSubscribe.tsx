import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AUTH_SERVER, POCKETBASE_URL } from '../constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import toast from 'react-hot-toast'
import pb from '~/utils/pocketbase'
import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'

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
}

export interface SubscriptionResponse {
	subscription: Subscription
}

interface Credits {
	credits: number
	maxCredits: number
	monthKey: string
}

export const useSubscribe = () => {
	const { authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const [isStripeLoading, setIsStripeLoading] = useState(false)
	const [isLlamaLoading, setIsLlamaLoading] = useState(false)
	const [apiKey, setApiKey] = useState<string | null>(null)
	const [isApiKeyLoading, setIsApiKeyLoading] = useState(false)
	const isAuthenticated = !!pb.authStore.token

	const defaultInactiveSubscription = {
		subscription: {
			status: 'inactive',
			id: '',
			PK: '',
			checkoutUrl: '',
			updatedAt: '',
			expires_at: '',
			type: ''
		}
	}

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
		type: 'api' | 'contributor',
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
				redirectUrl: `${window.location.origin}/subscribtion?subscription=success`,
				cancelUrl: `${window.location.origin}/subscribtion?subscription=cancelled`,
				provider: paymentMethod,
				subscriptionType: type
			}

			queryClient.setQueryData(['subscription', pb.authStore.record?.id], defaultInactiveSubscription)

			const result = await createSubscription.mutateAsync(subscriptionData)

			if (result.checkoutUrl) {
				onSuccess?.(result.checkoutUrl)
				window.open(result.checkoutUrl, '_blank')
			}
		} catch (error) {
			console.error('Subscription error:', error)
			throw error
		} finally {
			setIsStripeLoading(false)
			setIsLlamaLoading(false)
		}
	}

	const {
		data: subscription,
		isLoading: isSubscriptionLoading,
		isFetching: isSubscriptionFetching,
		isPending: isSubscriptionPending,
		isError: isSubscriptionError
	} = useQuery<SubscriptionResponse>({
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
					},
					body: JSON.stringify({ subscriptionType: 'api' })
				})

				if (!response.ok) {
					console.log(`Subscription status error: ${response.status}`)
					return defaultInactiveSubscription
				}

				const data = await response.json()

				if (typeof window !== 'undefined') {
					if (data?.subscription?.status === 'active') {
						Cookies.set('subscription_status', 'active', {
							expires: 1,
							path: '/',
							sameSite: 'strict',
							secure: window.location.protocol === 'https:'
						})
					} else {
						Cookies.remove('subscription_status', { path: '/' })
					}
				}

				return data
			} catch (error) {
				console.error('Error fetching subscription:', error)
				return defaultInactiveSubscription
			}
		},
		placeholderData: defaultInactiveSubscription,
		retry: false,
		refetchOnWindowFocus: false,
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 15
	})

	const { data: isLlamafeedSubscriptionActive } = useQuery({
		queryKey: ['isLlamafeedSubscribed', pb.authStore.record?.id],
		queryFn: async () => {
			if (!isAuthenticated) {
				return false
			}

			try {
				const response = await fetch(`${AUTH_SERVER}/subscription/status`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${pb.authStore.token}`
					},
					body: JSON.stringify({ subscriptionType: 'llamafeed' })
				})

				if (!response.ok) {
					return false
				}

				const data = await response.json()
				console.log({ data })
				return data.subscription.status === 'active'
			} catch (error) {
				console.error('Error fetching subscription:', error)
				return false
			}
		}
	})

	useEffect(() => {
		const fetchApiKey = async () => {
			if (isAuthenticated && subscription?.subscription?.status === 'active') {
				setIsApiKeyLoading(true)
				try {
					const response = await authorizedFetch(`${AUTH_SERVER}/auth/get-api-key`)

					if (response?.ok) {
						const data = await response.json()
						setApiKey(data.apiKey.api_key || null)
					}
				} catch (error) {
					console.error('Error fetching API key:', error)
				} finally {
					setIsApiKeyLoading(false)
				}
			}
		}

		fetchApiKey()
	}, [isAuthenticated, subscription?.subscription?.status, authorizedFetch])

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
			}
		} catch (error) {
			console.error('Error generating API key:', error)
		} finally {
			setIsApiKeyLoading(false)
		}
	}

	const subscriptionData = isSubscriptionError
		? defaultInactiveSubscription.subscription
		: subscription?.subscription || defaultInactiveSubscription.subscription

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

			const response = await authorizedFetch(`${AUTH_SERVER}/user/credits`, {
				method: 'GET'
			})

			if (!response.ok) {
				throw new Error('Failed to fetch credits')
			}

			return response.json()
		},
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 5,
		retry: false
	})

	useEffect(() => {
		if (apiKey) {
			refetchCredits()
		}
	}, [apiKey])

	const createPortalSessionMutation = useMutation({
		mutationFn: async () => {
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
						returnUrl: window.location.href
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
			console.error('Failed to create portal session:', error)
			toast.error('Failed to access subscription management. Please try again.')
		}
	})

	const createPortalSession = async () => {
		if (!isAuthenticated) {
			toast.error('Please sign in to manage your subscription')
			return null
		}

		if (subscription?.subscription?.status !== 'active') {
			toast.error('No active Stripe subscription found')
			return null
		}

		try {
			const url = await createPortalSessionMutation.mutateAsync()
			if (url) {
				window.open(url, '_blank')
			}
			return url
		} catch (error) {
			return null
		}
	}

	return {
		createSubscription,
		handleSubscribe,
		isLoading: createSubscription.isPending,
		error: createSubscription.error,
		subscription: subscriptionData,
		loading: isStripeLoading ? 'stripe' : isLlamaLoading ? 'llamapay' : null,
		isSubscriptionLoading: isAuthenticated && isSubscriptionLoading,
		isSubscriptionFetching: isAuthenticated && isSubscriptionFetching,
		isSubscriptionPending: isAuthenticated && isSubscriptionPending,
		isSubscriptionError,
		apiKey,
		isApiKeyLoading,
		generateNewKey,
		credits: credits?.credits,
		isCreditsLoading,
		refetchCredits,
		createPortalSession,
		isPortalSessionLoading: createPortalSessionMutation.isPending,
		isLlamafeedSubscriptionActive,
		isContributor: false
	}
}
