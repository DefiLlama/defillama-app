import { IStep, SearchDefault } from 'components/Search/New'
import { useMemo } from 'react'
import { useFetchYieldsList } from 'utils/categories/yield'

//tmp fix: made step optional
export default function YieldsSearch({ step }: { step?: IStep }) {
  const { data, loading } = useFetchYieldsList()

  const searchData =
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

  return <SearchDefault data={searchData} loading={loading} step={step} />
}
