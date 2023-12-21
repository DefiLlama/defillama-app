import { useQuery } from 'react-query'
import { useAccount } from 'wagmi'

function isSubscribed(toAddress, amount, userAddress) {
	return fetch('https://api.thegraph.com/subgraphs/name/0xngmi/llamasubs-optimism', {
		method: 'post',
		body: JSON.stringify({
			query: `
query Subs($now: BigInt, $userAddress: Bytes, $receiver: Bytes, $minAmountPerCycle:BigInt) {
  subs(
    where: {owner: $userAddress, startTimestamp_lt: $now, realExpiration_gte: $now, receiver: $receiver, amountPerCycle_gte: $minAmountPerCycle}
  ) {
    startTimestamp
    realExpiration
  }
}`,
			variables: {
				now: Math.floor(Date.now() / 1e3),
				userAddress,
				receiver: toAddress,
				minAmountPerCycle: amount.toString()
			}
		})
	})
		.then((r) => r.json())
		.then((r) => r.data.subs.length > 0)
}

const useIsDubscribed = () => {
	const wallet = useAccount()

	const res = useQuery(['isSubscribedToChain', wallet.address], () =>
		isSubscribed(`0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437`.toLowerCase(), 1e17, wallet.address.toLowerCase())
	)

	return res
}

export default useIsDubscribed
