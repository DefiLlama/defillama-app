import { FullWrapper, PageWrapper } from 'components'
import Table, { columnsToShow, splitArrayByFalsyValues } from 'components/Table'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { useMemo } from 'react'
import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData, basicPropertiesToKeep } from '../utils/dataApi'
import orderBy from 'lodash.orderby'
import { TYPE } from 'Theme'
import styled from 'styled-components'

export async function getStaticProps() {
  const { protocols } = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl'])

  return {
    props: {
      protocols,
    },
    revalidate: revalidate(),
  }
}

const columns = columnsToShow('protocolName', 'chains', '1dChange', 'tvl', 'mcaptvl')

export default function TopGainersLosers({ protocols }) {
  const data = useCalcStakePool2Tvl(protocols)
  const { topGainers, topLosers } = useMemo(() => {
    const values = splitArrayByFalsyValues(data, 'change_1d')
    const sortedData = orderBy(values[0], ['change_1d'], ['desc'])
    return {
      topGainers: sortedData.slice(0, 5),
      topLosers: sortedData.slice(-5).reverse(),
    }
  }, [data])

  return (
    <GeneralLayout title={`Top Gainers and Losers - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          {/* <PageHeader title="Top Gainers and Losers" /> */}
          <Header>Top Gainers</Header>
          <Table data={topGainers} columns={columns} />
          <Header>Top Losers</Header>
          <Table data={topLosers} columns={columns} />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}

const Header = styled(TYPE.largeHeader)`
  margin: 12px 0 -12px !important;
`
