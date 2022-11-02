import { ethers, Signer } from 'ethers'
import { ABI } from './abi'

// All info collected from reverse engineering https://app.odos.xyz/
export const chainToId = {
	ethereum: 'ethereum',
	polygon: 'polygon',
	arbitrum: 'arbitrum'
}

export const name = 'Odos'
export const token = null

export function approvalAddress() {
	return '0x3373605b97d079593216a99ceF357C57D1D9648e'
}

export async function getQuote(chain: string, from: string, to: string, amount: string) {
	const data = await fetch('https://app.odos.xyz/request-path', {
		method: 'POST',
		mode: 'no-cors',
		body: JSON.stringify({
			fromValues: [Number(amount) / 1e18], // fix
			fromTokens: [from], // gas token 0x0000000000000000000000000000000000000000
			toTokens: [to],
			gasPrice: 159.4, // fix
			lpBlacklist: [],
			chain: chainToId[chain],
			slippageAmount: 1,
			walletAddress: null
		}),
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((r) => r.json())
	return {
		amountReturned: data.netOutValue,
		estimatedGas: data.gasEstimate,
		tokenApprovalAddress: data.inputDests[0],
		rawQuote: data
	}
}

export async function swap({ chain, from, to, amount, signer, rawQuote }) {
	const fromAddress = await signer.getAddress()

	const router = new ethers.Contract('0x76f4eeD9fE41262669D0250b2A97db79712aD855', ABI.odosRouter, signer)
	const decimalsIn = rawQuote.path.nodes[0].decimals
	const amountIn = +rawQuote.inAmounts[0].toFixed(decimalsIn) * 10 ** decimalsIn
	const decimalsOut = rawQuote.path.nodes[rawQuote.path.nodes.length - 1].decimals
	const amountOut = +rawQuote.outAmounts[0].toFixed(decimalsOut) * 10 ** decimalsOut
	const amountSlippage = ((amountOut / 100) * 99).toFixed(0)
	const executor = rawQuote.inputDests[0]
	const pathBytes = rawQuote.pathDefBytes
	const tx = await router.swap(
		[from, amountIn, executor, '0x'],
		[rawQuote.outTokens[0], 1, fromAddress],
		amountOut,
		amountSlippage,
		pathBytes
	)

	return tx
}
