import { useMemo } from 'react'
import styled from 'styled-components'
import { Header } from 'Theme'
import Layout from 'layout'
import { ProtocolsChainsSearch } from 'components/Search'
import Table, { columnsToShow } from 'components/Table'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { revalidate, getSimpleProtocolsPageData, basicPropertiesToKeep } from 'utils/dataApi'

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
    & > * {
      width: 100px;
      font-weight: 400;
    }
  }

  // PROTOCOL NAME
  tr > *:nth-child(1) {
    & > * {
      width: 160px;

      #table-p-logo,
      #table-p-symbol {
        display: none;
      }
    }
  }

  // CATEGORY
  tr > *:nth-child(2) {
    display: none;
  }

  // CHAINS
  tr > *:nth-child(3) {
    display: none;
  }

  // LISTED AT
  tr > *:nth-child(4) {
    display: none;
  }

  // 1D CHANGE
  tr > *:nth-child(5) {
    display: none;
  }

  // 7D CHANGE
  tr > *:nth-child(6) {
    display: none;
  }

  // 1M CHANGE
  tr > *:nth-child(7) {
    display: none;
  }

  // TVL
  tr > *:nth-child(8) {
    padding-right: 20px;
  }

  @media screen and (min-width: ${({ theme }) => theme.bpSm}) {
    // LISTED AT
    tr > *:nth-child(4) {
      display: revert;
    }
  }

  @media screen and (min-width: 640px) {
    // 1D CHANGE
    tr > *:nth-child(5) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpMed}) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > * {
        width: 200px;
      }

      #table-p-logo {
        display: flex;
      }
    }
  }

  @media screen and (min-width: 900px) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > * {
        width: 280px;
      }

      #table-p-symbol {
        display: revert;
      }
    }

    // 7D CHANGE
    tr > *:nth-child(6) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    // 7D CHANGE
    tr > *:nth-child(6) {
      display: none;
    }
  }

  @media screen and (min-width: 1200px) {
    // CATEGORY
    tr > *:nth-child(2) {
      display: revert;
    }

    // 7D CHANGE
    tr > *:nth-child(6) {
      display: revert;
    }
  }

  @media screen and (min-width: 1536px) {
    // CHAINS
    tr > *:nth-child(3) {
      display: revert;
    }

    // 1M CHANGE
    tr > *:nth-child(7) {
      display: revert !important;
    }
  }
`

const columns = columnsToShow(
  'protocolName',
  'category',
  'chains',
  'listedAt',
  '1dChange',
  '7dChange',
  '1mChange',
  'tvl'
)

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
    <Layout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <ProtocolsChainsSearch step={{ category: 'Home', name: 'Recent' }} />

      <Header>Recently Listed Protocols</Header>

      <TableWrapper data={protocolsData} columns={columns} />
    </Layout>
  )
}
