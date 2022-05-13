import { GeneralLayout } from 'layout'
import { PageWrapper, FullWrapper } from 'components'
import Search from 'components/Search'
import { AutoColumn } from 'components/Column'
import Table, { columnsToShow } from 'components/Table'
import { formattedPercent } from 'utils'
import { CheckMarks } from 'components/SettingsModal'
import { CustomLink } from 'components/Link'
import { AutoRow } from 'components/Row'
import { NameYield } from 'components/Table/index'
import {
  useNoILManager,
  useSingleExposureManager,
  useStablecoinsManager,
  useMillionDollarManager,
} from 'contexts/LocalStorage'
import { useYieldPoolsData } from 'utils/dataApi'
import { useRouter } from 'next/router'
import QuestionHelper from 'components/QuestionHelper'
import LocalLoader from 'components/LocalLoader'
import Filters from 'components/Filters'
import { ListHeader, ListOptions } from 'components/ChainPage'

const YieldPage = () => {
  // load the full data once
  const { data: poolData, loading } = useYieldPoolsData()
  let pools = poolData?.data ? poolData.data : []
  const chainList = [...new Set(pools.map((p) => p.chain))]

  const { query } = useRouter()
  // filter to requested token
  pools = pools.filter((p) => p.symbol.toLowerCase().includes(query.token.toLowerCase()))

  const columns = [
    {
      header: 'Pool',
      accessor: 'pool',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => (
        <CustomLink href={`/yields/pool/${rowValues.id}`}>
          {rowValues.project === 'Osmosis' ? `${value} ${rowValues.id.split('-').slice(-1)}` : value}
        </CustomLink>
      ),
    },
    {
      header: 'Project',
      accessor: 'project',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => <NameYield value={(value, rowValues)} />,
    },
    ...columnsToShow('chains', 'tvl'),
    {
      header: 'APY',
      accessor: 'apy',
      helperText: 'Annualised percentage yield',
      Cell: ({ value, rowValues }) => {
        return (
          <AutoRow sx={{ width: '100%', justifyContent: 'flex-end' }}>
            {rowValues.project === 'Osmosis' ? (
              <QuestionHelper text={`${rowValues.id.split('-').slice(-1)} lock`} />
            ) : null}
            {formattedPercent(value, true)}
          </AutoRow>
        )
      },
    },
    {
      header: '1d change',
      accessor: 'change1d',
      Cell: ({ value }) => <>{formattedPercent(value)}</>,
    },
    {
      header: '7d change',
      accessor: 'change7d',
      Cell: ({ value }) => <>{formattedPercent(value)}</>,
    },
    {
      header: 'Outlook',
      accessor: 'outlook',
      helperText:
        'The predicted outlook indicates if the current APY can be maintained (stable or up) or not (down) within the next 4weeks. The algorithm consideres APYs as stable with a fluctuation of up to -20% from the current APY.',
      Cell: ({ value }) => <>{value}</>,
    },
    {
      header: 'Probability',
      accessor: 'probability',
      helperText: 'Predicted probability of outlook',
      Cell: ({ value }) => <>{value === null ? null : value.toFixed(2) + '%'}</>,
    },
  ]

  const selectedTab = 'All'
  const tabOptions = [
    {
      label: 'All',
      to: '/yields',
    },
    ...chainList.map((el) => ({ label: el, to: `/yields/chain/${el}` })),
  ]

  // toggles
  const [stablecoins] = useStablecoinsManager()
  const [noIL] = useNoILManager()
  const [singleExposure] = useSingleExposureManager()
  const [millionDollar] = useMillionDollarManager()
  // apply toggles
  pools = stablecoins === true ? pools.filter((el) => el.stablecoin === true) : pools
  pools = noIL === true ? pools.filter((el) => el.ilRisk === 'no') : pools
  pools = singleExposure === true ? pools.filter((el) => el.exposure === 'single') : pools
  pools = millionDollar === true ? pools.filter((el) => el.tvlUsd >= 1e6) : pools

  return (
    <PageWrapper>
      <FullWrapper>
        <AutoColumn gap="24px">
          <Search />
        </AutoColumn>
        <CheckMarks type="yields" style={{ display: 'flex', justifyContent: 'center' }} />

        <ListOptions>
          <ListHeader>Yield Rankings</ListHeader>
          {!loading && <Filters filterOptions={tabOptions} activeLabel={selectedTab} />}
        </ListOptions>

        {poolData === undefined ? (
          <LocalLoader />
        ) : (
          <Table
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
              probability: t.predictions.predictedProbability,
            }))}
            secondColumnAlign="start"
            columns={columns}
          />
        )}
      </FullWrapper>
    </PageWrapper>
  )
}

export default function YieldPoolPage(props) {
  return (
    <GeneralLayout title={`Yield Chart - DefiLlama`} defaultSEO>
      <YieldPage {...props} />
    </GeneralLayout>
  )
}
