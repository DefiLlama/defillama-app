import React, { useEffect } from 'react'
import { useMedia } from 'react-use'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import styled from 'styled-components'

import { useDisplayUsdManager, useHideLastDayManager } from '../../contexts/LocalStorage'
import { AutoRow, RowBetween, RowFlat } from '../Row'
import { AutoColumn } from '../Column'
import Filters from '../Filters'
import { CheckMarks } from '../SettingsModal'
import { PageWrapper, ContentWrapper } from '..'
import Panel from '../Panel'
import Search from '../Search'
import NFTCollectionList from '../NFTCollectionList'
import { TYPE, ThemedBackground } from '../../Theme'
import { formattedNum } from '../../utils'
import { chainCoingeckoIds, chainMarketplaceMappings } from '../../constants/chainTokens'

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

const FiltersRow = styled(RowFlat)`
  @media screen and (min-width: 800px) {
    width: calc(100% - 90px);
  }
`
const defaultTab = {
  label: 'All',
  to: '/nfts'
}

const GlobalNFTChart = dynamic(() => import('../GlobalNFTChart'), {
  ssr: false
})

const NFTDashboard = ({ statistics, collections, chart, chainData, marketplaceData, displayName = 'All' }) => {
  useEffect(() => window.scrollTo(0, 0))

  const { totalVolume, totalVolumeUSD, dailyVolume, dailyVolumeUSD, dailyChange } = statistics
  const [hideLastDay] = useHideLastDayManager()
  const below800 = useMedia('(max-width: 800px)')

  const isChain = chainData ? true : false
  const selectedTab = displayName
  const setSelectedTab = newSelectedTab =>
    isChain ? `/nfts/chain/${newSelectedTab}` : `/nfts/marketplace/${newSelectedTab}`

  let tabOptions = [
    defaultTab,
    ...(chainData || marketplaceData)
      ?.sort((a, b) => parseInt(b.totalVolumeUSD) - parseInt(a.totalVolumeUSD))
      ?.map(option => ({
        label: option.displayName,
        to: isChain ? setSelectedTab(option.chain) : setSelectedTab(option.marketplace)
      }))
  ]

  let shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit
  let [displayUsd] = useDisplayUsdManager()

  const isHomePage = selectedTab === 'All'
  if (isHomePage || displayUsd) {
    ;[shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
      totalVolumeUSD,
      dailyVolumeUSD,
      dailyChange,
      'USD',
      '$'
    ]
    displayUsd = true
  } else {
    ;[shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
      totalVolume,
      dailyVolume,
      dailyChange,
      isChain
        ? chainCoingeckoIds[selectedTab]?.symbol
        : chainCoingeckoIds[chainMarketplaceMappings[selectedTab]]?.symbol,
      ''
    ]
  }

  if (hideLastDay) {
    if (chart.length >= 3 && displayUsd) {
      ;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
        totalVolumeUSD - chart[chart.length - 1].volumeUSD,
        chart[chart.length - 2].volumeUSD,
        ((chart[chart.length - 2].volumeUSD - chart[chart.length - 3].volumeUSD) / chart[chart.length - 3].volumeUSD) *
          100
      ]
      chart = chart.slice(0, -1)
    } else if (chart.length >= 3) {
      ;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
        totalVolume - chart[chart.length - 1].volume,
        chart[chart.length - 2].volume,
        ((chart[chart.length - 2].volume - chart[chart.length - 3].volume) / chart[chart.length - 3].volume) * 100
      ]
      chart = chart.slice(0, -1)
    }
  }

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Volume</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {formattedNum(shownTotalVolume, displayUsd)}
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Daily Volume</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
              {formattedNum(shownDailyVolume, displayUsd)}
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
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
              {shownDailyChange?.toFixed(2)}%
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
        <AutoColumn gap="24px" style={{ paddingBottom: '24px' }}>
          <Search />
          <CheckMarks type="nfts" />
        </AutoColumn>
        <BreakpointPanels>
          <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px' }}>
            <GlobalNFTChart
              chartData={chart}
              dailyVolume={shownDailyVolume}
              dailyVolumeChange={shownDailyChange}
              symbol={symbol}
              unit={unit}
              displayUsd={displayUsd}
            />
          </Panel>
        </BreakpointPanels>
        <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
          <RowBetween>
            <TYPE.main fontSize={'1.125rem'}>NFT Rankings</TYPE.main>
            <FiltersRow>
              <Filters filterOptions={tabOptions} setActive={setSelectedTab} activeLabel={selectedTab} justify="end" />
            </FiltersRow>
          </RowBetween>
        </ListOptions>
        <Panel style={{ marginTop: '6px', padding: below800 && '1rem 0 0 0 ' }}>
          <NFTCollectionList collections={collections} displayUsd={displayUsd} />
        </Panel>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default NFTDashboard
