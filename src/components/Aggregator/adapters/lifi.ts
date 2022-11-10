// Source https://docs.1inch.io/docs/aggregation-protocol/api/swagger

import { ethers, Signer } from 'ethers'
import { ExtraData } from '../types'

export const chainToId = {
	ethereum: 'eth',
	polygon: 'pol',
	bsc: 'bsc',
	gnosis: 'dai',
	fantom: 'ftm',
	okxchain: 'okt',
	avax: 'ava',
	arbitrum: 'arb',
	optimism: 'opt',
	moonriver: 'mor',
	moonbeam: 'moo',
	celo: 'cel',
	fuse: 'fus',
	cronos: 'cro',
	velas: 'vel',
	aurora: 'aur'
}
export const name = 'Lifi'
export const token = null

const nativeToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: ExtraData) {
	// ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
	// amount should include decimals

	const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from
	const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to
	const data = await fetch(
		`https://li.quest/v1/quote?fromChain=${chainToId[chain]}&toChain=${chainToId[chain]}&fromToken=${from}&toToken=${to}&fromAmount=${amount}&fromAddress=${extra.userAddress}`
	).then((r) => r.json())

	const gas = data.estimate.gasCosts.reduce((acc, val) => +acc + val.estimate, 0)
	return {
		amountReturned: data.estimate.toAmount,
		estimatedGas: gas,
		tokenApprovalAddress: data.estimate.approvalAddress,
		logo: '',
		rawQuote: data
	}
}

export async function swap({ chain, from, to, amount, signer, slippage = 1, rawQuote }) {
	const fromAddress = await signer.getAddress()

	const data = await fetch(
		`https://li.quest/v1/quote?fromChain=${chainToId[chain]}&toChain=${chainToId[chain]}&fromToken=${from}&toToken=${to}&fromAmount=${amount}&fromAddress=${fromAddress}`
	).then((r) => r.json())

	const tx = await signer.sendTransaction({
		from: data.transactionRequest.from,
		to: data.transactionRequest.to,
		data: data.transactionRequest.data,
		value: data.transactionRequest.value,
		gasPrice: data.transactionRequest.gasPrice
	})
	return tx
}
