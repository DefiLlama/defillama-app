import * as React from 'react'
import { useFetchNFTsList } from '~/api/categories/nfts'
import type { IBaseSearchProps, IGetSearchList } from '../types'

// TODO use preloaded search on mobile
export function useGetNftsSearchList(): IGetSearchList {
	const [searchValue, setSearchValue] = React.useState(null)

	const { data, loading } = useFetchNFTsList(searchValue)

	const searchData: IBaseSearchProps['data'] = React.useMemo(() => {
		return (
			data?.map((el) => ({
				name: el.name,
				route: `/nfts/collection/${el.slug}`,
				logo: el.logo
			})) ?? []
		)
	}, [data])

	return { data: searchData, loading, error: !data && !loading, onSearchTermChange: setSearchValue }
}
