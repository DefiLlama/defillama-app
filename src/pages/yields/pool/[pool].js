import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { TYPE } from 'Theme'
import Layout from 'layout'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, Panel } from 'components'
import { AutoColumn } from 'components/Column'
import { RowFixed } from 'components/Row'
import { BasicLink } from 'components/Link'
import FormattedName from 'components/FormattedName'
import AuditInfo from 'components/AuditInfo'
import { ButtonLight } from 'components/ButtonStyled'
import { YieldsSearch } from 'components/Search'
import { toK } from 'utils'
import { useYieldPoolData, useYieldChartData } from 'utils/dataApi'
import { DownloadCloud } from 'react-feather'
import { CSVLink } from 'react-csv'

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

const DownloadButton = styled(CSVLink)`
  padding: 4px 6px;
  border-radius: 6px;
  background: ${({ theme }) => theme.bg3};
  position: absolute;
  bottom: 8px;
  right: 8px;

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

const DownloadIcon = styled(DownloadCloud)`
  color: ${({ theme }) => theme.text1};
  position: relative;
  top: 2px;
  width: 20px;
  height: 20px;
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

  // prepare csv data
  const csvColumns = chart?.data ? Object.keys(chart['data'][0]) : []
  const csvData = chart?.data ? chart['data'] : []
  const headers = csvColumns.map((c) => ({ label: c, key: c }))
  const csvReport = {
    data: csvData,
    headers: headers,
    filename: `${query.pool}.csv`,
  }

  const poolData = pool?.data ? pool.data[0] : {}

  const apy = poolData.apy?.toFixed(2) ?? 0

  const apyDelta20pct = (apy * 0.8).toFixed(2)

  const tvlUsd = toK(poolData.tvlUsd ?? 0)

  let confidence = poolData.predictions?.binnedConfidence ?? null
  if (confidence) {
    confidence = confidence === 1 ? 'Low' : confidence === 2 ? 'Medium' : 'High'
  }
  const predictedDirection = poolData.predictions?.predictedClass === 'Down' ? '' : 'not'

  const audits = poolData.audits ?? ''
  const audit_links = poolData.audit_links ?? []
  const url = poolData.url ?? ''
  const twitter = poolData.twitter ?? ''
  const category = poolData.category ?? ''

  const backgroundColor = '#696969'

  return (
    <>
      <YieldsSearch step={{ category: 'Yields', name: poolData.symbol }} />

      <h1 style={{ margin: '0 0 -12px', fontWeight: 500, fontSize: '1.5rem' }}>
        <span>
          {poolData.projectName === 'Osmosis'
            ? `${poolData.symbol} ${poolData.pool.split('-').slice(-1)}-lock`
            : poolData.symbol ?? 'Loading'}
        </span>{' '}
        <span style={{ fontSize: '1rem' }}>
          ({poolData.projectName} - {poolData.chain})
        </span>
      </h1>

      <ChartAndValuesWrapper>
        <BreakpointPanels>
          <BreakpointPanel>
            <h2>APY</h2>
            <p style={{ '--tile-text-color': '#fd3c99' }}>{apy}%</p>
            <DownloadButton {...csvReport}>
              <DownloadIcon />
              <span>&nbsp;&nbsp;.csv</span>
            </DownloadButton>
          </BreakpointPanel>
          <BreakpointPanel>
            <h2>Total Value Locked</h2>
            <p style={{ '--tile-text-color': '#4f8fea' }}>${tvlUsd}</p>
          </BreakpointPanel>
          <BreakpointPanel>
            <h2>Outlook</h2>
            <p style={{ '--tile-text-color': '#46acb7', fontSize: '1rem', fontWeight: 400 }}>
              {confidence !== null
                ? `The algorithm predicts the current APY of ${apy}% to ${predictedDirection} fall below ${apyDelta20pct}% within the next 4 weeks. Confidence: ${confidence}`
                : 'No outlook available'}
            </p>
          </BreakpointPanel>
        </BreakpointPanels>
        <BreakpointPanel id="chartWrapper">
          <Chart
            display="liquidity"
            dailyData={finalChartData}
            totalLiquidity={poolData.tvlUsd}
            liquidityChange={poolData.apy}
            title="APY & TVL"
            dualAxis={true}
          />
        </BreakpointPanel>
      </ChartAndValuesWrapper>

      <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '0 0 -12px' }}>Protocol Information</p>

      <Panel>
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

          <AuditInfo audits={audits} auditLinks={audit_links} />

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
          </RowFixed>
        </TokenDetailsLayout>
      </Panel>
    </>
  )
}

export default function YieldPoolPage(props) {
  return (
    <Layout title={`Yield Chart - DefiLlama`} defaultSEO>
      <PageView {...props} />
    </Layout>
  )
}
