import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { SERVER_API } from '~/containers/ProApi/lib/constants'

export async function isSubscribed(userAddress) {
	const { subscribed } = await fetch(`${SERVER_API}/auth/subscribed/${userAddress}`, {
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((r) => r.json())
	return subscribed
}

const useIsSubscribed = () => {
	const wallet = useAccount()

	const res = useQuery({
		queryKey: ['isSubscribed', wallet.address],
		queryFn: () => isSubscribed(wallet.address.toLowerCase())
	})

	return res
}

export default useIsSubscribed
