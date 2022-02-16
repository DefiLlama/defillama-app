import { FullWrapper, PageWrapper } from 'components'
import ChainsRow from 'components/ChainsRow'
import Table, { chainHelperText, ProtocolName } from 'components/Table'
import { useMemo } from 'react'
import { formattedPercent, toK } from 'utils'
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
        header: 'Name',
        accessor: 'name',
        disableSortBy: true,
        Cell: ({ value, rowValues, rowIndex }) => (
          <ProtocolName value={value} symbol={rowValues.symbol} index={rowIndex + 1} bookmark />
        ),
      },
      ,
      {
        header: 'Chains',
        accessor: 'chains',
        disableSortBy: true,
        helperText: chainHelperText,
        Cell: ({ value }) => <ChainsRow chains={value} />,
      },
      {
        header: 'Listed',
        accessor: 'listedAt',
        Cell: ({ value }) => <span style={{ whiteSpace: 'nowrap' }}>{value} days ago</span>,
      },
      {
        header: '1d Change',
        accessor: 'change_1d',
        Cell: ({ value }) => <>{formattedPercent(value)}</>,
      },
      {
        header: '7d Change',
        accessor: 'change_7d',
        Cell: ({ value }) => <>{formattedPercent(value)}</>,
      },
      {
        header: '1m Change',
        accessor: 'change_1m',
        Cell: ({ value }) => <>{formattedPercent(value)}</>,
      },
      {
        header: 'TVL',
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
