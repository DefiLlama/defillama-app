import { verifyMessage } from 'ethers/lib/utils.js'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useAccount, useNetwork } from 'wagmi'
import { signMessage } from 'wagmi/actions'

import { optimism, SERVER_API } from '../lib/constants'
import { getSIWEMessage } from '../lib/siwe'

export function getAuthToken({ address }: { address?: string | null }) {
	try {
		if (!address) {
			return null
		}

		return window.localStorage.getItem(`auth_token_${address.toLowerCase()}`) ?? null
	} catch (error: any) {
		throw new Error(error?.message)
	}
}

export function logout({ address }: { address?: string | null }) {
	return window.localStorage.removeItem(`auth_token_${address.toLowerCase()}`)
}

export function useGetAuthToken() {
	const { address } = useAccount()

	return useQuery(['auth-token', address], () =>
		getAuthToken({
			address
		})
	)
}

export function useGetCreditsUsage(apiKey: string | undefined) {
	return useQuery(['credits-usage', apiKey], () =>
		apiKey ? fetch(`https://pro-api.llama.fi/usage/${apiKey}`).then(r => r.json()) : null
	)
}

export async function signAndGetAuthToken({ address, refetchToken }: { address?: string | null, refetchToken: Function }) {
	try {
		if (!address) {
			throw new Error('Invalid arguments')
		}
		const host = window.location.origin

		const siweMessage = getSIWEMessage({
			domain: host,
			address,
			statement: `Sign in to ${host} to get API Key`,
			uri: host,
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
			toast.error(verifyRes?.message)
			throw new Error(verifyRes?.message)
		}

		window.localStorage.setItem(`auth_token_${address.toLowerCase()}`, verifyRes.key)
		refetchToken()

		return
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
