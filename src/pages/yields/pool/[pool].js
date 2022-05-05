import dynamic from 'next/dynamic'
import { useYieldPoolData, useYieldChartData } from 'utils/dataApi'
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
import { useRouter } from 'next/router'
import FormattedName from 'components/FormattedName'
import HeadHelp from 'components/HeadHelp'
import AuditInfo from 'components/AuditInfo'
import { ButtonLight } from 'components/ButtonStyled'

const HiddenSearch = styled.span`
  @media screen and (max-width: ${({ theme }) => theme.bpSm}) {
    display: none;
  }
`

const TokenDetailsLayout = styled.div`
  display: inline-grid;
  width: 100%;
  grid-template-columns: auto auto auto 1fr;
  column-gap: 30px;
  align-items: start;

  &:last-child {
    align-items: center;
    justify-items: end;
  }
  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    > * {
      grid-column: 1 / 4;
      margin-bottom: 1rem;
      display: table-row;
      > * {
        margin-bottom: 1rem;
      }
    }

    &:last-child {
      align-items: start;
      justify-items: start;
    }
  }
`

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false,
})

const PageView = () => {
  const { query } = useRouter()

  let { data: pool } = useYieldPoolData(query.pool)
  let { data: chart } = useYieldChartData(query.pool)

  const finalChartData = chart?.data.map((el) => [
    String(Math.floor(new Date(el.timestamp).getTime() / 1000)),
    el.tvlUsd,
    // i format here for the plot in `TradingViewChart`
    el.apy?.toFixed(2) ?? 0,
  ])

  const poolData = pool?.data ? pool.data[0] : {}

  const apy = poolData.apy?.toFixed(2) ?? 0

  const apyDelta20pct = (apy * 0.8).toFixed(2)

  const tvlUsd = toK(poolData.tvlUsd ?? 0)

  const probability = poolData.predictions?.predictedProbability ?? null
  const predictedDirection = poolData.predictions?.predictedClass === 'Down' ? '' : 'not'

  const audits = poolData.audits ?? ''
  const audit_links = poolData.audit_links ?? []
  const url = poolData.url ?? ''
  const twitter = poolData.twitter ?? ''
  const category = poolData.category ?? ''

  const backgroundColor = '#696969'
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
            {probability !== null
              ? `The algorithm predicts the current APY of ${apy}% to ${predictedDirection} fall below ${apyDelta20pct}% within the next 4 weeks. Probability: ${probability.toFixed(
                  2
                )}%.`
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
              <BasicLink href="/yields">{'Pool '}</BasicLink>→ {poolData.symbol}
            </TYPE.body>
          </AutoRow>
          <HiddenSearch>
            <Search small={true} />
          </HiddenSearch>
        </RowBetween>
        <RowBetween style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <RowFixed style={{ flexWrap: 'wrap' }}>
            <RowFixed style={{ justifyContent: 'center', minHeight: '39px'}}>
              <TYPE.body fontSize={below1024 ? '1.5rem' : '2rem'} fontWeight={500} style={{ margin: '0 1rem' }}>
                <RowFixed gap="6px">
                  {' '}
                  {poolData.projectName === 'Osmosis'
                    ? `${poolData.symbol} ${poolData.pool.split('-').slice(-1)}-lock`
                    : poolData.symbol ?? 'Loading'}
                </RowFixed>
              </TYPE.body>
              <TYPE.main fontSize={'1rem'}>
                ({poolData.projectName} - {poolData.chain})
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
              totalLiquidity={poolData.tvlUsd}
              liquidityChange={poolData.apy}
              title="APY & TVL"
              dualAxis={true}
            />
          </Panel>
        </BreakpointPanels>

        <RowBetween style={{ marginTop: '1rem' }}>
          <TYPE.main fontSize={'1.125rem'}>Protocol Information</TYPE.main>{' '}
        </RowBetween>
        <Panel rounded p={20}>
          <TokenDetailsLayout>
            {typeof category === 'string' && (
              <AutoColumn>
                <TYPE.main>Category</TYPE.main>
                <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                  <BasicLink href={`/protocols/${category.toLowerCase()}`}>
                    <FormattedName text={category} maxCharacters={16} />
                  </BasicLink>
                </TYPE.main>
              </AutoColumn>
            )}
            <AutoColumn>
              <TYPE.main>
                <HeadHelp title="Audits" text="Audits are not a guarantee of security." />
              </TYPE.main>
              <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                <AuditInfo audits={audits} auditLinks={audit_links} />
              </TYPE.main>
            </AutoColumn>
            <div></div>
            <RowFixed>
              <BasicLink color={backgroundColor} external href={`https://twitter.com/${twitter}`}>
                <ButtonLight useTextColor={true} color={backgroundColor} style={{ marginRight: '1rem' }}>
                  Twitter ↗
                </ButtonLight>
              </BasicLink>
              <BasicLink color={backgroundColor} external href={url}>
                <ButtonLight useTextColor={true} color={backgroundColor} style={{ marginRight: '1rem' }}>
                  Website ↗
                </ButtonLight>
              </BasicLink>
            </RowFixed>{' '}
          </TokenDetailsLayout>
        </Panel>
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
