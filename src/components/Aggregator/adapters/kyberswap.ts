import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import { ExtraData } from '../types'

// https://docs.kyberswap.com/Aggregator/aggregator-api#tag/swap/operation/get-route-encode
export const chainToId = {
	ethereum: 'ethereum',
	bsc: 'bsc',
	polygon: 'polygon',
	optimism: 'optimism',
	arbitrum: 'arbitrum',
	avax: 'avalanche',
	fantom: 'fantom',
	aurora: 'aurora',
	bttc: 'bttc',
	cronos: 'cronos',
	oasis: 'oasis',
	velas: 'velas'
}

export const name = 'KyberSwap'
export const token = 'KNC'

export function approvalAddress() {
	return '0x00555513Acf282B42882420E5e5bA87b44D8fA6E'
}

const nativeToken = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: ExtraData) {
	const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from
	const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to

	const data = await fetch(
		`https://aggregator-api.kyberswap.com/${chainToId[chain]}/route/encode?tokenIn=${tokenFrom}&tokenOut=${tokenTo}&amountIn=${amount}&to=${extra.userAddress}&saveGas=0&gasInclude=0&slippageTolerance=50`,
		{
			headers: {
				'Accept-Version': 'Latest'
			}
		}
	).then((r) => r.json())
	return {
		amountReturned: data.outputAmount,
		estimatedGas: data.totalGas,
		tokenApprovalAddress: data.routerAddress,
		rawQuote: data,
		logo: 'https://assets.coingecko.com/coins/images/14899/small/RwdVsGcw_400x400.jpg?1618923851'
	}
}

export async function swap({ signer, from, rawQuote }) {
	const fromAddress = await signer.getAddress()

	const transactionOption: Record<string, string> = {
		from: fromAddress,
		to: rawQuote.routerAddress,
		data: rawQuote.encodedSwapData
	}

	if (from === ethers.constants.AddressZero) transactionOption.value = rawQuote.inputAmount

	const tx = await signer.sendTransaction(transactionOption)

	return tx
}
