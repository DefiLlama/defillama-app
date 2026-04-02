import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AUTH_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscription/auth'
import { handleSimpleFetchResponse } from '~/utils/async'

interface AiBalance {
	freeRemaining: string
	toppedUpBalance: string
	freeLimit: string
	freeSpent: string
}

interface TopupRequest {
	amount: number
	provider: 'stripe' | 'llamapay'
	redirectUrl: string
	cancelUrl: string
}

type TopupResult = { provider: 'stripe'; clientSecret: string } | { provider: 'llamapay'; checkoutUrl: string }

export const TOPUP_CONFIG = {
	minAmount: 1,
	maxAmount: 500,
	quickAmounts: [5, 10, 25, 50]
} as const

const normalizeHttpErrorMessage = (message: string | undefined, fallbackMessage: string): string => {
	if (!message) return fallbackMessage
	if (!message.startsWith('[HTTP] [error]')) return message
	const colonIndex = message.indexOf(':')
	if (colonIndex === -1) return fallbackMessage
	const details = message.slice(colonIndex + 1).trim()
	return details || fallbackMessage
}

const getErrorMessage = (error: unknown, fallbackMessage: string): string =>
	error instanceof Error ? normalizeHttpErrorMessage(error.message, fallbackMessage) : fallbackMessage

export const useAiBalance = () => {
	const { user, isAuthenticated, authorizedFetch } = useAuthContext()!

	const {
		data: balance,
		isLoading,
		isError,
		refetch
	} = useQuery<AiBalance>({
		queryKey: ['ai-balance', user?.id],
		queryFn: async () => {
			const data = await authorizedFetch(`${AUTH_SERVER}/user/ai-balance`, {
				method: 'GET'
			})
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return data
		},
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false
	})

	const totalAvailable = balance ? parseFloat(balance.freeRemaining) + parseFloat(balance.toppedUpBalance) : 0

	return { balance, totalAvailable, isLoading, isError, refetch }
}

export const useCreateTopup = () => {
	const { isAuthenticated, authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()

	return useMutation<TopupResult, Error, TopupRequest>({
		mutationFn: async (topupData) => {
			if (!isAuthenticated) {
				throw new Error('Not authenticated')
			}

			const response = await authorizedFetch(
				`${AUTH_SERVER}/topup/create`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(topupData)
				},
				true
			)

			if (!response) {
				throw new Error('Not authenticated')
			}

			const normalizedResponse = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to create topup'))
			})

			return normalizedResponse.json()
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['ai-balance'] })
		}
	})
}
