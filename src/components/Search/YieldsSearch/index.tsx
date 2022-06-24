import * as React from 'react'
import { BaseSearch } from 'components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from 'components/Search/BaseSearch'
import { useFetchYieldsList } from 'utils/categories/yield'
import { AdvancedYieldsSearch } from './Advanced'
import { ToggleSearch } from './shared'

export default function YieldsSearch(props: ICommonSearchProps) {
  const [advancedSearch, setAdvancedSearch] = React.useState(false)

  const { data, loading } = useFetchYieldsList()

  const searchData: IBaseSearchProps['data'] =
    React.useMemo(() => {
      return (
        data?.map((el) => ({
          name: `${el.name} (${el.symbol.toUpperCase()})`,
          symbol: el.symbol.toUpperCase(),
          route: `/yields/token/${el.symbol.toUpperCase()}`,
          logo: el.image,
        })) ?? []
      )
    }, [data]) ?? []

  // if (!props.step?.hideOptions && advancedSearch) {
  //   return <AdvancedYieldsSearch setAdvancedSearch={setAdvancedSearch} />
  // }

  return (
    <BaseSearch
      {...props}
      data={searchData}
      loading={loading}
      // filters={
      //   !props.step?.hideOptions && (
      //     <ToggleSearch onClick={() => setAdvancedSearch(true)}>Switch to Advanced Search</ToggleSearch>
      //   )
      // }
    />
  )
}
