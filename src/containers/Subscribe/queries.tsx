import { useEffect, useSyncExternalStore } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { optimism } from 'viem/chains'
import { signMessage, verifyMessage } from 'wagmi/actions'
import { config } from '~/layout/WalletProvider'
import { SERVER_API } from '../ProApi/lib/constants'
import { useRouter } from 'next/router'

export interface IGithubAuthData {
	apiKey: string | null
	isContributor: boolean
	login: string
	token: string | null
}

async function exchangeCodeForAccessToken({ code, accessToken }: { code: string | null; accessToken: string | null }) {
	if (!accessToken && !code) return null

	try {
		const response = await fetch(`${SERVER_API}/github-sign-in`, {
			method: 'POST',
			body: JSON.stringify({
				code: accessToken ? null : code,
				accessToken
			})
		}).then(async (r) => {
			if (!r.ok) {
				throw new Error('Failed to fetch')
			}
			const data = await r.json()
			return data
		})

		if (response.token) {
			localStorage.setItem('gh_authtoken', response.token)
			window.dispatchEvent(new Event('storage'))
		}

		return response
	} catch (error) {
		const msg = `[CODE&ACCESS_TOKEN]: ${error instanceof Error ? error.message : 'Failed to fetch'}`
		console.error(msg)
		throw new Error(msg)
	}
}

function subscribe(callback: () => void) {
	window.addEventListener('storage', callback)

	return () => {
		window.removeEventListener('storage', callback)
	}
}

function getGithubAuthToken() {
	return localStorage.getItem('gh_authtoken') || null
}

export const useGithubAuth = () => {
	const router = useRouter()
	const code = typeof router?.query?.code === 'string' ? router.query.code : null

	const token = useSyncExternalStore(subscribe, getGithubAuthToken, () => null)

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

	return useQuery<IGithubAuthData | null>({
		queryKey: ['github-auth', code, token],
		queryFn: () => exchangeCodeForAccessToken({ code, accessToken: token })
	})
}

async function getCreditsUsage({ apiKey }: { apiKey?: string | null }) {
	if (!apiKey) return null
	try {
		const data = await fetch(`https://pro-api.llama.fi/usage/${apiKey}`).then(async (r) => {
			if (!r.ok) {
				throw new Error('Failed to fetch')
			}
			const data = await r.json()
			return data
		})
		return data
	} catch (error) {
		const msg = `[CREDITS_USAGE]: ${error instanceof Error ? error.message : 'Failed to fetch'}`
		console.error(msg)
		throw new Error(msg)
	}
}

export const useGetCreditsUsage = ({ apiKey }: { apiKey?: string | null }) => {
	return useQuery<{ creditsLeft: number } | null>({
		queryKey: ['credits-usage', apiKey],
		queryFn: () => getCreditsUsage({ apiKey })
	})
}

export function logoutProSubscription({ address }: { address?: string | null }) {
	if (address) {
		window.localStorage.removeItem(`auth_token_${address.toLowerCase()}`)
		window.dispatchEvent(new Event('storage'))
	}
}

function getProAuthToken(address?: string | null) {
	if (!address) return null
	return localStorage.getItem(`auth_token_${address.toLowerCase()}`) || null
}

async function signAndGetAuthToken({ address }: { address?: string | null }) {
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

		// @ts-ignore
		const data = await signMessage(config, { message: siweMessage as string })
		const isVerified = await verifyMessage(config, {
			address: address as `0x${string}`,
			message: siweMessage,
			signature: data
		})

		if (!data) {
			throw new Error('Failed to generate signature')
		}

		if (!isVerified) {
			throw new Error('Failed to verify signature')
		}

		localStorage.setItem(`signature_${address}_api`, JSON.stringify({ signature: data }))
		window.dispatchEvent(new Event('storage'))

		const verifyRes = await fetch(`${SERVER_API}/sign-in`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ message: siweMessage, signature: data })
		}).then((r) => r.json())

		if (!verifyRes.key) {
			throw new Error(verifyRes?.message)
		}

		localStorage.setItem(`auth_token_${address.toLowerCase()}`, verifyRes.key)
		window.dispatchEvent(new Event('storage'))

		return null
	} catch (error: any) {
		const msg = `[SIGN]: ${error instanceof Error ? error.message : 'Failed to sign'}`
		console.error(msg)
		throw new Error(msg)
	}
}

export function useSignInWithEthereum() {
	const wallet = useAccount()

	return useMutation({
		mutationFn: () =>
			signAndGetAuthToken({
				address: wallet.address
			})
	})
}

const getSIWEMessage = ({
	domain,
	address,
	statement,
	uri,
	version,
	chainId,
	nonce
}: {
	domain: string
	address: string
	statement: string
	uri: string
	version: string
	chainId: number
	nonce: string
}) => {
	const header = `${domain} wants you to sign in with your Ethereum account:`
	const uriField = `URI: ${uri}`
	let prefix = [header, address].join('\n')
	const versionField = `Version: ${version}`
	const chainField = `Chain ID: ` + chainId || '1'
	const nonceField = `Nonce: ${nonce}`
	const suffixArray = [uriField, versionField, chainField, nonceField]
	suffixArray.push(`Issued At: ${new Date().toISOString()}`)

	const suffix = suffixArray.join('\n')
	prefix = [prefix, statement].join('\n\n')
	if (statement) {
		prefix += '\n'
	}
	return [prefix, suffix].join('\n')
}

const generateNewApiKey = async ({ authToken }: { authToken?: string | null }) => {
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

		return newApiKey?.apiKey ?? null
	} catch (error: any) {
		throw new Error(error.message)
	} finally {
	}
}

export function useGenerateNewApiKey() {
	return useMutation({
		mutationFn: generateNewApiKey
	})
}

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
					localStorage.removeItem(key)
				}
			}
		} else {
			if (currentToken?.apiKey === null) {
				currentToken.apiKey = await generateNewApiKey({ authToken })
			}
		}

		return currentToken?.apiKey ? currentToken : null
	} catch (error: any) {
		throw new Error(error.message ?? 'Failed to fetch current api key')
	}
}

export const useGetCurrentKey = () => {
	const { address } = useAccount()

	const authToken = useSyncExternalStore(
		subscribe,
		() => getProAuthToken(address),
		() => null
	)

	return useQuery<{ email: string; apiKey: string } | null>({
		queryKey: ['currentKey', authToken],
		queryFn: () => getCurrentKey(authToken),
		retry: 1
	})
}

async function isSubscribed(userAddress?: string) {
	if (!userAddress) return false
	const { subscribed } = await fetch(`${SERVER_API}/auth/subscribed/${userAddress.toLowerCase()}`, {
		headers: {
			'Content-Type': 'application/json'
		}
	}).then(async (r) => {
		if (!r.ok) {
			throw new Error('Failed to fetch')
		}
		const data = await r.json()
		return data
	})

	return subscribed
}

export const useIsSubscribed = () => {
	const wallet = useAccount()

	return useQuery({
		queryKey: ['isSubscribed', wallet.address],
		queryFn: () => isSubscribed(wallet.address)
	})
}
