import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData } from '../utils/dataApi'
import { CustomLink } from 'components/Link'
import { PageWrapper, FullWrapper } from 'components'
import { FullTable, Index } from 'components/Table'
import TokenLogo from 'components/TokenLogo'
import { chainIconUrl } from 'utils'
import { useMemo } from 'react'
import styled from 'styled-components'
import { TYPE } from 'Theme'

export async function getStaticProps() {
  const { protocols, chains } = await getSimpleProtocolsPageData(['name', 'extraTvl', 'chainTvls', 'category'])
  const topProtocolPerChainAndCategory = Object.fromEntries(chains.map((c) => [c, {}]))
  protocols.forEach((p) => {
    const { chainTvls, category, name } = p
    Object.entries(chainTvls).forEach(([chain, tvl]) => {
      if (topProtocolPerChainAndCategory[chain] === undefined) {
        return
      }
      const currentTopProtocol = topProtocolPerChainAndCategory[chain][category]
      if (currentTopProtocol === undefined || tvl > currentTopProtocol[1]) {
        topProtocolPerChainAndCategory[chain][category] = [name, tvl]
      }
    })
  })
  const data = []
  const uniqueCategories = new Set()
  chains.forEach((chain) => {
    const categories = topProtocolPerChainAndCategory[chain]
    const values = {}

    for (const cat in categories) {
      uniqueCategories.add(cat)
      values[cat] = categories[cat][0]
    }
    data.push({ chain, ...values })
  })
  const columns = Array.from(uniqueCategories).map((item) => ({ header: item, accessor: item, disableSortBy: true }))
  return {
    props: {
      data,
      columns,
    },
    revalidate: revalidate(),
  }
}

const TableWrapper = styled(FullWrapper)`
  position: relative;

  & > div {
    padding: 0 !important;
  }

  td,
  th {
    white-space: nowrap;
    padding: 12px !important;
    border-right: 1px solid;
    border-color: ${({ theme }) => theme.divider};

    &:last-child {
      border-right: none !important;
    }

    ${({ theme: { minLg } }) => minLg} {
      &:first-child {
        position: sticky;
        left: 0;
        background: ${({ theme }) => theme.bg1};
        z-index: 1;
      }
    }
  }

  th {
    font-weight: 500 !important;
  }
`

export default function Chains({ data, columns }) {
  const allColumns = useMemo(
    () => [
      {
        header: 'Chain',
        accessor: 'chain',
        disableSortBy: true,
        Cell: ({ value, rowIndex }) => {
          return (
            <Index>
              <span>{rowIndex + 1}</span>
              <TokenLogo logo={chainIconUrl(value)} />
              <CustomLink href={`/chain/${value}`}>{value}</CustomLink>
            </Index>
          )
        },
      },
      ...columns,
    ],
    [columns]
  )

  return (
    <GeneralLayout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <PageWrapper style={{ paddingBottom: '0 !important' }}>
        <TableWrapper>
          <TYPE.largeHeader>Top Protocols</TYPE.largeHeader>
          <FullTable data={data} columns={allColumns} align="start" gap="12px" style={{ height: '85vh' }} />
        </TableWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
