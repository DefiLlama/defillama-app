import type { BlockExplorersResponse } from '~/api/types'

const NON_STANDARD_EXPLORER_PATHS: Record<string, { token?: string; tx?: string; address?: string }> = {
	'https://allo.info': {
		token: 'asset',
		tx: 'tx',
		address: 'account'
	},
	'https://aptoscan.com': {
		token: 'fungible-asset',
		tx: 'transaction',
		address: 'account'
	},
	'https://dashboard.radixdlt.com': {
		token: 'resource',
		tx: 'transaction',
		address: 'account'
	},
	'https://explorer.multiversx.com': {
		token: 'tokens',
		tx: 'transactions',
		address: 'accounts'
	},
	'https://explorer.onegate.space': {
		token: 'NEP17tokeninfo',
		tx: 'transactionInfo',
		address: 'accountprofile'
	},
	'https://stcscan.io/main': {
		token: 'tokens/detail',
		tx: 'transactions/detail',
		address: 'address'
	},
	'https://suiscan.xyz/mainnet': {
		token: 'coin',
		tx: 'tx',
		address: 'account'
	},
	'https://tronscan.org/#': {
		token: 'token',
		tx: 'transaction',
		address: 'contract'
	},
	'https://unicove.com': {
		token: 'token/eosio.token',
		tx: 'transaction',
		address: 'account'
	},
	'https://wavesexplorer.com': {
		token: 'assets',
		tx: 'transactions',
		address: 'addresses'
	}
}

export function getBlockExplorerNew({
	apiResponse,
	address,
	chainName,
	urlType
}: {
	apiResponse: BlockExplorersResponse
	address: string
	chainName?: string
	urlType: 'address' | 'token' | 'tx'
}): { name: string; url: string; chainDisplayName: string } | null {
	if (!address) return null

	let finalAddress: string
	let match: BlockExplorersResponse[number] | undefined

	if (chainName) {
		finalAddress = address
		match = apiResponse.find((entry) => entry.displayName === chainName)
	} else {
		const normalized = address.includes(':') ? address : `ethereum:${address}`
		const [chainId, addr] = normalized.split(':')
		if (!chainId || !addr) return null
		finalAddress = addr
		match =
			apiResponse.find((entry) => entry.llamaChainId === chainId) ??
			apiResponse.find((entry) => entry.displayName === chainId)
	}

	const explorer = match?.blockExplorers?.[0]
	if (!explorer) return null

	return {
		chainDisplayName: match.displayName,
		name: explorer.name,
		url: `${explorer.url}/${urlType ? (NON_STANDARD_EXPLORER_PATHS[explorer.url]?.[urlType] ?? urlType) : 'address'}/${finalAddress}`
	}
}
