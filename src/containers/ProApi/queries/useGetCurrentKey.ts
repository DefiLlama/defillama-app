import { useQuery } from 'react-query'
import { SERVER_API } from '../lib/constants'

async function getCurrentKey(authToken?: string | null) {
	try {
		if (!authToken) return null

		const currentToken = await fetch(`${SERVER_API}/auth/api-key`, {
			method: 'GET',
			headers: {
				Authorization: authToken
			}
		}).then((r) => r.json())

		return currentToken?.apiKey ?? null
	} catch (error: any) {
		throw new Error(error.message ?? 'Failed to fetch current api key')
	}
}

export const useGetCurrentKey = ({ authToken }: { authToken?: string | null }) => {
	return useQuery(['currentKey', authToken], () => getCurrentKey(authToken), {
		enabled: authToken ? true : false,
		retry: 1
	})
}
