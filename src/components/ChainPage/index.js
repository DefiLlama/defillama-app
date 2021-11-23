import React, { useEffect, useState } from 'react'
import { useMedia } from 'react-use'
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

import { TYPE, ThemedBackground } from '../../Theme'

import { useStakingManager, usePool2Manager } from '../../contexts/LocalStorage'
import { formattedNum } from '../../utils'

import ProtocolChart from '../ProtocolChart'
import dynamic from 'next/dynamic'

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

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false
})

function GlobalPage({
  selectedChain = 'All',
  volumeChangeUSD,
  totalVolumeUSD,
  denomination,
  chainsSet,
  filteredTokens,
  chart: globalChart,
  totalStaking,
  totalPool2
}) {
  const setSelectedChain = newSelectedChain => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)

  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  if (stakingEnabled) {
    totalVolumeUSD += totalStaking
  }
  if (pool2Enabled) {
    totalVolumeUSD += totalPool2
  }

  let chainOptions = ['All'].concat(chainsSet).map(label => ({ label, to: setSelectedChain(label) }))

  const topToken = { name: 'Uniswap', tvl: 0 }
  if (filteredTokens.length > 0) {
    topToken.name = filteredTokens[0]?.name
    topToken.tvl = filteredTokens[0]?.tvl
    if (topToken.name === 'AnySwap') {
      topToken.name = filteredTokens[1]?.name
      topToken.tvl = filteredTokens[1]?.tvl
    }
  }

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Value Locked (USD)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {formattedNum(totalVolumeUSD, true)}
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
              {volumeChangeUSD?.toFixed(2)}%
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
          </RowBetween>
        </AutoColumn>
      </Panel>
    </>
  )

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <AutoColumn gap="24px">
          <Search />
          {selectedChain === 'Fantom' && (
            <Panel background={true} style={{ textAlign: 'center' }}>
              <TYPE.main fontWeight={400}>
                AnySwap TVL has been excluded from the total TVL calculation. Click{' '}
                <a
                  style={{ color: 'inherit', fontWeight: '700' }}
                  href="https://twitter.com/0xngmi/status/1446691628043878404"
                >
                  here
                </a>{' '}
                for our explanation and reasoning
              </TYPE.main>
            </Panel>
          )}
          <CheckMarks />
        </AutoColumn>
        <BreakpointPanels>
          <BreakpointPanelsColumn
            gap="10px"
          >
            {panels}
          </BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px' }}>
            <Chart display="liquidity" dailyData={globalChart} totalLiquidityUSD={totalVolumeUSD} liquidityChangeUSD={volumeChangeUSD} />
          </Panel>
        </BreakpointPanels>
        <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
          <RowBetween>
            <TYPE.main sx={{ minWidth: '90px' }} fontSize={'1.125rem'}>
              TVL Rankings
            </TYPE.main>
            <FiltersRow>
              <Filters
                filterOptions={chainOptions}
                setActive={setSelectedChain}
                activeLabel={selectedChain}
                justify="end"
              />
            </FiltersRow>
          </RowBetween>
        </ListOptions>
        <Panel style={{ marginTop: '6px', padding: '1.125rem 0 ' }}>
          <TokenList tokens={filteredTokens} filters={[selectedChain]} />
        </Panel>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default GlobalPage
