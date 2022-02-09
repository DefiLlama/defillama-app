import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { GeneralLayout } from 'layout'
import { getOraclePageData, getProtocolsRaw, revalidate } from 'utils/dataApi'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from 'utils'
import Filters from 'components/Filters'
import Search from 'components/Search'
import { FullWrapper, PageWrapper } from 'components'
import Panel from 'components/Panel'
import TokenList from 'components/TokenList'
import { BreakpointPanels, BreakpointPanelsColumn } from 'components/ChainPage'
import { AutoColumn } from 'components/Column'
import { RowBetween } from 'components/Row'
import { TYPE } from 'Theme'

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
  const { oracles = [] } = await getProtocolsRaw()

  const paths = oracles.map((oracle) => {
    return {
      params: { oracle },
    }
  })

  return { paths, fallback: 'blocking' }
}

export default function Oracles({ chartData, oracleLinks, oracle, filteredProtocols }) {
  const { finalChartData, totalVolume, volumeChangeUSD } = useMemo(() => {
    const finalChartData = chartData
    const totalVolume = getPrevTvlFromChart(chartData, 0)
    const tvlPrevDay = getPrevTvlFromChart(chartData, 1)
    const volumeChangeUSD = getPercentChange(totalVolume, tvlPrevDay)
    return { finalChartData, totalVolume, volumeChangeUSD }
  }, [chartData])

  const topToken = {}
  if (filteredProtocols.length > 0) {
    topToken.name = filteredProtocols[0]?.name
    topToken.tvl = filteredProtocols[0]?.tvl
  }

  const tvl = formattedNum(totalVolume, true)

  const dominance = getTokenDominance(topToken, totalVolume)

  const percentChange = volumeChangeUSD?.toFixed(2)

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Volume Secured (USD)</TYPE.heading>
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
    <GeneralLayout title={`Oracles - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <Search />
          {/* <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} /> */}
          <BreakpointPanels>
            <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
            <Panel style={{ height: '100%', minHeight: '347px' }}>
              <Chart
                display="liquidity"
                dailyData={finalChartData}
                totalLiquidity={totalVolume}
                liquidityChange={volumeChangeUSD}
                title={'Total Volume Secured'}
              />
            </Panel>
          </BreakpointPanels>

          <Filters filterOptions={oracleLinks} activeLabel={oracle} />
          <Panel>
            <TokenList tokens={filteredProtocols} />
          </Panel>
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
