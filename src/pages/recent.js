import { FullWrapper, PageWrapper } from 'components'
import PageHeader from 'components/PageHeader'
import Table, { columnsToShow } from 'components/Table'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { useMemo } from 'react'
import styled from 'styled-components'
import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData, basicPropertiesToKeep } from '../utils/dataApi'

export async function getStaticProps() {
  const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt'])
  const protocols = protocolsRaw.protocols.filter((p) => p.listedAt).sort((a, b) => b.listedAt - a.listedAt)
  return {
    props: {
      protocols,
    },
    revalidate: revalidate(),
  }
}

const TableWrapper = styled(Table)`
  tr > *:not(:first-child) {
    & > div {
      width: 100px;
      white-space: nowrap;
      overflow: hidden;
      font-weight: 400;
      margin-left: auto;
    }
  }

  // PROTOCOL NAME
  tr > *:nth-child(1) {
    & > div {
      width: 160px;
      overflow: hidden;
      white-space: nowrap;

      // HIDE LOGO
      & > *:nth-child(3) {
        display: none;
      }

      & > *:nth-child(4) {
        overflow: hidden;
        text-overflow: ellipsis;
        // HIDE SYMBOL
        & > *:nth-child(2) {
          display: none;
        }
      }
    }
  }

  // CHAINS
  tr > *:nth-child(2) {
    display: none;
    & > div {
      width: 200px;
      overflow: hidden;
      white-space: nowrap;
    }
  }

  // LISTED AT
  tr > *:nth-child(3) {
    display: none;
  }

  // 1D CHANGE
  tr > *:nth-child(4) {
    display: none;
  }

  // 7D CHANGE
  tr > *:nth-child(5) {
    display: none;
  }

  // 1M CHANGE
  tr > *:nth-child(6) {
    display: none;
  }

  // TVL
  tr > *:nth-child(7) {
    padding-right: 20px;
    & > div {
      text-align: right;
      margin-left: auto;
      white-space: nowrap;
      overflow: hidden;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpSm}) {
    // LISTED AT
    tr > *:nth-child(3) {
      display: revert;
    }
  }

  @media screen and (min-width: 640px) {
    // 1D CHANGE
    tr > *:nth-child(4) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpMed}) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > div {
        width: 300px;
        // SHOW LOGO
        & > *:nth-child(3) {
          display: revert;
        }
      }
    }
  }

  @media screen and (min-width: 900px) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > div {
        & > *:nth-child(4) {
          // SHOW SYMBOL
          & > *:nth-child(2) {
            display: revert;
          }
        }
      }
    }

    // 7D CHANGE
    tr > *:nth-child(5) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    // 7D CHANGE
    tr > *:nth-child(5) {
      display: none;
    }
  }

  @media screen and (min-width: 1200px) {
    // 7D CHANGE
    tr > *:nth-child(5) {
      display: revert;
    }
  }

  @media screen and (min-width: 1536px) {
    // CHAINS
    tr > *:nth-child(2) {
      display: revert;
    }

    // 1M CHANGE
    tr > *:nth-child(6) {
      display: revert !important;
    }
  }
`

const columns = columnsToShow('protocolName', 'chains', 'listedAt', '1dChange', '7dChange', '1mChange', 'tvl')

export default function Protocols({ protocols }) {
  const data = useMemo(() => {
    const currentTimestamp = Date.now() / 1000
    const secondsInDay = 3600 * 24
    return protocols.map((p) => ({
      ...p,
      listedAt: ((currentTimestamp - p.listedAt) / secondsInDay).toFixed(2),
    }))
  }, [protocols])

  const protocolsData = useCalcStakePool2Tvl(data, 'listedAt', 'asc')

  return (
    <GeneralLayout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <PageHeader title="Recently Listed Protocols" />
          <TableWrapper data={protocolsData} columns={columns} />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
