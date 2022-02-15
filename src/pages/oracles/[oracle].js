import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getOraclePageData, revalidate } from 'utils/dataApi'
import { GeneralLayout } from 'layout'
import { useCalcExtraTvlsByDay, useCalcStakePool2Tvl } from 'hooks/data'
import {
  formattedNum,
  formattedPercent,
  getPercentChange,
  getPrevTvlFromChart,
  getTokenDominance,
  slug,
  toK,
  tokenIconUrl,
} from 'utils'
import Panel from 'components/Panel'
import { AutoColumn } from 'components/Column'
import { RowBetween } from 'components/Row'
import { TYPE } from 'Theme'
import { FullWrapper, PageWrapper } from 'components'
import Search from 'components/Search'
import { AllTvlOptions } from 'components/SettingsModal'
import { BreakpointPanels, BreakpointPanelsColumn } from 'components/ChainPage'
import Filters from 'components/Filters'
import Table, { Index } from 'components/Table'
import { CustomLink } from 'components/Link'
import TokenLogo from 'components/TokenLogo'
import ChainsRow from 'components/ChainsRow'

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false,
})

export async function getStaticProps({ params: { oracle } }) {
  const data = await getOraclePageData(oracle)

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const { oracles = {} } = await getOraclePageData()

  const oraclesList = Object.keys(oracles)

  const paths = oraclesList.map((oracle) => {
    return {
      params: { oracle },
    }
  })

  return { paths, fallback: 'blocking' }
}

const PageView = ({ chartData, tokenLinks, token, filteredProtocols }) => {
  const protocolsData = useCalcStakePool2Tvl(filteredProtocols)

  const finalChartData = useCalcExtraTvlsByDay(chartData)

  const { totalVolume, volumeChangeUSD } = useMemo(() => {
    const totalVolume = getPrevTvlFromChart(finalChartData, 0)
    const tvlPrevDay = getPrevTvlFromChart(finalChartData, 1)
    const volumeChangeUSD = getPercentChange(totalVolume, tvlPrevDay)
    return { totalVolume, volumeChangeUSD }
  }, [finalChartData])

  const topToken = {}

  if (protocolsData.length > 0) {
    topToken.name = protocolsData[0]?.name
    topToken.tvl = protocolsData[0]?.tvl
  }

  const tvs = formattedNum(totalVolume, true)

  const dominance = getTokenDominance(topToken, totalVolume)

  const percentChange = volumeChangeUSD?.toFixed(2)

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Value Secured (USD)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {tvs}
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Change (24h)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
              {percentChange || 0}%
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
          </RowBetween>
          <TYPE.main
            fontSize={'33px'}
            lineHeight={'39px'}
            fontWeight={600}
            color={'#46acb7'}
            style={{ marginTop: '4px', marginBottom: '-6px' }}
          >
            {dominance}%
          </TYPE.main>
        </AutoColumn>
      </Panel>
    </>
  )

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
      {
        Header: 'Mcap/TVL',
        accessor: 'mcap',
        Cell: ({ value, row }) => {
          const tvl = row.values?.tvl ?? null
          const ratio = value && tvl && formattedNum(value / tvl)
          return <>{ratio}</>
        },
      },
    ],
    []
  )

  return (
    <PageWrapper>
      <FullWrapper>
        <Search />
        <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} />
        <BreakpointPanels>
          <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px' }}>
            <Chart
              display="liquidity"
              dailyData={finalChartData}
              totalLiquidity={totalVolume}
              liquidityChange={volumeChangeUSD}
              title="TVS"
            />
          </Panel>
        </BreakpointPanels>

        <Filters filterOptions={tokenLinks} activeLabel={token} />
        <Table columns={columns} data={protocolsData} />
      </FullWrapper>
    </PageWrapper>
  )
}

export default function Oracles(props) {
  return (
    <GeneralLayout title={`Oracles - DefiLlama`} defaultSEO>
      <PageView {...props} />
    </GeneralLayout>
  )
}
