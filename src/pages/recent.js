import { FullWrapper, PageWrapper } from 'components'
import ChainsRow from 'components/ChainsRow'
import { CustomLink } from 'components/Link'
import Table, { Index } from 'components/Table'
import TokenLogo from 'components/TokenLogo'
import { useMemo } from 'react'
import Bookmark from 'components/Bookmark'
import styled from 'styled-components'
import { formattedPercent, slug, toK, tokenIconUrl } from 'utils'
import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData } from '../utils/dataApi'

export async function getStaticProps() {
  const protocolsRaw = await getSimpleProtocolsPageData([
    'tvl',
    'name',
    'symbol',
    'chains',
    'change_1d',
    'change_7d',
    'change_1m',
    'listedAt',
    'extraTvl',
  ])
  const protocols = protocolsRaw.protocols.filter((p) => p.listedAt).sort((a, b) => b.listedAt - a.listedAt)
  return {
    props: {
      protocols,
    },
    revalidate: revalidate(),
  }
}

const SaveButton = styled(Bookmark)`
  position: relative;
  top: 2px;
  cursor: pointer;
  width: 16px;
  height: 16px;
`

export default function Protocols({ protocols }) {
  const data = useMemo(() => {
    const currentTimestamp = Date.now() / 1000
    const secondsInDay = 3600 * 24
    return protocols.map((p) => ({
      ...p,
      listedAt: ((currentTimestamp - p.listedAt) / secondsInDay).toFixed(2),
    }))
  }, [protocols])

  const columns = useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        Cell: ({ value, row, flatRows }) => {
          const index = flatRows.indexOf(row)
          const name = row.original.symbol === '-' ? value : `${value} (${row.original.symbol})`
          return (
            <Index>
              <SaveButton readableProtocolName={value} />
              <span>{index + 1}</span>
              <TokenLogo logo={tokenIconUrl(value)} />
              <CustomLink href={`/protocol/${slug(value)}`}>{name}</CustomLink>
            </Index>
          )
        },
      },
      {
        Header: 'Chains',
        accessor: 'chains',
        disableSortBy: true,
        Cell: ({ value }) => {
          return <ChainsRow chains={value} />
        },
      },
      {
        Header: 'Listed',
        accessor: 'listedAt',
        Cell: ({ value }) => {
          return <span style={{ whiteSpace: 'nowrap' }}>{value} days ago</span>
        },
      },
      {
        Header: '1d Change',
        accessor: 'change_1d',
        Cell: ({ value }) => {
          return <>{formattedPercent(value)}</>
        },
      },
      {
        Header: '7d Change',
        accessor: 'change_7d',
        Cell: ({ value }) => {
          return <>{formattedPercent(value)}</>
        },
      },
      {
        Header: '1m Change',
        accessor: 'change_1m',
        Cell: ({ value }) => {
          return <>{formattedPercent(value)}</>
        },
      },
      {
        Header: 'TVL',
        accessor: 'tvl',
        Cell: ({ value }) => {
          return <span>{'$' + toK(value)}</span>
        },
      },
    ],
    []
  )

  return (
    <GeneralLayout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <Table data={data} columns={columns} />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
