import { useQuery } from 'react-query'
import { useAccount } from 'wagmi'
import { SERVER_API } from '~/containers/ProApi/lib/constants'

export async function isSubscribed(userAddress) {
	const { subscribed } = await fetch(`${SERVER_API}/auth/subscribed/${userAddress}`, {
		headers: {
			'Content-Type': 'application/json'
		},
	}).then((r) => r.json())
	return subscribed
}

const useIsSubscribed = () => {
	const wallet = useAccount()

	const res = useQuery(['isSubscribed', wallet.address], () =>
		isSubscribed(
			wallet.address.toLowerCase()
		)
	)

	return res
}

export default useIsSubscribed
