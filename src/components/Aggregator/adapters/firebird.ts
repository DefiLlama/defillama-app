import { ExtraData } from '../types'

// IMPORTANT! their docs are wrong, need to reverse engineer their app and look at network requests

export const chainToId = {
	bsc: 'bsc',
	polygon: 'polygon',
	optimism: 'optimism',
	arbitrum: 'arbitrum',
	avax: 'avalanche',
	fantom: 'fantom',
	cronos: 'cronos',
	dogechain: 'dogechain',
	moonriver: 'moonriver'
}

export const name = 'Firebird'
export const token = 'HOPE'

export function approvalAddress() {
	return '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'
}

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: ExtraData) {
	// amount should include decimals
	const data = await fetch(
		`https://router.firebird.finance/${chain}/route?from=${from}&to=${to}&amount=${amount}&receiver=${extra.userAddress}`
	).then((r) => r.json())
	return {
		amountReturned: data.maxReturn.totalTo,
		estimatedGas: data.maxReturn.totalGas,
		tokenApprovalAddress: data.maxReturn.to
	}
}
