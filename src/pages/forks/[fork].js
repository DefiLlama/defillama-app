import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getForkPageData, revalidate } from 'utils/dataApi'
import Layout from 'layout'
import { useCalcExtraTvlsByDay, useCalcStakePool2Tvl } from 'hooks/data'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from 'utils'
import { AutoColumn } from 'components/Column'
import { RowBetween } from 'components/Row'
import { TYPE } from 'Theme'
import { BreakpointPanels, BreakpointPanelsColumn, Panel, ProtocolsTable } from 'components'
import Search from 'components/Search'
import { AllTvlOptions } from 'components/SettingsModal'
import { columnsToShow } from 'components/Table'
import Filters, { FiltersWrapper } from 'components/Filters'

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

  const paths = forksList.slice(0, 10).map((fork) => {
    return {
      params: { fork },
    }
  })

  return { paths, fallback: 'blocking' }
}

const columns = columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

const PageView = ({ chartData, tokenLinks, token, filteredProtocols, parentTokens }) => {
  const protocolsData = useCalcStakePool2Tvl(filteredProtocols)
  const parentForks = useCalcStakePool2Tvl(parentTokens)

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

  return (
    <>
      <Search />
      <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} />
      <BreakpointPanels>
        <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
        <Panel style={{ height: '100%', minHeight: '347px', flex: 1, maxWidth: '100%' }}>
          <Chart
            display="liquidity"
            dailyData={finalChartData}
            totalLiquidity={totalVolume}
            liquidityChange={volumeChangeUSD}
            title="TVL"
          />
        </Panel>
      </BreakpointPanels>

      <FiltersWrapper>
        <Filters filterOptions={tokenLinks} activeLabel={token} />
      </FiltersWrapper>

      <ProtocolsTable columns={columns} data={protocolsData} pinnedRow={parentForks[0]} />
    </>
  )
}

export default function Forks(props) {
  return (
    <Layout title={`Forks - DefiLlama`} defaultSEO>
      <PageView {...props} />
    </Layout>
  )
}
