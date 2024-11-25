import { useQuery } from '@tanstack/react-query'
import { IGetSearchList } from '~/components/Search/types'
import { NFT_COLLECTIONS_API } from '~/constants'

import { fetchApi } from '~/utils/async'

export const useFetchNftCollectionsList = ({ disabled }: { disabled?: boolean }): IGetSearchList => {
	const { data, isLoading, isError } = useQuery({
		queryKey: [NFT_COLLECTIONS_API],
		queryFn: () =>
			fetchApi(NFT_COLLECTIONS_API)
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
				}),
		staleTime: 60 * 60 * 1000,
		enabled: !disabled
	})

	return { data, error: isError, loading: isLoading, onSearchTermChange: null, onItemClick: null }
}
