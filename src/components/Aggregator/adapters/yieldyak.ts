import { ethers } from 'ethers'
import { providers } from '../rpcs'
import { ABI } from './abi'

// Source https://github.com/yieldyak/yak-aggregator
export const chainToId = {
	avax: '0xC4729E56b831d74bBc18797e0e17A295fA77488c'
}

export const name = 'YieldYak'
export const token = 'YAK'

export function approvalAddress(chain: string) {
	return chainToId[chain]
}

export async function getQuote(chain: string, from: string, to: string, amount: string) {
	const routerContract = new ethers.Contract(chainToId[chain], ABI.yieldYakRouter, providers[chain])

	const gasPrice = 33 // needs fixing, cant hardcode it, its in gwei
	const data = await routerContract.findBestPathWithGas(amount, from, to, 3, gasPrice)

	return {
		amountReturned: data.amounts[data.amounts.length - 1],
		estimatedGas: data.gasEstimate, // Gas estimates only include gas-cost of swapping and querying on adapter and not intermediate logic, nor tx-gas-cost.
		rawQuote: data,
		tokenApprovalAddress: '0xC4729E56b831d74bBc18797e0e17A295fA77488c'
	}
}

export async function swap({ chain, from, to, amount, signer, rawQuote }) {
	const fromAddress = await signer.getAddress()

	const routerContract = new ethers.Contract(chainToId[chain], ABI.yieldYakRouter, signer)
	const tx = await routerContract.swapNoSplit(
		[rawQuote.amounts[0], rawQuote.amounts[rawQuote.amounts.length - 1], rawQuote.path, rawQuote.adapters],
		fromAddress,
		0
	)

	return tx
}
