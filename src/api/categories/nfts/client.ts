import useSWR from 'swr'
import { NFT_COLLECTIONS_API } from '~/constants'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const useFetchNftCollectionsList = () => {
	const { data, error } = useSWR(NFT_COLLECTIONS_API, () =>
		fetch(NFT_COLLECTIONS_API)
			.then((res) => res.json())
			.then(
				(data) =>
					data?.map((item) => ({
						name: item.name,
						symbol: null,
						logo: item.image,
						route: `/nfts/collection/${item.collectionId}`
					})) ?? []
			)
			.catch((err) => {
				console.log(err)
				return []
			})
	)

	return { data, error, loading: !data && !error, onSearchTermChange: null, onItemClick: null }
}
