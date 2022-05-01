import { GeneralLayout } from 'layout'
import { PageWrapper, FullWrapper } from 'components'
import Search from 'components/Search'
import { AutoColumn } from 'components/Column'
import Table, { columnsToShow } from 'components/Table'
import { formattedPercent } from 'utils'
import { CheckMarks } from 'components/SettingsModal'
import { CustomLink } from 'components/Link'
import styled from 'styled-components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import { TYPE } from 'Theme'
import Filters from 'components/Filters'
import { NameYield } from 'components/Table/index'
import {
  useNoILManager,
  useSingleExposureManager,
  useStablecoinsManager,
  useMillionDollarManager,
} from 'contexts/LocalStorage'
import { useYieldPoolsData } from 'utils/dataApi'
import { useRouter } from 'next/router'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

const FiltersRow = styled(RowFlat)`
  @media screen and (min-width: 800px) {
    width: calc(100% - 90px);
  }
`

const YieldPage = () => {
  // load the full data once
  const { data: poolData } = useYieldPoolsData()
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
      Cell: ({ value, rowValues }) => <CustomLink href={`/yields/pool/${rowValues.id}`}>{value}</CustomLink>,
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
      Cell: ({ value }) => <>{formattedPercent(value, true)}</>,
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
      Cell: ({ value, rowValues }) => <>{rowValues.apy <= 0 ? null : value}</>,
    },
    {
      header: 'Probability',
      accessor: 'probability',
      helperText: 'Predicted probability of outlook',
      Cell: ({ value, rowValues }) => <>{rowValues.apy <= 0 ? null : value.toFixed(2) + '%'}</>,
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
        <ListOptions gap="10px" style={{ marginBottom: '.5rem' }}>
          <RowBetween>
            <TYPE.main fontSize={'1.125rem'}>Yield Rankings</TYPE.main>
            <FiltersRow>
              <Filters filterOptions={tabOptions} activeLabel={selectedTab} justify="end" />
            </FiltersRow>
          </RowBetween>
        </ListOptions>
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
            outlook: t.predictions.predictedClass === 0 ? 'Down' : 'Stable/Up',
            probability: t.predictions.predictedProbability,
          }))}
          secondColumnAlign="start"
          columns={columns}
        />
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
