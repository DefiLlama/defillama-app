// Source: https://docs.cow.fi/off-chain-services/api

import { ExtraData } from '../types'
import { domain, SigningScheme, signOrder, OrderKind } from '@gnosis.pm/gp-v2-contracts'
import { ethers } from 'ethers'

export const chainToId = {
	ethereum: 'https://api.cow.fi/mainnet',
	gnosis: 'https://api.cow.fi/xdai'
}

export const name = 'CowSwap'
export const token = 'COW'

export function approvalAddress() {
	return '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110'
}

// https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/2.-query-the-fee-endpoint
export async function getQuote(chain: string, from: string, to: string, amount: string, extra: ExtraData) {
	// amount should include decimals
	const data = await fetch(`${chainToId[chain]}/api/v1/quote`, {
		method: 'POST',
		body: JSON.stringify({
			sellToken: from,
			buyToken: to,
			receiver: extra.userAddress,
			appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
			partiallyFillable: false,
			sellTokenBalance: 'erc20',
			buyTokenBalance: 'erc20',
			from: extra.userAddress,
			//"priceQuality": "fast",
			signingScheme: 'eip712',
			//"onchainOrder": false,
			kind: 'sell',
			sellAmountBeforeFee: amount
		}),
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((r) => r.json())

	return {
		amountReturned: data.quote.buyAmount,
		estimatedGas: 0,
		feeAmount: data.quote.feeAmount,
		validTo: data.quote.validTo,
		rawQuote: data,
		tokenApprovalAddress: '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110',
		logo: 'https://assets.coingecko.com/coins/images/24384/small/cow.png?1660960589'
	}
}

export async function swap({ chain, from, to, amount, signer, rawQuote }) {
	const order = {
		sellToken: rawQuote.quote.sellToken,
		buyToken: rawQuote.quote.buyToken,
		sellAmount: rawQuote.quote.sellAmount,
		buyAmount: rawQuote.quote.buyAmount,
		validTo: rawQuote.quote.validTo,
		appData: rawQuote.quote.appData,
		feeAmount: rawQuote.quote.feeAmount,
		kind: OrderKind.SELL,
		partiallyFillable: rawQuote.quote.partiallyFillable
	}

	const rawSignature = await signOrder(
		domain(1, '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'),
		order,
		signer,
		SigningScheme.ETHSIGN
	)

	const signature = ethers.utils.joinSignature(rawSignature.data)

	const data = await fetch(`${chainToId[chain]}/api/v1/orders`, {
		method: 'POST',
		body: JSON.stringify({
			...rawQuote.quote,
			signature,
			signingScheme: 'ethsign'
		}),
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((r) => r.json())
}
