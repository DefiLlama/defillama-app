import { useMemo, useState } from 'react'
import { BaseSearch } from '../BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '../BaseSearch'
import { useFetchNFTsList } from '~/api/categories/nfts'

interface INFTSearchProps extends ICommonSearchProps {
	preLoadedSearch: Array<{
		name: string
		route: string
		logo: string
	}>
}

export default function NFTsSearch(props: INFTSearchProps) {
	const [searchValue, setSearchValue] = useState(null)
	const { data, loading } = useFetchNFTsList(searchValue)

	const searchData: IBaseSearchProps['data'] = useMemo(() => {
		return (
			data?.map((el) => ({
				name: el.name,
				route: `/nfts/collection/${el.slug}`,
				logo: el.logo
			})) ?? []
		)
	}, [data])

	return <BaseSearch {...props} data={searchData} loading={loading} onSearchTermChange={setSearchValue} />
}
