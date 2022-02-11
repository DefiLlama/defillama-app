import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
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
import { AllTvlOptions } from 'components/SettingsModal'
import { useCalcExtraTvlsByDay, useCalcStakePool2Tvl } from 'hooks/data'

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false,
})

export default function ParentTokenView({ chartData, tokenLinks, token, filteredProtocols, header }) {
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
            <TYPE.heading>{header}</TYPE.heading>
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
              title={'Total Volume Secured'}
            />
          </Panel>
        </BreakpointPanels>

        <Filters filterOptions={tokenLinks} activeLabel={token} />
        <Panel>
          <TokenList tokens={protocolsData} />
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}
