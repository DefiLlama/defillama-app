import { BaseSearch } from '../BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '../BaseSearch'
import { useEffect, useMemo, useState } from 'react'
import { useFetchNFTsList } from 'utils/categories/nfts'

interface INFTSearchProps extends ICommonSearchProps {
  preLoadedSearch: Array<{
    name: string
    route: string
    logo: string
  }>
}

export default function NFTsSearch(props: INFTSearchProps) {
  const { preLoadedSearch } = props
  const [searchValue, setSearchValue] = useState('')
  const [usePreloadedList, setUsePreloadedList] = useState(false)
  const { data, loading } = useFetchNFTsList(searchValue)

  useEffect(() => {
    if (preLoadedSearch && !searchValue && !loading) setUsePreloadedList(true)
    else setUsePreloadedList(false)
  }, [preLoadedSearch, searchValue, loading])

  const searchData: IBaseSearchProps['data'] = useMemo(() => {
    const set = usePreloadedList ? preLoadedSearch : data ?? []
    return set.map((el) => ({
      name: el.name,
      route: `/nfts/collection/${el.slug}`,
      logo: el.logo,
    }))
  }, [data, usePreloadedList, preLoadedSearch])

  return <BaseSearch {...props} data={searchData} loading={loading} onSearchTermChange={setSearchValue} />
}
