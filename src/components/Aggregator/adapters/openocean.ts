import { Signer } from 'ethers'

export const chainToId = {
	ethereum: 1,
	bsc: 52,
	polygon: 137,
	optimism: 10,
	arbitrum: 42161,
	gnosis: 100,
	avax: 43114,
	fantom: 250,
	aurora: 1313161554,
	heco: 128,
	harmony: 1666600000,
	boba: 288,
	okc: 66
}

export const name = 'OpenOcean'
export const token = 'OOE'

export function approvalAddress() {
	return '0x6352a56caadc4f1e25cd6c75970fa768a3304e64'
}

// https://docs.openocean.finance/dev/openocean-api-3.0/quick-start
// the api from their docs is broken
// eg: https://open-api.openocean.finance/v3/eth/quote?inTokenAddress=0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9&outTokenAddress=0x8888801af4d980682e47f1a9036e589479e835c5&amount=100000000000000000000&gasPrice=400000000
// returns a AAVE->MPH trade that returns 10.3k MPH, when in reality that trade only gets you 3.8k MPH
// Replaced API with the one you get from snooping in their frontend, which works fine
export async function getQuote(chain: string, from: string, to: string, amount: string) {
	const gasPrice = await fetch(`https://ethapi.openocean.finance/v2/${chainToId[chain]}/gas-price`).then((r) =>
		r.json()
	)
	const data = await fetch(
		`https://ethapi.openocean.finance/v2/${
			chainToId[chain]
		}/quote?inTokenAddress=${from}&outTokenAddress=${to}&amount=${amount}&gasPrice=${
			gasPrice.fast?.maxPriorityFeePerGas ?? gasPrice.fast
		}`
	).then((r) => r.json())
	return {
		amountReturned: data.outAmount,
		estimatedGas: data.estimatedGas,
		tokenApprovalAddress: '0x6352a56caadc4f1e25cd6c75970fa768a3304e64'
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
	const gasPrice = await fetch(`https://ethapi.openocean.finance/v2/${chainToId[chain]}/gas-price`).then((r) =>
		r.json()
	)

	const data = await fetch(
		`https://ethapi.openocean.finance/v2/${
			chainToId[chain]
		}/swap?inTokenAddress=${from}&outTokenAddress=${to}&amount=${amount}&gasPrice=${
			gasPrice.fast?.maxPriorityFeePerGas ?? gasPrice.fast
		}&slippage=100&account=${fromAddress}`
	).then((r) => r.json())
	console.log(data)

	const tx = await signer.sendTransaction({
		from: data.from,
		to: data.to,
		data: data.data,
		value: data.value,
		gasPrice: data.gasPrice
	})
	return tx
}
