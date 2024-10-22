import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SERVER_API } from '../lib/constants'

export const generateNewApiKey = async ({ authToken }: { authToken?: string | null }) => {
	const toastId = toast.loading('Generating new API Key')
	try {
		if (!authToken) {
			throw new Error('Not Authorized')
		}

		const newApiKey = await fetch(`${SERVER_API}/auth/generate`, {
			method: 'POST',
			headers: {
				Authorization: authToken
			}
		}).then((r) => r.json())

		if (!newApiKey) {
			throw new Error('Failed to generate new api key')
		}

		toast.success('API Key generated')

		return newApiKey?.apiKey ?? null
	} catch (error: any) {
		toast.error(error.message)
		throw new Error(error.message)
	} finally {
		toast.dismiss(toastId)
	}
}

export function useGenerateNewApiKey() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: generateNewApiKey,
		onSuccess: () => {
			queryClient.invalidateQueries()
		}
	})
}
