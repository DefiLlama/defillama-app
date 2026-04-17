import type { BlockExplorersChain, BlockExplorersResponse } from '~/api/types'

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
	chainId,
	chainName,
	urlType
}: {
	apiResponse: BlockExplorersResponse
	address: string
	chainId?: string
	chainName?: string
	urlType: 'address' | 'token' | 'tx'
}): { name: string; url: string; chainDisplayName: string } | null {
	if (!address) return null

	let finalAddress: string
	let match: BlockExplorersChain | null

	if (chainId || chainName) {
		finalAddress = address
		match = findBlockExplorerChain(apiResponse, { chainId, chainName })
	} else {
		const normalized = address.includes(':') ? address : `ethereum:${address}`
		const [normalizedChainId, addr] = normalized.split(':')
		if (!normalizedChainId || !addr) return null
		finalAddress = addr
		match = findBlockExplorerChain(apiResponse, { chainId: normalizedChainId })
	}

	const explorer = match?.blockExplorers?.[0]
	if (!explorer) return null

	return {
		chainDisplayName: match.displayName,
		name: explorer.name,
		url: `${explorer.url}/${urlType ? (NON_STANDARD_EXPLORER_PATHS[explorer.url]?.[urlType] ?? urlType) : 'address'}/${finalAddress}`
	}
}

function normalizeChainKey(value: string | null | undefined): string {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[_\s]+/g, '-')
}

function matchesChainKey(entry: BlockExplorersChain, normalizedChainKey: string): boolean {
	const normalizedEntryChainId = normalizeChainKey(entry.llamaChainId)
	const normalizedEntryDisplayName = normalizeChainKey(entry.displayName)

	return normalizedEntryChainId === normalizedChainKey || normalizedEntryDisplayName === normalizedChainKey
}

export function findBlockExplorerChain(
	apiResponse: BlockExplorersResponse,
	{ chainId, chainName }: { chainId?: string; chainName?: string }
): BlockExplorersChain | null {
	const normalizedChainId = normalizeChainKey(chainId)
	if (normalizedChainId) {
		const chainIdMatch = apiResponse.find((entry) => matchesChainKey(entry, normalizedChainId))
		if (chainIdMatch) return chainIdMatch
	}

	const normalizedChainName = normalizeChainKey(chainName)
	if (normalizedChainName) {
		return apiResponse.find((entry) => matchesChainKey(entry, normalizedChainName)) ?? null
	}

	return null
}
