import React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'

import { AutoRow, RowBetween, RowFlat } from '../Row'
import { AutoColumn } from '../Column'
import TokenList from '../TokenList'
import Search from '../Search'
import Panel from '../Panel'
import { PageWrapper, ContentWrapper } from '..'
import Filters from '../Filters'
import { CheckMarks } from '../SettingsModal'

import { getExtraTvlEnabled } from 'contexts/LocalStorage'
import { TYPE, ThemedBackground } from 'Theme'
import { formattedNum } from 'utils'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { DownloadCloud } from 'react-feather'
import { BasicLink } from '../Link'
import SEO from '../SEO'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

const BreakpointPanels = styled.div`
  @media screen and (min-width: 800px) {
    width: 100%;
    display: flex;
    padding: 0;
    align-items: center;
  }
`

const FiltersRow = styled(RowFlat)`
  @media screen and (min-width: 800px) {
    width: calc(100% - 90px);
  }
`

const BreakpointPanelsColumn = styled(AutoColumn)`
  height: 100%;
  width: 100%;
  margin-right: 10px;
  max-width: 350px;
  @media (max-width: 800px) {
    max-width: initial;
    margin-bottom: 10px;
  }
`

const DownloadIcon = styled(DownloadCloud)`
  color: ${({ theme }) => theme.white};
`

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false
})

function GlobalPage({
  selectedChain = 'All',
  volumeChangeUSD,
  totalVolumeUSD,
  chainsSet,
  filteredProtocols,
  chart: globalChart,
  totalExtraTvls
}) {
  const setSelectedChain = newSelectedChain => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)

  const extraTvlsEnabled = getExtraTvlEnabled()

  Object.entries(totalExtraTvls).forEach(([name, extraTvl]) => {
    if (extraTvlsEnabled[name]) {
      totalVolumeUSD += extraTvl
    }
  })

  let chainOptions = ['All'].concat(chainsSet).map(label => ({ label, to: setSelectedChain(label) }))

  const protocolTotals = useCalcStakePool2Tvl(filteredProtocols)

  const topToken = { name: 'Uniswap', tvl: 0 }
  if (protocolTotals.length > 0) {
    topToken.name = protocolTotals[0]?.name
    topToken.tvl = protocolTotals[0]?.tvl
    if (topToken.name === 'AnySwap') {
      topToken.name = protocolTotals[1]?.name
      topToken.tvl = protocolTotals[1]?.tvl
    }
  }

  const tvl = formattedNum(totalVolumeUSD, true)
  const percentChange = volumeChangeUSD?.toFixed(2)
  const volumeChange = (percentChange > 0 ? '+' : '') + percentChange + '%'

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Value Locked (USD)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {tvl}
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Change (24h)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
              {percentChange}%
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
              {((topToken.tvl / totalVolumeUSD) * 100.0).toFixed(2)}%
            </TYPE.main>
            <BasicLink
              href={`https://api.llama.fi/simpleChainDataset/${selectedChain}?${Object.entries(extraTvlsEnabled)
                .filter(t => t[1] === true)
                .map(t => `${t[0]}=true`)
                .join('&')}`}
            >
              <DownloadIcon />
            </BasicLink>
          </RowBetween>
        </AutoColumn>
      </Panel>
    </>
  )

  return (
    <PageWrapper>
      <SEO cardName={selectedChain} chain={selectedChain} tvl={tvl} volumeChange={volumeChange} />
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <AutoColumn gap="24px">
          <Search />
          <Panel background={true} style={{ textAlign: 'center' }}>
            <TYPE.main fontWeight={400}>
              We just launched a cross-chain{' '}
              <a style={{ color: 'inherit', fontWeight: '700' }} href="https://defillama.com/nfts">
                NFT dashboard
              </a>
              . Check it out{' '}
              <a style={{ color: 'inherit', fontWeight: '700' }} href="https://defillama.com/nfts">
                here
              </a>
              !
            </TYPE.main>
          </Panel>
          <CheckMarks />
        </AutoColumn>
        <BreakpointPanels>
          <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px' }}>
            <Chart
              display="liquidity"
              dailyData={globalChart}
              totalLiquidityUSD={totalVolumeUSD}
              liquidityChangeUSD={volumeChangeUSD}
            />
          </Panel>
        </BreakpointPanels>
        <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
          <RowBetween>
            <TYPE.main sx={{ minWidth: '90px' }} fontSize={'1.125rem'}>
              TVL Rankings
            </TYPE.main>
            <FiltersRow>
              <Filters filterOptions={chainOptions} activeLabel={selectedChain} justify="end" />
            </FiltersRow>
          </RowBetween>
        </ListOptions>
        <Panel style={{ marginTop: '6px', padding: '1.125rem 0 ' }}>
          <TokenList tokens={protocolTotals} filters={[selectedChain]} />
        </Panel>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default GlobalPage
