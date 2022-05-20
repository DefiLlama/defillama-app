import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getOraclePageData, revalidate } from 'utils/dataApi'
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

  const paths = oraclesList.slice(0, 10).map((oracle) => {
    return {
      params: { oracle },
    }
  })

  return { paths, fallback: 'blocking' }
}

const columns = columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

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
            title="TVS"
          />
        </Panel>
      </BreakpointPanels>

      <FiltersWrapper>
        <Filters filterOptions={tokenLinks} activeLabel={token} />
      </FiltersWrapper>

      <ProtocolsTable columns={columns} data={protocolsData} />
    </>
  )
}

export default function Oracles(props) {
  return (
    <Layout title={`Oracles - DefiLlama`} defaultSEO>
      <PageView {...props} />
    </Layout>
  )
}
