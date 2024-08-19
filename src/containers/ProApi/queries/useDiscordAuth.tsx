import { useRouter } from 'next/router'
import { useQuery } from 'react-query'
import { SERVER_API } from '../lib/constants'

const useDiscordOAuth = () => {
	const router = useRouter()
	const code = router.query.code as string | undefined

	const fetchDiscordOAuth = async () => {
		if (code) {
			const response = await fetch(`${SERVER_API}/discord-oauth`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code })
			})

			if (response.ok) {
				const { pathname, query } = router
				const newQuery = { ...query }
				delete newQuery.code
				router.replace({ pathname, query: newQuery }, undefined, { shallow: true })
			} else {
				throw new Error('Error sending code to API')
			}
		}
	}

	const { isLoading, isError } = useQuery(['discordOAuth', code], fetchDiscordOAuth, {
		refetchOnWindowFocus: false,
		retry: false,
		onError: (error) => {
			console.error('Error sending code to API:', error)
		},
		enabled: !!code
	})

	return { isLoading, isError }
}

export default useDiscordOAuth
