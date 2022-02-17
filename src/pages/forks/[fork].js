import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getForkPageData, revalidate } from 'utils/dataApi'
import { GeneralLayout } from 'layout'
import { useCalcExtraTvlsByDay, useCalcStakePool2Tvl } from 'hooks/data'
import { formattedNum, formattedPercent, getPercentChange, getPrevTvlFromChart, getTokenDominance, toK } from 'utils'
import Panel from 'components/Panel'
import { AutoColumn } from 'components/Column'
import { RowBetween } from 'components/Row'
import { TYPE } from 'Theme'
import { FullWrapper, PageWrapper } from 'components'
import Search from 'components/Search'
import { AllTvlOptions } from 'components/SettingsModal'
import { BreakpointPanels, BreakpointPanelsColumn } from 'components/ChainPage'
import Filters from 'components/Filters'
import Table from 'components/Table'
import ChainsRow from 'components/ChainsRow'
import { ProtocolName } from 'components/Table'

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false,
})

export async function getStaticProps({ params: { fork } }) {
  const data = await getForkPageData(fork)

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const { forks = {} } = await getForkPageData()

  const forksList = Object.keys(forks)

  const paths = forksList.map((fork) => {
    return {
      params: { fork },
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

  const tvl = formattedNum(totalVolume, true)

  const dominance = getTokenDominance(topToken, totalVolume)

  const percentChange = volumeChangeUSD?.toFixed(2)

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Value Locked</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {tvl}
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
        header: 'Name',
        accessor: 'name',
        disableSortBy: true,
        Cell: ({ value, rowValues, rowIndex }) => (
          <ProtocolName value={value} symbol={rowValues.symbol} index={rowIndex + 1} />
        ),
      },
      {
        header: 'Chains',
        accessor: 'chains',
        disableSortBy: true,
        Cell: ({ value }) => <ChainsRow chains={value} />,
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
        Cell: ({ value }) => <span>{'$' + toK(value)}</span>,
      },
      {
        header: 'Mcap/TVL',
        accessor: 'mcaptvl',
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
              title="TVL"
            />
          </Panel>
        </BreakpointPanels>

        <Filters filterOptions={tokenLinks} activeLabel={token} />
        <Table columns={columns} data={protocolsData} />
      </FullWrapper>
    </PageWrapper>
  )
}

export default function Forks(props) {
  return (
    <GeneralLayout title={`Forks - DefiLlama`} defaultSEO>
      <PageView {...props} />
    </GeneralLayout>
  )
}
