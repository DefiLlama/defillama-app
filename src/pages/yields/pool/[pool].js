import dynamic from 'next/dynamic'
import { getYieldPoolData, useYieldPoolData, useChartPoolData } from 'utils/dataApi'
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

// export async function getServerSideProps({ params: { pool } }) {
//   const data = await getYieldPoolData(pool)

//   return {
//     ...data,
//   }
// }

// const PageView = ({ pool, chart }) => {
const PageView = () => {
  const pId = '0xa87b2ff0759f5b82c7ec86444a70f25c6bffccbf'
  let { data: pool } = useYieldPoolData(pId)
  let { data: chart } = useChartPoolData(pId)
  console.log(chart?.data)

  // note(!) added hardcoded values for testing only
  pool = {
    chain: 'Ethereum',
    project: 'uniswap',
    symbol: 'USDC-UST',
    tvlUsd: 4346509.432932252,
    apy: 49.213953385811486,
    pool: '0xa87b2ff0759f5b82c7ec86444a70f25c6bffccbf',
    apyPct1D: 21.258783062384992,
    apyPct7D: 48.87921743678131,
    apyPct30D: null,
    projectName: 'Uniswap',
    stablecoin: true,
    ilRisk: 'no',
    exposure: 'multi',
    predictions: {
      predictedClass: 0,
      predictedProbability: 80,
      confidence: 'Medium',
    },
  }

  chart = [
    {
      apy: null,
      tvlUsd: 841048.2390598194,
      timestamp: '2022-04-05T23:00:00.000Z',
    },
    {
      apy: 38.54608116293922,
      tvlUsd: 839906.7538840331,
      timestamp: '2022-04-06T23:00:00.000Z',
    },
    {
      apy: 24.26254210585704,
      tvlUsd: 840560.0022121046,
      timestamp: '2022-04-07T23:00:00.000Z',
    },
    {
      apy: 17.604012952073123,
      tvlUsd: 844444.4989839753,
      timestamp: '2022-04-08T23:00:00.000Z',
    },
    {
      apy: 40.13466593270626,
      tvlUsd: 843124.7495677157,
      timestamp: '2022-04-09T23:00:00.000Z',
    },
    {
      apy: 16.37284071492418,
      tvlUsd: 846083.3301904137,
      timestamp: '2022-04-10T23:00:00.000Z',
    },
    {
      apy: 57.022148740644354,
      tvlUsd: 1194208.164845794,
      timestamp: '2022-04-11T23:00:00.000Z',
    },
    {
      apy: 13.748388252101224,
      tvlUsd: 2202031.96942126,
      timestamp: '2022-04-12T23:00:00.000Z',
    },
    {
      apy: 11.408997266424077,
      tvlUsd: 1029821.359649171,
      timestamp: '2022-04-13T23:00:00.000Z',
    },
    {
      apy: 5.462640960633327,
      tvlUsd: 1029785.1009110634,
      timestamp: '2022-04-14T23:00:00.000Z',
    },
    {
      apy: 11.090272211728701,
      tvlUsd: 1029647.2942570691,
      timestamp: '2022-04-15T23:00:00.000Z',
    },
    {
      apy: 1.4325280088921442,
      tvlUsd: 1028850.9561656733,
      timestamp: '2022-04-16T23:00:00.000Z',
    },
    {
      apy: 8.768423951212473,
      tvlUsd: 2104671.4335386716,
      timestamp: '2022-04-17T23:00:00.000Z',
    },
    {
      apy: 66.40686331594402,
      tvlUsd: 2110837.4804368312,
      timestamp: '2022-04-18T23:00:00.000Z',
    },
    {
      apy: 57.364025252445096,
      tvlUsd: 2116774.992489887,
      timestamp: '2022-04-19T23:00:00.000Z',
    },
    {
      apy: 34.259734990435376,
      tvlUsd: 2295244.7360216375,
      timestamp: '2022-04-20T23:00:00.000Z',
    },
    {
      apy: 25.265676503881306,
      tvlUsd: 2298752.701672188,
      timestamp: '2022-04-21T23:00:00.000Z',
    },
    {
      apy: 27.818268380129712,
      tvlUsd: 1941890.292030738,
      timestamp: '2022-04-22T23:00:00.000Z',
    },
    {
      apy: 37.245492395652555,
      tvlUsd: 1938824.4683233423,
      timestamp: '2022-04-23T23:00:00.000Z',
    },
    {
      apy: 69.77896067196399,
      tvlUsd: 1998246.3798356808,
      timestamp: '2022-04-24T23:00:00.000Z',
    },
    {
      apy: 37.13022656829588,
      tvlUsd: 3058560.5387921445,
      timestamp: '2022-04-25T23:00:00.000Z',
    },
    {
      apy: 40.719803591078815,
      tvlUsd: 3118939.3092448907,
      timestamp: '2022-04-26T23:00:00.000Z',
    },
    {
      apy: 44.540282179410504,
      tvlUsd: 4772518.022919679,
      timestamp: '2022-04-27T23:00:00.000Z',
    },
    {
      apy: 23.97673245025244,
      tvlUsd: 4784570.138005682,
      timestamp: '2022-04-28T09:00:00.000Z',
    },
  ].filter((el) => el.apy !== null)

  const finalChartData = chart.map((el) => [
    String(Math.floor(new Date(el.timestamp).getTime() / 1000)),
    el.tvlUsd,
    // i format here for the plot in `TradingViewChart`
    el.apy.toFixed(2),
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
            {apy > 0
              ? `The algorithm predicts the current APY of ${apy}% to ${predictedDirection} fall below ${apyDelta20pct}% within the next 4 weeks. Probability: ${probability}%.`
              : 'No outlook available'}
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
