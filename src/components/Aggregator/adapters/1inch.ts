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
const nativeToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export async function getQuote(chain: string, from: string, to: string, amount: string) {
	// ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
	// amount should include decimals

	const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from
	const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to
	const data = await fetch(
		`https://api.1inch.io/v4.0/${chainToId[chain]}/quote?fromTokenAddress=${tokenFrom}&toTokenAddress=${tokenTo}&amount=${amount}`
	).then((r) => r.json())
	return {
		amountReturned: data.toTokenAmount,
		estimatedGas: data.estimatedGas,
		tokenApprovalAddress: '0x1111111254fb6c44bac0bed2854e76f90643097d',
		logo: 'https://defillama.com/_next/image?url=https%3A%2F%2Ficons.llama.fi%2F1inch-network.jpg&w=48&q=75'
	}
}

export async function swap({ chain, from, to, amount, signer, slippage = 1, rawQuote }) {
	const fromAddress = await signer.getAddress()
	const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from
	const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to

	const data = await fetch(
		`https://api.1inch.io/v4.0/${chainToId[chain]}/swap?fromTokenAddress=${tokenFrom}&toTokenAddress=${tokenTo}&amount=${amount}&fromAddress=${fromAddress}&slippage=${slippage}`
	).then((r) => r.json())

	const tx = await signer.sendTransaction({
		from: data.tx.from,
		to: data.tx.to,
		data: data.tx.data,
		value: data.tx.value,
		gasPrice: data.tx.gasPrice
	})
	return tx
}
