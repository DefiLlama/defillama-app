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

		if (currentToken.message === 'bad signature') {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i)
				if (key?.startsWith('auth_token')) {
					console.log(key)
					localStorage.removeItem(key)
				}
			}
		} else {
			window.localStorage.setItem(`pro_apikey`, currentToken?.apiKey)
		}

		return currentToken?.apiKey ? currentToken : null
	} catch (error: any) {
		throw new Error(error.message ?? 'Failed to fetch current api key')
	}
}

export const useGetCurrentKey = ({ authToken }: { authToken?: string | null }) => {
	return useQuery<{ email: string; apiKey: string }>(['currentKey', authToken], () => getCurrentKey(authToken), {
		enabled: authToken ? true : false,
		retry: 1
	})
}
