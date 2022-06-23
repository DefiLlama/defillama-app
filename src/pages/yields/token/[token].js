import { useRouter } from 'next/router'
import Layout from 'layout'
import { YieldsSearch } from 'components/Search'
import LocalLoader from 'components/LocalLoader'
import Filters from 'components/Filters'
import { ListHeader, ListOptions } from 'components/ChainPage'
import { TableWrapper, columns } from 'components/YieldsPage'
import { NameYield } from 'components/Table'
import {
  useNoILManager,
  useSingleExposureManager,
  useStablecoinsManager,
  useMillionDollarManager,
  useAuditedManager,
} from 'contexts/LocalStorage'
import { useYieldPoolsData } from 'utils/dataApi'
import { YieldAttributes } from 'components/DropdownMenu'

const YieldPage = () => {
  // load the full data once
  const { data: poolData, loading } = useYieldPoolsData()
  let pools = poolData?.data ? poolData.data : []
  const chainList = [...new Set(pools.map((p) => p.chain))]

  const { query } = useRouter()
  // filter to requested token
  pools = pools.filter((p) => p.symbol.toLowerCase().includes(query.token.toLowerCase()))

  const selectedTab = 'All'
  const tabOptions = [
    {
      label: 'All',
      to: '/yields',
    },
    ...chainList.map((el) => ({ label: el, to: `/yields/chain/${el}` })),
  ]

  // if route query contains 'project' remove project href
  const idx = columns.findIndex((c) => c.accessor === 'project')
  if (query.project) {
    columns[idx] = {
      header: 'Project',
      accessor: 'project',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => <NameYield value={(value, rowValues)} rowType={'accordion'} />,
    }
  } else {
    columns[idx] = {
      header: 'Project',
      accessor: 'project',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => <NameYield value={(value, rowValues)} />,
    }
  }

  // toggles
  const [stablecoins] = useStablecoinsManager()
  const [noIL] = useNoILManager()
  const [singleExposure] = useSingleExposureManager()
  const [millionDollar] = useMillionDollarManager()
  const [audited] = useAuditedManager()
  // apply toggles
  pools = stablecoins === true ? pools.filter((el) => el.stablecoin === true) : pools
  pools = noIL === true ? pools.filter((el) => el.ilRisk === 'no') : pools
  pools = singleExposure === true ? pools.filter((el) => el.exposure === 'single') : pools
  pools = millionDollar === true ? pools.filter((el) => el.tvlUsd >= 1e6) : pools
  pools = audited === true ? pools.filter((el) => el.audits !== '0') : pools

  return (
    <>
      <YieldsSearch step={{ category: 'Yields', name: query.token }} />

      <ListOptions>
        <ListHeader>Yield Rankings</ListHeader>
        {!loading && <Filters filterOptions={tabOptions} activeLabel={selectedTab} />}
        <YieldAttributes />
      </ListOptions>

      {poolData === undefined ? (
        <LocalLoader />
      ) : (
        <TableWrapper
          data={pools.map((t) => ({
            id: t.pool,
            pool: t.symbol,
            projectslug: t.project,
            project: t.projectName,
            chains: [t.chain],
            tvl: t.tvlUsd,
            apy: t.apy,
            change1d: t.apyPct1D,
            change7d: t.apyPct7D,
            outlook: t.predictions.predictedClass,
            confidence: t.predictions.binnedConfidence,
          }))}
          secondColumnAlign="start"
          columns={columns}
        />
      )}
    </>
  )
}

export default function YieldPoolPage(props) {
  return (
    <Layout title={`Yield Chart - DefiLlama`} defaultSEO>
      <YieldPage {...props} />
    </Layout>
  )
}
