import dynamic from 'next/dynamic'
import { getYieldPoolData } from 'utils/dataApi'
import { GeneralLayout } from 'layout'
import { PageWrapper, FullWrapper } from 'components'
import { AutoColumn } from 'components/Column'
import { BreakpointPanels, BreakpointPanelsColumn } from 'components/ChainPage'
import Panel from 'components/Panel'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import { TYPE } from 'Theme'
import { toK } from 'utils'
import Search from 'components/Search'
import { BasicLink } from 'components/Link'
import styled from 'styled-components'
import { useMedia } from 'react-use'

const HiddenSearch = styled.span`
  @media screen and (max-width: ${({ theme }) => theme.bpSm}) {
    display: none;
  }
`

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false,
})

export async function getServerSideProps({ params: { pool } }) {
  const data = await getYieldPoolData(pool)

  return {
    ...data,
  }
}

const PageView = ({ pool, chart }) => {
  const finalChartData = chart.map((el) => [
    String(Math.floor(new Date(el.timestamp).getTime() / 1000)),
    el.tvlUsd,
    el.apy,
  ])

  const apy = pool.apy.toFixed(2)
  const apyDelta20pct = (apy * 0.8).toFixed(2)
  const tvlUsd = toK(pool.tvlUsd)
  const probability = pool.predictions.predictedProbability.toFixed(2)
  const predictedDirection = pool.predictions.predictedClass === 0 ? '' : 'not'

  const below1024 = useMedia('(max-width: 1024px)')

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>APY</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
              {apy}%
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Value Locked</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              ${tvlUsd}
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Outlook</TYPE.heading>
          </RowBetween>
          <TYPE.main
            fontSize={'15px'}
            lineHeight={'20px'}
            fontWeight={600}
            color={'#46acb7'}
            style={{ marginTop: '4px', marginBottom: '-6px' }}
          >
            The algorithm predicts the current APY of {apy}% to {predictedDirection} fall below {apyDelta20pct}% within
            the next 4 weeks. Probability: {probability}%.
          </TYPE.main>
        </AutoColumn>
      </Panel>
    </>
  )

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween flexWrap="wrap">
          <AutoRow align="flex-end" style={{ width: 'fit-content' }}>
            <TYPE.body>
              <BasicLink href="/yields">{'Pool '}</BasicLink>→ {pool.symbol}
            </TYPE.body>
          </AutoRow>
          <HiddenSearch>
            <Search small={true} />
          </HiddenSearch>
        </RowBetween>
        <RowBetween style={{ flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'flex-start' }}>
          <RowFixed style={{ flexWrap: 'wrap' }}>
            <RowFixed style={{ justifyContent: 'center' }}>
              <TYPE.body fontSize={below1024 ? '1.5rem' : '2rem'} fontWeight={500} style={{ margin: '0 1rem' }}>
                <RowFixed gap="6px">{pool.symbol}</RowFixed>
              </TYPE.body>
              <TYPE.main fontSize={'1rem'}>
                ({pool.projectName} - {pool.chain})
              </TYPE.main>
            </RowFixed>
          </RowFixed>
        </RowBetween>
        <BreakpointPanels>
          <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px' }}>
            <Chart
              display="liquidity"
              dailyData={finalChartData}
              totalLiquidity={pool.tvlUsd}
              liquidityChange={pool.apy}
              title="APY & TVL"
              dualAxis={true}
            />
          </Panel>
        </BreakpointPanels>
      </FullWrapper>
    </PageWrapper>
  )
}

export default function YieldPoolPage(props) {
  return (
    <GeneralLayout title={`Yield Chart - DefiLlama`} defaultSEO>
      <PageView {...props} />
    </GeneralLayout>
  )
}
