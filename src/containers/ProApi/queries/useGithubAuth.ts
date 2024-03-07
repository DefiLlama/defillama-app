import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { SERVER_API } from '../lib/constants'

async function exchangeCodeForAccessToken(code, accessToken) {
	try {
		const response = await fetch(`${SERVER_API}/github-sign-in`, {
			method: 'POST',
			body: JSON.stringify({
				code: accessToken ? null : code,
				accessToken
			})
		}).then((res) => res.json())

		if (response.token) {
			localStorage.setItem('gh_authToken', response.token)
		}
		return response
	} catch (error) {
		console.log({ error })
		return error
	}
}

const useGithubAuth = () => {
	const router = useRouter()
	const [token, setToken] = useState('')
	const code = router?.query?.code
	useEffect(() => {
		const token = localStorage.getItem('gh_authToken') || null
		setToken(token)
	}, [code])

	useEffect(() => {
		if (token && code) {
			router.push(
				{
					pathname: router.pathname,
					query: {}
				},
				undefined
			)
		}
	}, [code, token, router])

	const auth = useQuery<{ apiKey: string | null; isContributor: boolean; login: string; token: string | null }>(
		['github-auth', code, token],
		() => exchangeCodeForAccessToken(code, token),
		{
			enabled: !!code || !!token
		}
	)
	return auth
}

export default useGithubAuth
