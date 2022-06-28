import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Panel } from 'components'
import Table, { columnsToShow, NameYield, NameYieldPool } from 'components/Table'
import { AutoRow } from 'components/Row'
import QuestionHelper from 'components/QuestionHelper'
import { YieldAttributes, TVLRange, FiltersByChain } from 'components/Filters'
import IconsRow from 'components/IconsRow'
import { YieldsSearch } from 'components/Search'
import {
  useNoILManager,
  useSingleExposureManager,
  useStablecoinsManager,
  useMillionDollarManager,
  useAuditedManager,
} from 'contexts/LocalStorage'
import { capitalizeFirstLetter, formattedPercent } from 'utils'

export const TableWrapper = styled(Table)`
  tr > *:not(:first-child) {
    & > * {
      width: 100px;
      font-weight: 400;
    }
  }

  // POOL
  tr > *:nth-child(1) {
    & > * {
      width: 120px;
      display: flex;
    }

    a {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  // PROJECT
  tr > *:nth-child(2) {
    display: none;
    text-align: start;
    margin-left: 0;

    & > * {
      text-align: start;
      margin-left: 0;
    }

    a {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  // CHAINS
  tr > *:nth-child(3) {
    display: none;
  }

  // TVL
  tr > *:nth-child(4) {
    display: none;
  }

  // APY
  tr > *:nth-child(5) {
    padding-right: 20px;
  }

  // 1D CHANGE
  tr > *:nth-child(6) {
    display: none;
  }

  // 7D CHANGE
  tr > *:nth-child(7) {
    display: none;
    padding-right: 20px;
  }

  // OUTLOOK
  tr > *:nth-child(8) {
    display: none;
  }

  // CONFIDENCE
  tr > *:nth-child(9) {
    display: none;
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
    // POOL
    tr > *:nth-child(1) {
      & > * {
        width: 200px;
      }
    }

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
    // POOL
    tr > *:nth-child(1) {
      & > * {
        width: 240px;
      }
    }

    // PROJECT
    tr > *:nth-child(2) {
      & > div {
        width: 160px;

        // HIDE LOGO
        & > div {
          display: revert;
        }
      }
    }

    // 1D CHANGE
    tr > *:nth-child(6) {
      display: revert;
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
    Cell: ({ value, rowValues }) => (
      <NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} />
    ),
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
  const [chainsToFilter, setChainsToFilter] = useState<string[]>(chainList)

  const { query } = useRouter()
  const { minTvl, maxTvl } = query

  // if route query contains 'project' remove project href
  const idx = columns.findIndex((c) => c.accessor === 'project')

  if (query.project) {
    columns[idx] = {
      header: 'Project',
      accessor: 'project',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => (
        <NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} rowType="accordion" />
      ),
    }
  } else {
    columns[idx] = {
      header: 'Project',
      accessor: 'project',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => (
        <NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} />
      ),
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
    const poolsData = pools
      .map((t) => ({
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
      .filter((p) => chainsToFilter.find((chain) => chain === p.chains[0]))

    const isValidTvlRange =
      (minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

    return isValidTvlRange
      ? poolsData.filter((p) => (minTvl ? p.tvl > minTvl : true) && (maxTvl ? p.tvl < maxTvl : true))
      : poolsData
  }, [minTvl, maxTvl, pools, chainsToFilter])

  let stepName = undefined
  if (query.chain) stepName = selectedTab
  else if (query.project) stepName = poolsData[0]?.project ?? capitalizeFirstLetter(query.project)

  return (
    <>
      <YieldsSearch step={{ category: 'Yields', name: stepName ?? 'All chains' }} />

      {/* <ScatterChart></ScatterChart> */}
      <TableFilters>
        <TableHeader>Yield Rankings</TableHeader>
        <Dropdowns>
          <FiltersByChain chains={chainList} setChainsToFilter={setChainsToFilter} />
          <YieldAttributes />
          <TVLRange />
        </Dropdowns>
      </TableFilters>

      {poolsData.length > 0 ? (
        <TableWrapper data={poolsData} columns={columns} />
      ) : (
        <Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
          {stepName ? `${stepName} has no pools listed` : "Couldn't find any pools for these filters"}
        </Panel>
      )}
    </>
  )
}

const TableFilters = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin: 0 0 -20px;
`

const Dropdowns = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;

  button {
    font-weight: 400;
  }
`

const TableHeader = styled.h1`
  margin: 0 auto 0 0;
  font-weight: 500;
  font-size: 1.125rem;
`

export default YieldPage
