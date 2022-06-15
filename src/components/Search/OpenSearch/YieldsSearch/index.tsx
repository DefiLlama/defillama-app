import { BaseSearch } from 'components/Search/OpenSearch/BaseSearch'
import type { IBaseSearchProps } from 'components/Search/OpenSearch/BaseSearch'
import { useMemo } from 'react'
import { useFetchYieldsList } from 'utils/categories/yield'

interface IYieldsSearchProps {
  step?: IBaseSearchProps['step']
}

//tmp fix: made step optional
export default function YieldsSearch({ step }: IYieldsSearchProps) {
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

  return <BaseSearch data={searchData} loading={loading} step={step} />
}
