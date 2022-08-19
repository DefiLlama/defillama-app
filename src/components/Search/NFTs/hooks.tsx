import * as React from 'react'
import { useFetchNFTsList } from '~/api/categories/nfts'
import { IBaseSearchProps } from '../types'

export function useGetNftsSearchList() {
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
