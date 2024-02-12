import { useMutation, useQueryClient } from 'react-query'
import { SERVER_API } from '../lib/constants'

export async function generateNewApiKey({ authToken }: { authToken?: string | null }) {
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
	}
}

export function useGenerateNewApiKey() {
	const queryClient = useQueryClient()

	return useMutation(generateNewApiKey, {
		onSuccess: () => {
			queryClient.invalidateQueries()
		}
	})
}
