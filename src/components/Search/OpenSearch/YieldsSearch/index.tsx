import { BaseSearch } from 'components/Search/OpenSearch/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from 'components/Search/OpenSearch/BaseSearch'
import { useMemo } from 'react'
import { useFetchYieldsList } from 'utils/categories/yield'

interface IYieldsSearchProps extends ICommonSearchProps {}

//tmp fix: made step optional
export default function YieldsSearch(props: IYieldsSearchProps) {
  const { data, loading } = useFetchYieldsList()

  const searchData: IBaseSearchProps['data'] =
    useMemo(() => {
      return (
        data?.map((el) => ({
          name: `${el.name} (${el.symbol.toUpperCase()})`,
          symbol: el.symbol.toUpperCase(),
          route: `/yields/token/${el.symbol.toUpperCase()}`,
          logo: el.image,
        })) ?? []
      )
    }, [data]) ?? []

  return <BaseSearch {...props} data={searchData} loading={loading} />
}
