import { BaseSearch } from '../BaseSearch'
import type { IBaseSearchProps } from '../BaseSearch'
import { useEffect, useMemo, useState } from 'react'
import { useFetchNFTsList } from 'utils/categories/nfts'

interface INFTSearchProps {
  step: IBaseSearchProps['step']
  preLoadedSearch: Array<{
    name: string
    route: string
    logo: string
  }>
}

export default function NFTsSearch({ step, preLoadedSearch }: INFTSearchProps) {
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
  }, [data, usePreloadedList])

  return <BaseSearch data={searchData} loading={loading} step={step} onSearchTermChange={setSearchValue} />
}
