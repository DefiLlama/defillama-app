import React, { useEffect } from 'react'
import { useMedia } from 'react-use'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import { useDisplayUsdManager, useHideLastDayManager } from '../../contexts/LocalStorage'
import { RowBetween } from '../Row'
import { AutoColumn } from '../Column'
import Filters from '../Filters'
import { CheckMarks } from '../SettingsModal'
import Search from '../Search'
import NFTCollectionList from '../NFTCollectionList'
import { TYPE } from '../../Theme'
import { formattedNum } from '../../utils'
import { chainCoingeckoIds, chainMarketplaceMappings } from '../../constants/chainTokens'
import SEO from 'components/SEO'
import { BreakpointPanels, BreakpointPanelsColumn, Panel } from 'components'
import { ListHeader, ListOptions } from 'components/ChainPage'
import Layout from 'layout'


const defaultTab = {
  label: 'All',
  to: '/nfts',
}

const GlobalNFTChart = dynamic(() => import('../GlobalNFTChart'), {
  ssr: false,
})

const NFTDashboard = ({ title, statistics, collections, chart, chainData, marketplaceData, displayName = 'All' }) => {
  useEffect(() => window.scrollTo(0, 0))

  const { totalVolume, totalVolumeUSD, dailyVolume, dailyVolumeUSD, dailyChange } = statistics
  const [hideLastDay] = useHideLastDayManager()
  const below800 = useMedia('(max-width: 800px)')

  const isChain = chainData ? true : false
  const selectedTab = displayName
  const setSelectedTab = (newSelectedTab) =>
    isChain ? `/nfts/chain/${newSelectedTab}` : `/nfts/marketplace/${newSelectedTab}`

  let tabOptions = [
    defaultTab,
    ...(chainData || marketplaceData)
      ?.sort((a, b) => parseInt(b.totalVolumeUSD) - parseInt(a.totalVolumeUSD))
      ?.map((option) => ({
        label: option.displayName,
        to: isChain ? setSelectedTab(option.chain) : setSelectedTab(option.marketplace),
      })),
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
      '$',
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
      '',
    ]
  }

  if (hideLastDay) {
    if (chart.length >= 3 && displayUsd) {
      ;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
        totalVolumeUSD - chart[chart.length - 1].volumeUSD,
        chart[chart.length - 2].volumeUSD,
        ((chart[chart.length - 2].volumeUSD - chart[chart.length - 3].volumeUSD) / chart[chart.length - 3].volumeUSD) *
        100,
      ]
      chart = chart.slice(0, -1)
    } else if (chart.length >= 3) {
      ;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
        totalVolume - chart[chart.length - 1].volume,
        chart[chart.length - 2].volume,
        ((chart[chart.length - 2].volume - chart[chart.length - 3].volume) / chart[chart.length - 3].volume) * 100,
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

  const tvl = formattedNum(totalVolumeUSD, true)

  return (
    <Layout title={title} backgroundColor={transparentize(0.8, '#445ed0')}>
      <SEO cardName={displayName} chain={displayName} tvl={tvl} nftPage />

      <AutoColumn gap="24px" style={{ paddingBottom: '24px' }}>
        <Search />
        <Panel background={true} style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '-1rem' }}>
          <TYPE.main fontWeight={400}>
            Data is currently incorrect and we are fixing it, please don't use it
          </TYPE.main>
        </Panel>
        <CheckMarks type="nfts" />
      </AutoColumn>

      <BreakpointPanels>
        <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
        <Panel style={{ height: '100%', minHeight: '347px', flex: 1, maxWidth: '100%' }}>
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

      <ListOptions>
        <ListHeader>NFT Rankings</ListHeader>
        <Filters filterOptions={tabOptions} activeLabel={selectedTab} />
      </ListOptions>

      <Panel style={{ marginTop: '6px', padding: below800 && '1rem 0 0 0 ' }}>
        <NFTCollectionList collections={collections} displayUsd={displayUsd} />
      </Panel>

    </Layout>
  )
}

export default NFTDashboard
