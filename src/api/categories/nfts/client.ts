import { fetcher } from '~/utils/useSWR'
import useSWR from 'swr'
import { NFT_COLLECTIONS_API } from '~/constants'

export const useFetchNftCollectionsList = () => {
	const { data, error } = useSWR(NFT_COLLECTIONS_API, fetcher)

	return { data, error, loading: !data && !error }
}
