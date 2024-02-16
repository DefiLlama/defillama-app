import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from 'react-query'
import { SERVER_API } from '../lib/constants'

export async function generateNewApiKey({ authToken }: { authToken?: string | null }) {
	const toastId = toast.loading('Generating new API Key')
	try {
		if (!authToken) {
			throw new Error('Not Authorized')
		}

		const newApiKey = await fetch(`${SERVER_API}/auth/generate`, {
			method: 'POST',
			headers: {
				authorization: authToken
			}
		}).then((r) => r.json())

		if (!newApiKey) {
			throw new Error('Failed to generate new api key')
		}

		return newApiKey?.apiKey ?? null
	} catch (error: any) {
		throw new Error(error.message)
	} finally {
		toast.dismiss(toastId)
	}
}

export function useGenerateNewApiKey() {
	const queryClient = useQueryClient()

	return useMutation(generateNewApiKey, {
		onSuccess: () => {
			toast.success('API Key generated')
			queryClient.invalidateQueries()
		}
	})
}
