import { verifyMessage } from 'ethers/lib/utils.js'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useAccount, useNetwork } from 'wagmi'
import { signMessage } from 'wagmi/actions'

import { FRONTEND_DOMAIN, optimism, SERVER_API } from '../lib/constants'
import { getSIWEMessage } from '../lib/siwe'

async function checkTokenValidity({ address }: { address?: string | null }) {
	try {
		if (!address) return false

		const auth_token = window.localStorage.getItem(`auth_token_${address}`) ?? null

		if (auth_token) return true

		return false
	} catch (error: any) {
		throw new Error(error.message)
	}
}

export async function getAuthToken({ address }: { address?: string | null }) {
	try {
		if (!address) {
			return null
		}

		const isTokenInLocalStorageValid = await checkTokenValidity({
			address
		})

		if (!isTokenInLocalStorageValid) {
			return null
		}

		return window.localStorage.getItem(`auth_token_${address}`) ?? null
	} catch (error: any) {
		throw new Error(error?.message)
	}
}

export function useGetAuthToken() {
	const { address } = useAccount()

	return useQuery(['auth-token', address], () =>
		getAuthToken({
			address
		})
	)
}

export async function signAndGetAuthToken({ address }: { address?: string | null }) {
	try {
		if (!address) {
			throw new Error('Invalid arguments')
		}

		const siweMessage = getSIWEMessage({
			domain: FRONTEND_DOMAIN,
			address,
			statement: `Sign in to ${FRONTEND_DOMAIN} to get API Key`,
			uri: FRONTEND_DOMAIN,
			version: '1',
			chainId: optimism.id,
			nonce: `${Math.floor(Math.random() * 64)}`
		})

		const data = await signMessage({ message: siweMessage as string })
		const isVerified = verifyMessage(siweMessage, data) === address

		if (!data) {
			toast.error('Failed to generate signature')
			throw new Error('Failed to generate signature')
		}

		if (!isVerified) {
			toast.error('Failed to verify signature')
			throw new Error('Failed to verify signature')
		}

		window.localStorage.setItem(`signature_${address}_api`, JSON.stringify({ signature: data }))

		const verifyRes = await fetch(`${SERVER_API}/sign-in`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ message: siweMessage, signature: data })
		}).then((r) => r.json())

		if (!verifyRes.key) {
			throw new Error('Failed to generate auth token')
		}

		window.localStorage.setItem(`auth_token_${address}`, verifyRes.key)

		return verifyRes.key
	} catch (error: any) {
		toast.error(error.message)
		throw new Error(error.message)
	}
}

export function useSignInWithEthereum() {
	const queryClient = useQueryClient()
	const wallet = useAccount()

	return useMutation(['signIn', wallet.address], signAndGetAuthToken, {
		onSuccess: () => {
			queryClient.invalidateQueries()
		}
	})
}
