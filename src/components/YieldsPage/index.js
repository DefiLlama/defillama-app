import Table, { columnsToShow, NameYield, TableFilters, NameYieldPool } from 'components/Table'
import { formattedPercent } from 'utils'
import { CheckMarks } from 'components/SettingsModal'
import styled from 'styled-components'
import { AutoRow } from 'components/Row'
import {
  useNoILManager,
  useSingleExposureManager,
  useStablecoinsManager,
  useMillionDollarManager,
  useAuditedManager,
} from 'contexts/LocalStorage'
import QuestionHelper from 'components/QuestionHelper'
import Filters from 'components/Filters'
import { ListHeader, ListOptions } from 'components/ChainPage'
import IconsRow from 'components/IconsRow'
import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { YieldsSearch } from 'components/Search/New'

export const TableWrapper = styled(Table)`
  tr > *:not(:first-child) {
    & > div {
      width: 100px;
      white-space: nowrap;
      overflow: hidden;
      font-weight: 400;
    }
  }

  // POOL
  tr > *:nth-child(1) {
    & > a {
      width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }
  }

  // PROJECT
  tr > *:nth-child(2) {
    display: none;
    text-align: start;

    & > div {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  // CHAINS
  tr > *:nth-child(3) {
    display: none;
    & > * {
      margin-left: auto;
    }
  }

  // TVL
  tr > *:nth-child(4) {
    display: none;
    & > * {
      margin-left: auto;
    }
  }

  // APY
  tr > *:nth-child(5) {
    padding-right: 20px;
    & > * {
      margin-left: auto;
    }
  }

  // 1D CHANGE
  tr > *:nth-child(6) {
    display: none;
    & > * {
      margin-left: auto;
    }
  }

  // 7D CHANGE
  tr > *:nth-child(7) {
    display: none;
    padding-right: 20px;
    & > * {
      margin-left: auto;
    }
  }

  // OUTLOOK
  tr > *:nth-child(8) {
    display: none;
    & > * {
      margin-left: auto;
    }
  }

  // CONFIDENCE
  tr > *:nth-child(9) {
    display: none;
  }

  // OUTLOOK
  tr > th:nth-child(8) {
    & > div {
      margin-left: auto;
    }
  }

  // CONFIDENCE
  tr > th:nth-child(9) {
    & > div {
      margin-left: auto;
    }
  }

  @media screen and (min-width: 320px) {
    tr > *:nth-child(1) {
      & > a {
        width: 140px;
      }
    }
  }

  @media screen and (min-width: 360px) {
    tr > *:nth-child(1) {
      & > a {
        width: 180px;
      }
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpSm}) {
    // PROJECT
    tr > *:nth-child(2) {
      display: revert;
      & > div {
        width: 100px;
        overflow: hidden;
        white-space: nowrap;

        // HIDE LOGO
        & > div {
          display: none;
        }

        & > a {
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpMed}) {
    // TVL
    tr > *:nth-child(4) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    // APY
    tr > *:nth-child(5) {
      padding-right: 0px;
    }

    // 7D CHANGE
    tr > *:nth-child(7) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpXl}) {
    // 7D CHANGE
    tr > *:nth-child(7) {
      padding-right: 0;
    }

    // OUTLOOK
    tr > *:nth-child(8) {
      display: revert;
    }

    // CONFIDENCE
    tr > *:nth-child(9) {
      display: revert;
    }
  }

  @media screen and (min-width: 1536px) {
    // 1D CHANGE
    tr > *:nth-child(6) {
      display: revert;
    }

    tr > *:nth-child(2) {
      & > div {
        width: 200px;

        // HIDE LOGO
        & > div {
          display: revert;
        }
      }
    }
  }

  // CHAINS
  @media screen and (min-width: 1680px) {
    tr > *:nth-child(3) {
      display: revert;
    }
  }
`

export const columns = [
  {
    header: 'Pool',
    accessor: 'pool',
    disableSortBy: true,
    Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
      <NameYieldPool
        value={value}
        poolId={rowValues.id}
        project={rowValues.project}
        index={rowIndex !== null && rowIndex + 1}
        bookmark
        rowType={rowType}
      />
    ),
  },
  {
    header: 'Project',
    accessor: 'project',
    disableSortBy: true,
    Cell: ({ value, rowValues }) => <NameYield value={(value, rowValues)} />,
  },
  {
    header: 'Chains',
    accessor: 'chains',
    disableSortBy: true,
    helperText: "Chains are ordered by protocol's highest TVL on each chain",
    Cell: ({ value }) => <IconsRow links={value} url="/yields/chain" iconType="chain" />,
  },
  ...columnsToShow('tvl'),
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
    header: 'Confidence',
    accessor: 'confidence',
    helperText: 'Predicted outlook confidence',
    Cell: ({ value }) => <>{value === null ? null : value === 1 ? 'Low' : value === 2 ? 'Medium' : 'High'}</>,
  },
]

const YieldPage = ({ pools, chainList }) => {
  const chain = [...new Set(pools.map((el) => el.chain))]
  const selectedTab = chain.length > 1 ? 'All' : chain[0]
  const tabOptions = [
    {
      label: 'All',
      to: '/yields',
    },
    ...chainList.map((el) => ({ label: el, to: `/yields/chain/${el}` })),
  ]

  const { query } = useRouter()
  const { minTvl, maxTvl } = query

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

  const poolsData = useMemo(() => {
    const poolsData = pools.map((t) => ({
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
    }))

    const isValidTvlRange =
      minTvl !== undefined && maxTvl !== undefined && !Number.isNaN(minTvl) && !Number.isNaN(maxTvl)

    return isValidTvlRange ? poolsData.filter((p) => p.tvl > minTvl && p.tvl < maxTvl) : poolsData
  }, [minTvl, maxTvl, pools])

  return (
    <>
      <YieldsSearch />

      <CheckMarks type="yields" style={{ display: 'flex', justifyContent: 'center' }} />

      <ListOptions>
        <ListHeader>Yield Rankings</ListHeader>
        <Filters filterOptions={tabOptions} activeLabel={selectedTab} />
        <TableFilters />
      </ListOptions>

      <TableWrapper data={poolsData} columns={columns} />
    </>
  )
}

export default YieldPage
