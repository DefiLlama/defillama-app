import * as React from 'react'
import styled from 'styled-components'
import { BaseSearch } from 'components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from 'components/Search/BaseSearch'
import { useFetchYieldsList } from 'utils/categories/yield'

interface IYieldsSearchProps extends ICommonSearchProps {}

//tmp fix: made step optional
export default function YieldsSearch(props: IYieldsSearchProps) {
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

  return <BaseSearch {...props} data={searchData} loading={loading} />
}

const ToggleSearch = styled.button`
  margin-left: auto;
  padding: 16px;
  color: #4190ff;

  :hover,
  :focus-visible {
    color: #2172e5;
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text1};
  }
`
