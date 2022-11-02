// Source https://docs.1inch.io/docs/aggregation-protocol/api/swagger

import { ethers, Signer } from 'ethers'

export const chainToId = {
	ethereum: 1,
	bsc: 52,
	polygon: 137,
	optimism: 10,
	arbitrum: 42161,
	gnosis: 100,
	avax: 43114,
	fantom: 250,
	klaytn: 8217,
	aurora: 1313161554
}

export const name = '1inch'
export const token = '1INCH'

export function approvalAddress() {
	// https://api.1inch.io/v4.0/1/approve/spender
	return '0x1111111254fb6c44bac0bed2854e76f90643097d'
}

export async function getQuote(chain: string, from: string, to: string, amount: string) {
	// ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
	// amount should include decimals
	const data = await fetch(
		`https://api.1inch.io/v4.0/${chainToId[chain]}/quote?fromTokenAddress=${from}&toTokenAddress=${to}&amount=${amount}`
	).then((r) => r.json())
	return {
		amountReturned: data.toTokenAmount,
		estimatedGas: data.estimatedGas,
		tokenApprovalAddress: '0x1111111254fb6c44bac0bed2854e76f90643097d'
	}
}

export async function swap({
	chain,
	from,
	to,
	amount,
	signer,
	slippage = 1
}: {
	signer: Signer
	chain: string
	from: string
	to: string
	amount: string
	slippage: number
}) {
	const fromAddress = await signer.getAddress()
	console.log(signer)

	const data = await fetch(
		`https://api.1inch.io/v4.0/${chainToId[chain]}/swap?fromTokenAddress=${from}&toTokenAddress=${to}&amount=${amount}&fromAddress=${fromAddress}&slippage=${slippage}`
	).then((r) => r.json())
	console.log(data)

	const tx = await signer.sendTransaction({
		from: data.tx.from,
		to: data.tx.to,
		data: data.tx.data,
		value: data.tx.value,
		gasPrice: data.tx.gasPrice
	})
	return tx
}
