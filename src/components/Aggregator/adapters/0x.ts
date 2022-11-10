import { ethers, Signer } from 'ethers'

export const chainToId = {
	ethereum: 'https://api.0x.org/',
	bsc: 'https://bsc.api.0x.org/',
	polygon: 'https://polygon.api.0x.org/',
	optimism: 'https://optimism.api.0x.org/',
	arbitrum: 'https://arbitrum.api.0x.org/',
	avax: 'https://avalanche.api.0x.org/',
	fantom: 'https://fantom.api.0x.org/',
	celo: 'https://celo.api.0x.org/'
}

export const name = 'Matcha/0x'
export const token = 'ZRX'

export function approvalAddress() {
	// https://docs.0x.org/0x-api-swap/guides/swap-tokens-with-0x-api
	return '0xdef1c0ded9bec7f1a1670819833240f027b25eff'
}

const nativeToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export async function getQuote(chain: string, from: string, to: string, amount: string) {
	// amount should include decimals

	const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from
	const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to
	const data = await fetch(
		`${chainToId[chain]}swap/v1/quote?buyToken=${tokenTo}&sellToken=${tokenFrom}&sellAmount=${amount}`
	).then((r) => r.json())
	return {
		amountReturned: data.buyAmount,
		estimatedGas: data.gas,
		tokenApprovalAddress: data.to,
		logo: 'https://www.gitbook.com/cdn-cgi/image/width=40,height=40,fit=contain,dpr=2,format=auto/https%3A%2F%2F1690203644-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FKX9pG8rH3DbKDOvV7di7%252Ficon%252F1nKfBhLbPxd2KuXchHET%252F0x%2520logo.png%3Falt%3Dmedia%26token%3D25a85a3e-7f72-47ea-a8b2-e28c0d24074b'
	}
}

/*
https://docs.0x.org/0x-api-swap/guides/swap-tokens-with-0x-api
export async function executeSwap(){  
  const receipt = await waitForTxSuccess(web3.eth.sendTransaction({
    from: taker,
    to: quote.to,
    data: quote.data,
    value: quote.value,
    gasPrice: quote.gasPrice,
    // 0x-API cannot estimate gas in forked mode.
    ...(FORKED ? {} : { gas : quote.gas }),
}));
}
*/

export async function swap({
	chain,
	from,
	to,
	amount,
	signer
}: {
	signer: Signer
	chain: string
	from: string
	to: string
	amount: string
}) {
	const fromAddress = await signer.getAddress()

	const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from
	const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to

	const data = await fetch(
		`${chainToId[chain]}swap/v1/quote?buyToken=${tokenTo}&sellToken=${tokenFrom}&sellAmount=${amount}&takerAddress=${fromAddress}`
	).then((r) => r.json())

	const tx = await signer.sendTransaction({
		from: fromAddress,
		to: data.to,
		data: data.data,
		value: data.value
	})

	return tx
}
